<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse bodyClass="d-flex flex-wrap"
    :initial="yohhlrf" @open="toggle.notes = false" @close="toggle.notes = true" :action="onClickRefresh"
>
    <template v-slot:header>
        <span>
            {{ headerTitle }}:

            <span v-if="coreStateSettings.risingShowUnreadOfflineCount"><!-- Messages -->
                {{ messages.count }}
                <span class="mr-1 fa-regular fa-fw fa-envelope" style="margin-bottom: -1px; /* I have no idea why this looks off to me. */"></span>
            </span>

            <span><!-- Notes -->
                {{ notes.count }}
                <span class="mr-1 fa-solid fa-fw fa-envelope" style="margin-bottom: -1px; /* I have no idea why this looks off to me. */"></span>
            </span>
        </span>

        <div v-if="latestUnreadForThisCharacter && latestSender && latestReceiver">
            <span class="text-muted">Latest unread:</span> <user :character="latestSender" :immediate="true" :showStatus="true" :bookmark="true"></user> => <user :character="latestReceiver" :immediate="true" :showStatus="true" :bookmark="true"></user>, <i>{{ latestUnreadForThisCharacter.datetime_sent }}</i>
        </div>
    </template>

    <template v-slot:button>
        <span class="fa-solid fa-arrows-rotate"></span>
    </template>

    <div v-if="coreStateSettings.risingShowUnreadOfflineCount" class="note-status-report flex-grow-1"><!-- Messages -->
        <a :href="messages.url">
            <span class="count">
                {{ messages.count }}
            </span>
            {{ messages.count !== 1 ? messages.title : messages.title.substring(0, messages.title.length - 1) }}
        </a>
    </div>

    <div class="note-status-report flex-grow-1"><!-- Notes -->
        <a :href="notes.url">
            <span class="count">
                {{ notes.count }}
            </span>
            {{ notes.count !== 1 ? notes.title : notes.title.substring(0, notes.title.length - 1) }}
        </a>
    </div>
</collapse>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Watch } from '@frolic/vue-ts';

import Collapse from '../components/collapse.vue';
import UserView from '../chat/UserView.vue';

import core from '../chat/core';
import EventBus from '../chat/preview/event-bus';
import type { TempNoteFormat } from './note-types';

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
coreStateSettings = core.state.settings;

headerTitle = 'Notes & Site Messages';

latestUnreadForThisCharacter?: TempNoteFormat;

get latestSender() {
    return this.latestUnreadForThisCharacter?.source_name
        ? core.characters.get(this.latestUnreadForThisCharacter.source_name)
        : undefined;
}

get latestReceiver() {
    return this.latestUnreadForThisCharacter?.dest_name
        ? core.characters.get(this.latestUnreadForThisCharacter.dest_name)
        : undefined;
}

messages: ReportState = {
    type: 'message',
    title: 'Messages',
    count: 0,
    url: 'https://www.f-list.net/messages.php'
}

notes: ReportState = {
    type: 'note',
    title: 'Notes',
    count: 0,
    url: 'https://www.f-list.net/read_notes.php'
}

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

@Watch('coreStateSettings.risingShowUnreadOfflineCount')
onMessageCountSettingChanged() {
    this.getNotesAndMessages();
}

getNotesAndMessages() {
    const latestMessages = core.siteSession.interfaces.noteChecker.getCounts().unreadMessages;
    const latestNotes    = core.siteSession.interfaces.notes.getUnread();

    this.messages.count = latestMessages;
    this.notes.count    = latestNotes.total ?? 0;

    this.latestUnreadForThisCharacter = latestNotes.notes.find(n => n.dest_name === core.characters.ownCharacter.name);
}

/**
 * Async handler for getting unread messages
 */
async onClickRefresh() {
    const latestNotes = await core.siteSession.interfaces.notes.getUnreadAsync();

    this.notes.count = latestNotes.total ?? 0;

    this.latestUnreadForThisCharacter = latestNotes.notes.find(n => n.dest_name === core.characters.ownCharacter.name);
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
