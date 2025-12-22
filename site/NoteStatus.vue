<template>
<collapse bodyClass="d-flex flex-wrap"
    :initial="yohhlrf" @open="toggle.notes = false" @close="toggle.notes = true"
>
    <template v-slot:header>
        <span>
            {{ headerTitle }}

            <span v-for="report in reports" :key="`report-head-${report.title}`">
                <template v-if="report.count">
                    {{ report.count }}
                    <span :class="{
                            'fa-solid fa-fw fa-envelope':   report.type === 'note',
                            'fa-regular fa-fw fa-envelope': report.type === 'message',
                        }" class="mr-1" style="margin-bottom: -1px; /* I have no idea why this looks off to me. */"
                    ></span>
                </template>
            </span>
        </span>
    </template>

    <div v-for="report in reports" :key="`report-body-${report.title}`" class="note-status-report flex-grow-1">
        <a :href="report.url">
            <span class="count">
                {{ report.count }}
            </span>
            {{ `${report.count !== 1 ? report.title : report.title.substring(0, report.title.length - 1)}` }}
        </a>
    </div>
</collapse>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';
import Collapse from '../components/collapse.vue';

import core from '../chat/core';
import { EventBus } from '../chat/preview/event-bus';

interface ReportState {
    type: string;
    title: string;
    count: number;
    dismissedCount: number;
    url: string;
}

@Component({
    components: {
        collapse: Collapse,
    }
})
export default class NoteStatus extends Vue {
headerTitle = 'Notes & Site Messages';

reports: ReportState[] = [
    {
        type: 'message',
        title: 'Messages',
        count: 0,
        dismissedCount: 0,
        url: 'https://www.f-list.net/messages.php'
    },
    {
        type: 'note',
        title: 'Notes',
        count: 0,
        dismissedCount: 0,
        url: 'https://www.f-list.net/read_notes.php'
    }
];

callback = () => this.updateCounts();

@Hook('mounted')
mounted(): void {
    this.updateCounts();

    EventBus.$on('note-counts-update', this.callback);
}

@Hook('beforeDestroy')
destroying(): void {
    EventBus.$off('note-counts-update', this.callback);
}

hasReports(): boolean {
    return !!this.reports.find(r => r.count > 0);
}

/**
 * Is this jank because of typing? Or are these runtime checks necesssary?
 */
updateCounts(): void {
    const latest = core.siteSession.interfaces.noteChecker.getCounts();

    const mapper: Record<'message' | 'note', Partial<keyof typeof latest>> = {
        message: 'unreadMessages',
        note: 'unreadNotes',
    };

    Object.entries(mapper).forEach(([k, v]) => {
        const report = this.reports.find(r => r.type === k);
        if (!report)
            return;

        report.count = latest[v];
    });
  }

    get yohhlrf() { return this.toggle.activity ?? false }
    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
.note-status-report {
    text-align: center;
    text-transform: uppercase;

    a {
        padding: 5px;
        padding-bottom: 3px;
        display: block;
    }

    a:hover {
        text-decoration: none;
        background-color: var(--secondary);
    }

    .count {
        font-size: 30pt;
        display: block;
        line-height: 80%;
        padding: 0;
        margin:  0;
    }
}
</style>
