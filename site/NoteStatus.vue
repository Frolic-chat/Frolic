<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse bodyClass="d-flex flex-wrap"
    :initial="yohhlrf" @open="toggle.notes = false" @close="toggle.notes = true" :action="onClickRefresh"
>
    <template v-slot:header>
        <span>
            {{ headerTitle }}

            <span v-for="report in reports" :key="`report-head-${report.title}`">
                <template v-if="report.count">
                    {{ report.count }}
                    <span :class="{
                            'fa-solid   fa-fw fa-envelope': report.type === 'note',
                            'fa-regular fa-fw fa-envelope': report.type === 'message',
                        }" class="mr-1" style="margin-bottom: -1px; /* I have no idea why this looks off to me. */"
                    ></span>
                </template>
            </span>
            <div v-if="latestNote && latestSender && latestReceiver">
                <!-- :immediate="true" :showStatus="true" :bookmark="true" -->
                <span class="text-muted">Latest unread:</span> <user :character="latestSender" immediate showStatus bookmark></user> => <user :character="latestReceiver" immediate></user>, <i>{{ latestNote.datetime_sent }}</i>
            </div>
        </span>
    </template>

    <template v-slot:button>
        <span class="fa-solid fa-arrows-rotate"></span>
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
import UserView from '../chat/UserView.vue';

import core from '../chat/core';
import { EventBus } from '../chat/preview/event-bus';
import type { TempNoteFormat } from './notes-api';

interface ReportState {
    type: 'message' | 'note';
    title: 'Messages' | 'Notes';
    count: number;
    url: string;
}

@Component({
    components: {
        collapse: Collapse,
        user: UserView,
    }
})
export default class NoteStatus extends Vue {
headerTitle = 'Notes & Site Messages';

latestNote?: TempNoteFormat;

get latestSender() {
    return this.latestNote?.source_name
        ? core.characters.get(this.latestNote.source_name)
        : undefined;
}

get latestReceiver() {
    return this.latestNote?.dest_name
        ? core.characters.get(this.latestNote.dest_name)
        : undefined;
}

reports: ReportState[] = [
    {
        type: 'message',
        title: 'Messages',
        count: 0,
        url: 'https://www.f-list.net/messages.php'
    },
    {
        type: 'note',
        title: 'Notes',
        count: 0,
        url: 'https://www.f-list.net/read_notes.php'
    }
];

onEvent = () => this.getNotesAndMessages();

@Hook('created')
created(): void {
    this.getNotesAndMessages();

    EventBus.$on('note-counts-update', this.onEvent);
    EventBus.$on('notes-api',          this.onEvent);
}

@Hook('beforeDestroy')
beforeDestroy(): void {
    EventBus.$off('note-counts-update', this.onEvent);
    EventBus.$off('notes-api',          this.onEvent);
}

hasReports(): boolean {
    return this.reports.some(r => r.count > 0);
}

getNotesAndMessages() {
    const latestMessages = core.siteSession.interfaces.noteChecker.getCounts().unreadMessages;
    const latestNotes    = core.siteSession.interfaces.notes.getUnread();

    const m = this.reports.find(report => report.type === 'message');
    if (m)
        m.count = latestMessages;

    const n = this.reports.find(report => report.type === 'note');
    if (n)
        n.count = latestNotes.total ?? 0;

    this.latestNote = latestNotes.notes.find(n => n.dest_name === core.characters.ownCharacter.name);
}

async onClickRefresh() {
    const latestNotes = await core.siteSession.interfaces.notes.getUnreadAsync();

    const n = this.reports.find(report => report.type === 'note');
    if (n)
        n.count = latestNotes.total ?? 0;

    this.latestNote = latestNotes.notes.find(n => n.dest_name === core.characters.ownCharacter.name);
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
