<template>
  <div id="note-status" :class="{active: hasReports()}">
    <div v-for="(report, index) in reports" :key="`report-${index}`" :class="`status-report ${report.type} ${(report.count > 0) ? 'active' : ''}`">
      <a :href="report.url" @click="scheduleUpdateFromClick()">
        {{report.count}} {{ report.count !== 1 ? report.title : report.title.substring(0, report.title.length - 1) }}

      </a>
    </div>
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
  url: string;
}

@Component
export default class NoteStatus extends Vue {
  reports: ReportState[] = [
    {
      type: 'message',
      title: l('notestatus.messages'),
      count: 0,
      url: 'https://www.f-list.net/messages.php'
    },
    {
      type: 'note',
      title: l('notestatus.notes'),
      count: 0,
      url: 'https://www.f-list.net/read_notes.php'
    }
  ];

  //callback?: () => void;

  @Hook('mounted')
  mounted(): void {
    this.updateCounts();

    //this.callback = () => this.updateCounts();

    EventBus.$on('note-counts-update', this.updateCounts);
  }


  @Hook('beforeDestroy')
  destroying(): void {
    if (this.updateCounts) {
      EventBus.$off('note-counts-update', this.updateCounts);
    }
  }


  scheduleUpdateFromClick(): void {
      setTimeout(
          async () => {
              try {
                  await core.siteSession.interfaces.notes.check();
              }
              catch (err) {
                  log.error('notechecker.check.error', err);
              }
          },
          1.5 * 60 * 1000
      );
      setTimeout(
          async () => {
              try {
                  await core.siteSession.interfaces.notes.check();
              }
              catch (err) {
                  log.error('notechecker.check.error', err);
              }
          },
          3   * 60 * 1000
      );
  }


  hasReports(): boolean {
    return !!_.find(this.reports, (r) => (r.count > 0));
  }


  updateCounts(): void {
    const v = core.siteSession.interfaces.notes.getCounts();

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
  color: var(--linkForcedColor);
  border: 1px solid var(--secondary);
  background-color: var(--input-bg);
  padding: 0;
  border-radius: 3px;

  &.active {
    display: block;
    margin-top: 5px;
  }

  .status-report {
    display: none;
    text-align: center;
    text-transform: uppercase;
    font-size: 10pt;
    padding: 0;

    &.active {
      display: block;
    }

    a {
      padding: 5px;
      padding-bottom: 3px;
      display: block;
    }

    a:hover {
      text-decoration: none;
      background-color: var(--secondary);
    }
  }
}
</style>
