<template>
    <div>
        <button @click="getNotes">Fetch Notes</button>
        <button v-for="noteId in getNotes" :key="noteId" @click="readNote(noteId)">
            Read Note {{ noteId }}
        </button>
        <ul>
            <li v-for="noteId in getNotes" :key="noteId">
                Note ID: {{ noteId }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';

import { EventBus } from '../../chat/preview/event-bus';
import { Commands } from './interfaces';
//import { SiteSession } from '../site-session';
import { NotesAPI } from './notes';
import core from '../../chat/core';

import ElectronLog from 'electron-log';
const log = ElectronLog.scope('notes-page');

@Component
export default class NoteDisplay extends Vue {
api: NotesAPI;

@Hook('beforeCreate')
beforeCreate() {
    this.api = core.siteSession.interfaces.notesApi;
}

@Hook('created')
created() {
    this.api.getNotes();

    EventBus.$on('notes-update', (data: { noteIds: number[] }) => {
        log.verbose('event.update', data);
    });

    EventBus.$on('note-read', (data: { content: string, noteId: number }) => {
        log.verbose('event.read', data);
    });
}

async getNotes(): Promise<void> {
    await this.api.getNotes();
}

async readNote(noteId: number): Promise<void> {
    await this.api.readSpecificNote(noteId);
}
}
</script>
