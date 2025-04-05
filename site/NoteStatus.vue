<template>
  <div id="note-status" class="input-group" :class="{active: hasReports()}">
    <a
      :class="{'disabled': checkpending}"
      class="input-group-prepend"
      @click.prevent="animateUpdateSpinner(); scheduleUpdateNow(); scheduleUpdateLater()"
      href="#"
    >
      <div class="input-group-text">
        <span :class="{'fa-spin': spinning }" class="fas fa-sync-alt"></span>
      </div>
    </a>
    <a v-for="(report, index) in reports"
      :key="`report-${index}`"
      class="form-control"
      :class="`status-report report-${report.type} ${(report.count > 0) ? 'active' : ''}`"
      :href="report.url"
      @click="scheduleUpdateLater()"
    >
      <span style="margin-left: auto; margin-right: auto;">
        {{report.count}} <span :class="report.class" class="fa fa-fw"></span>
      </span>
    </a>
  </div>
</template>

<script lang="ts">
import _ from 'lodash';
import log from 'electron-log';
import l from '../chat/localize';
import { Component, Hook } from '@f-list/vue-ts';
import Vue from 'vue';
import core from '../chat/core';
import { EventBus } from '../chat/preview/event-bus';

interface ReportState {
  type: string;
  title: string;
  count: number;
  class: string;
  url: string;
}

@Component
export default class NoteStatus extends Vue {
  spinning: boolean = false;

  animateUpdateSpinner(): void {
    this.spinning = true;
    setTimeout(
      () => {
        this.spinning = false;
      },
      2 * 1000
    )
  }

  reports: ReportState[] = [
    {
      type: 'message',
      title: l('notestatus.messages'),
      count: 0,
      class: 'fa-rss-square',
      url: 'https://www.f-list.net/messages.php'
    },
    {
      type: 'note',
      title: l('notestatus.notes'),
      count: 0,
      class: 'fa-envelope',
      url: 'https://www.f-list.net/read_notes.php'
    }
  ];

  @Hook('mounted')
  mounted(): void {
    this.updateCounts();

    EventBus.$on('note-counts-update', this.updateCounts);
  }

  @Hook('beforeDestroy')
  destroying(): void {
    if (this.updateCounts) {
      EventBus.$off('note-counts-update', this.updateCounts);
    }
  }

  checkpending: boolean = false;
  now:       NodeJS.Timeout | null = null;
  later:     NodeJS.Timeout | null = null;
  muchLater: NodeJS.Timeout | null = null;

  anyPendingUpdateChecks(): boolean {
    return this.now       !== null
        || this.later     !== null
        || this.muchLater !== null;
  }

  scheduleUpdateNow(): void {
    if (this.anyPendingUpdateChecks()) {
      log.debug('notechecker.schedule.now.canceled.pending');
      return;
    }

    log.debug('notechecker.schedule.now');

    this.now = setTimeout(
      async () => {
        this.now = null;
        try {
          await core.siteSession.interfaces.notes.check();
        }
        catch (err) {
          log.error('notechecker.schedule.now.error', err);
        }
      },
      1 * 1000 // 1 second
    );
  }

  scheduleUpdateLater(): void {
    if (this.anyPendingUpdateChecks()) {
      log.debug('notechecker.schedule.later.canceled.pending');
      return;
    }

    log.debug('notechecker.schedule.later');

    this.checkpending = true;
    this.later = setTimeout(
      async () => {
        this.later = null;
        try {
          await core.siteSession.interfaces.notes.check();
        }
        catch (err) {
          log.error('notechecker.schedule.later.error', err);
        }
      },
      1.6 * 60 * 1000 // 90 seconds wasn't returning update
    );
    this.muchLater = setTimeout(
      async () => {
        this.muchLater = null;
        try {
          await core.siteSession.interfaces.notes.check();
        }
        catch (err) {
          log.error('notechecker.schedule.muchlater.error', err);
        }
      },
      4 * 60 * 1000 // 4 minutes
    );
  }

  hasReports(): boolean {
    return !!_.find(this.reports, (r) => (r.count > 0));
  }

  //updateTimeout: NodeJS.Timeout | null = null;
  updateTimeout: ReturnType<typeof setTimeout> | null = null;
  updateCounts(): void {
    const v = core.siteSession.interfaces.notes.getCounts();

    this.checkpending = true;

    // This runs when an update check resolves.
    // So set a 1m timer to undarken the button.
    // But after that 1m if there's another check incoming, don't undarken the button.
    // Since the check is already in queue,
    // it will trigger updateCounts() and start another 1m timer.
    if (this.updateTimeout)
      clearTimeout(this.updateTimeout);

    this.updateTimeout = setTimeout(
      () => {
        log.debug('notechecker.updatetimeout.resolving');

        if (!this.anyPendingUpdateChecks())
          this.checkpending = false;
          // Don't need to restart because the next updateCounts() will restart if necessary.

        this.updateTimeout = null;
      },
      1 * 60 * 1000 // 1 minute
    )

    const mapper = {
      message: 'unreadMessages',
      note: 'unreadNotes'
    };

    _.each(
      mapper,
      (field, type) => {
        const report = _.find(this.reports, (r) => r.type === type);

        if (!report) {
          throw new Error(`Did not find report ${type}`);
        }

        const count = (v as any)[field] as number;

        report.count = count;
      }
    );
  }
}
</script>

<style lang="scss">

#note-status {
  display: none;

  &.active {
    display: flex;
    margin-top: 5px;
  }

  .status-report {
    display: none;
    text-align: center;
    letter-spacing: 0.2em;

    &.active {
      display: flex;
    }

    .fa-sync-alt {
      &.fa-spin {
        --fa-animation-iteration-count: 1;
      }
    }

    span.fa.fa-fw {
      color: inherit;
      line-height: inherit;
    }
  }

  a {
    &.disabled {
      cursor: not-allowed;
      pointer-events: none;
      &:hover { background-color: inherit; }

      .fa-sync-alt:not(.fa-spin) {
        opacity: 0.31;
      }
    }
  }

  a:hover, a:hover > div.input-group-text {
    text-decoration: none;
    background-color: var(--secondary);
  }
}
</style>
