<template>
  <div id="note-status" class="input-group">
    <a
      :class="{'disabled': checkpending}"
      class="input-group-prepend"
      @click.prevent="scheduleUpdate('update')"
      href="#"
    >
      <div class="input-group-text">
        <span :class="{'fa-spin': spinning }" class="fas fa-sync-alt text-container"></span>
      </div>
    </a>
    <a v-for="(report, index) in reports"
      :key="`report-${index}`"
      class="form-control status-report"
      :class="`report-${report.type} ${(report.count <= 0) ? 'disabled' : ''}`"
      :href="report.url"
      @click="scheduleUpdate('visit')"
    >
      <span class="text-container">
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

  scheduleUpdate(source: string = 'visit'): void {
    this.animateUpdateSpinner();
    this.checkpending = true;

    if (source === 'update' && !this.anyPendingUpdateChecks()) {
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
        0.1 * 1000 // 100ms
      );
      log.debug('notechecker.schedule', { source: source, timer: this.now });
    }

    if (source === 'visit') {
      if (this.later)
        clearTimeout(this.later);

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
        2.5 * 60 * 1000 // 90 seconds wasn't returning update
      );
    }

    if (source === 'visit' || source === 'update') {
      if (this.muchLater)
        clearTimeout(this.muchLater);

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
        5 * 60 * 1000 // 5 minutes
      );

      log.debug('notechecker.schedule', { source: source, timer1: this.later, timer2: this.muchLater });
    }
  }

  // hasReports(): boolean {
  //   return !!_.find(this.reports, (r) => (r.count > 0));
  // }

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

        // Only the last update will unlock the button.
        if (!this.anyPendingUpdateChecks())
          this.checkpending = false;

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
  display: flex;
  margin-top: 5px;

  .text-container {
    margin-left: auto;
    margin-right: auto;
    transition: all 0.8s;
  }

  .status-report {
    display: flex;
    text-align: center;
    letter-spacing: 0.2em;

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
    &:hover,
    &:hover > div.input-group-text {
      text-decoration: none;
      background-color: var(--secondary);
    }

    &.disabled {
      cursor: not-allowed;
      pointer-events: none;

      &:hover { background-color: inherit; }

      .text-container:not(.fa-spin) {
        opacity: 0.31;
      }
    }
  }
}
</style>
