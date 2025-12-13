<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="body">
    <div>Levels: {{ levels.join(', ') }}.</div>
    <hr />
    <div class="row" v-for="_, scope in scopes" :key="scope">
        <input type="checkbox" :value="scopes[scope]" @change="updateLogLevel(scope, $event)"  />
        <!-- <div style="flex-grow: 1; margin-left: 13px">{{ levels[level] }}</div> -->
        <div style="min-width: 33%">{{ scope }}</div>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';

import core from '../chat/core';

import Logger from 'electron-log/renderer';

@Component
export default class LogViewer extends Vue {
levels: string[] = Logger.levels;
scopes: Record<string, boolean> = {
    'CharacterSearch':  false,
    'Chat':             false,
    'event-bus':        false,
    'chat':             false,
    'Index':            false,
    'blocker':          false,
    'cache-manager':    false,
    'matcher':          false,
    'UserListSorter':   false,
    'WordDefinition':   false,
    'note-checker':     false,
    'site-session':     false,
};
desc: string[] = [];
logs: { [key: string]: number } = {};

@Hook('created')
created() {
    Object.keys(this.scopes).forEach(k => {
        this.scopes[k] = core.state.generalSettings.argv.includes(`--debug-${k}`);
    });
}

updateLogLevel(_scope: string, _e: Event) {
    // const value = e.target.value
}
}
</script>

<style lang="css">
#body {
    display: flex;
    flex-direction: column;

    .row {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items:     flex-start;
        justify-content: space-around;
    }
}
</style>
