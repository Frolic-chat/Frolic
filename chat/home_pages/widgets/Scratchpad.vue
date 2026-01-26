<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <collapse :initial="yohhlrf" @open="toggle.scratchpad = false" @close="toggle.scratchpad = true" bodyClass="p-0">
        <template v-slot:header>
            {{ headerText }}
        </template>

        <textarea id="scratchpad" class="form-control" v-model="scratchpad" :placeholder="placeholder"></textarea>
    </collapse>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Watch } from '@frolic/vue-ts';

import Collapse from '../../../components/collapse.vue';
import type { ScratchpadUpdate } from '../../../electron/main/scratchpad';

import * as Electron from 'electron';
import core from '../../core';
import { debounce } from '../../../helpers/utils';

import NewLogger from '../../../helpers/log';
const log = NewLogger('scratchpad');

function updateMain(channel: 'scratchpad', scratchpad: string, timestamp: number): void {
    log.debug('Scratchpad.updateMain', { timestamp, scratchpad });

    if (channel === 'scratchpad') {
        Electron.ipcRenderer.send(channel, {
            scratchpad,
            timestamp,
            character:  core.connection.character,
        });
    }
}

@Component({
    components: {
        collapse: Collapse,
    }
})
export default class Scratchpad extends Vue {
    headerText = 'Scratchpad';
    scratchpad = '';
    timestamp = 0;
    skipWatch = false;
    placeholder = "Scratchpad is a note-taking space shared across all your characters.";

    @Hook('created')
    async created() {
        Electron.ipcRenderer.on('scratchpad', this.handleUpdate);

        const { scratchpad, timestamp } = await Electron.ipcRenderer.invoke('scratchpad-initial') as ScratchpadUpdate;
        this.scratchpad = scratchpad;
        this.timestamp  = timestamp;

        this.skipWatch = true;

        log.debug('Scratchpad.created', { timestamp, scratchpad });
    }

    @Hook('beforeDestroy')
    beforeDestroy() {
        log.debug('Scratchpad.beforeDestroy', { timestamp: this.timestamp, scratchpad: this.scratchpad });

        Electron.ipcRenderer.off('scratchpad', this.handleUpdate);
        this.debounceInput.cancel();
        this.sendtoMain();
    }

    debounceInput = debounce(this.sendtoMain, { wait: 340, maxWait: 7000 });

    @Watch('scratchpad')
    scratchpadChanged() {
        if (this.skipWatch)
            this.skipWatch = false;
        else
            this.debounceInput();
    }

    sendtoMain() {
        this.timestamp = Date.now();
        updateMain('scratchpad', this.scratchpad, this.timestamp);
    }

    handleUpdate = (_e: Electron.IpcRendererEvent, u: ScratchpadUpdate): void => {
        if (u.timestamp <= this.timestamp) {
            log.warn('Pad from main stale; skipping', {
                from:    u.character,
                to:      core.connection.character,
                current: this.timestamp,
                new:     u.timestamp,
            });

            return;
        }

        if (this.scratchpad !== u.scratchpad) {
            log.debug('Scratchpad.handleUpdate.newFromMain', { new: u.timestamp, old: this.timestamp });
            this.timestamp  = u.timestamp;
            this.scratchpad = u.scratchpad;

            this.skipWatch = true;
        }
    }

    /**
     * Visual
     */

    get yohhlrf() { return this.toggle.scratchpad ?? !!this.scratchpad }
    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
#scratchpad {
    width: 100%;
    max-height: calc(1.5em * 10);

    field-sizing: content;
    resize: none;

    border-top-left-radius:  0;
    border-top-right-radius: 0;
}
</style>
