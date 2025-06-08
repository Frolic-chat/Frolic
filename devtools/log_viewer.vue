<!--
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
<template>
<div id="body">
    <div>Levels: {{ levels.join(', ') }}.</div>
    <hr />
    <div class="row" v-for="level, scope in scopes" :key="scope">
        <input type="range" v-model="scopes[scope]" :min="0" :max="5" @input="updateLogLevel(scope, level)"  />
        <div style="flex-grow: 1; margin-left: 13px">{{ levels[level] }}</div>
        <div style="min-width: 33%">{{ scope }}</div>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';

import Logger from 'electron-log/renderer';

@Component
export default class LogViewer extends Vue {
levels: string[] = Logger.levels;
scopes: Record<string, number> = { 'CharacterSearch': 0, 'Chat': 0, 'event-bus': 0, 'chat': 0, 'Index': 0, 'blocker': 0, 'cache-manager': 0, 'matcher': 0, 'UserListSorter': 0, 'WordDefinition': 0, 'note-checker': 0, 'site-session': 0 };
desc: string[] = [];
logs: { [key: string]: number } = {};

@Hook('created')
created() {}

updateLogLevel(_scope: string, _level: number) {}
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
