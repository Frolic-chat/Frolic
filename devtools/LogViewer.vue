<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="body">
    <div>Levels: {{ levels.join(', ') }}.</div>
    <hr />
    <div class="row" v-for="_, scope in scopes" :key="scope">
        <input type="checkbox" :id="`toggle-log-${scope}`" :checked="scopes[scope]" @change="updateLogging(scope, $event.target.checked)" class="col-auto" />
        <label :for="`toggle-log-${scope}`" class="col">{{ scope }}</label>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';

import core from '../chat/core';

import Logger from 'electron-log/renderer';
import { LogType } from '../electron/common';

import NewLogger from '../helpers/log';
const log = NewLogger('devtools');

// Based on common.ts types.
const loggers: ReadonlyArray<LogType> = [ 'main', 'core', 'index', 'chat', 'home', 'connection', 'websocket', 'conversation', 'settings', 'settings-minor', 'worker', 'matcher', 'rtb', 'cache', 'site-session', 'devtools', 'ads', 'filters', 'profile-helper', 'character-sheet', 'search', 'eicons', 'activity', 'collapse', 'memo', 'updater', 'scratchpad', 'logs', 'notes', 'browser', 'dictionary', 'user-menu', 'chat', 'widgets', 'bbcode', 'custom-gender', 'virtual-scroller', 'utils', ] as const;

@Component
export default class LogViewer extends Vue {
levels: string[] = Logger.levels;
scopes: Record<LogType, boolean> = loggers.reduce(
    (box, scope) => {
        box[scope] = false;

        return box;
    },
    {} as Record<LogType, boolean>
);
desc: string[] = [];
logs: { [key: string]: number } = {};

@Hook('beforeMount')
beforeMount() {
    loggers.forEach(scope => {
        const state = core.state.generalSettings.argv.includes(`--debug-${scope}`);
        this.scopes[scope] = state;

        log.silly(`LogViewer.beforeMount.${scope}.${state}`);
    });
}

updateLogging(scope: LogType, checked: boolean) {
    log.debug('LogViewer.updateLogging', { old: this.scopes[scope], new: checked });

    this.scopes[scope] = checked;

    const flag = `--debug-${scope}`;

    const index = core.state.generalSettings.argv.indexOf(flag);

    if (checked) {
        if (index < 0)
            core.state.generalSettings.argv.push(flag);
    }
    else {
        if (index > -1)
            core.state.generalSettings.argv.splice(index, 1);
    }
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
