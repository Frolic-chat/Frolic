<template>
<!-- :action="getUpdate" -->
<collapse bodyClass="d-flex flex-column"
    :initial="yohhlrf" @open="toggle.news = false" @close="toggle.news = true"
>
    <template v-slot:header>
        {{ headerText }}
    </template>

    <template v-slot:button>
        <span :class="buttonClasses"></span>
    </template>

    <template v-slot:default>
        <div v-if="hasUpdate" v-html="sanitizedChangelog" style="user-select:text"></div>
        <div v-else-if="unknownVersion" class="border-inline-warning rounded-lg p-3">
            <p>You are using Frolic version <span class="text-info">{{ update.current.version }}</span>. An update could not be found.</p>
            <p>This is not a problem if you are using a beta or testing release.</p>
            <p>Additionally, this may occur if you couldn't connect to the update server. (Is github down?)</p>
        </div>
        <template v-else>
            <p>You're using the latest version.</p>
            <div v-html="sanitizedChangelog" style="user-select:text"></div>
        </template>
    </template>
</collapse>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Watch } from '@f-list/vue-ts';

import Collapse from '../../../components/collapse.vue';

import * as Electron from 'electron';
import core from '../../core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

import NewLogger from '../../../helpers/log';
const logU = NewLogger('updater');
const logC = NewLogger('collapse');

interface VersionInfo {
    version:   string;
    changelog: string;
}

interface CurrentVersionInfo extends VersionInfo {
    known: boolean;
}

interface UpdateState {
    current:     CurrentVersionInfo;
    latest?:     VersionInfo; // Absent when already using most recent
    updateCount: number;
}

@Component({
    components: {
        'collapse': Collapse,
    },
})
export default class NewsWidget extends Vue {
    update: UpdateState = { // Mirror of main-side default
        current: { version: '', changelog: '', known: false },
        updateCount: 0,
    }

    get hasUpdate()      { return !!this.update.latest       };
    get unknownVersion() { return !this.update.current.known };

    get headerText() {
        if      (this.hasUpdate)      return 'Update Available!';
        else if (this.unknownVersion) return 'Unknown Version';
        else                          return 'Using Latest Release';
    }
    get buttonClasses() {
        if      (this.hasUpdate)      return 'text-warning fa-solid   fa-cloud-sun';
        else if (this.unknownVersion) return 'text-danger  fa-solid   fa-cloud-sun-rain';
        else                          return 'text-success fa-regular fa-sun';
    }

    /**
     * This will need to be moved into the main app (to run before login) in order to be useful on first run.
     */
    @Hook('created')
    created() {
        Electron.ipcRenderer.on('update-available', this.handleUpdate);

        setImmediate(() => this.getUpdate());
        logC.debug('NewsWidget.created', { runtimeToggle: this.toggle.news });
    }

    @Hook('beforeDestroy')
    beforeDestroy() {
        Electron.ipcRenderer.off('update-available', this.handleUpdate);
    }

    handleUpdate = (_e: Electron.IpcRendererEvent, u: boolean): void => {
        logU.debug('checkForUpdates', u);
        this.getUpdate();
    }

    async getUpdate(): Promise<void> {
        const u = await Electron.ipcRenderer.invoke('get-release-info');
        logU.debug('getUpdate', u);

        if (u && 'current' in u && 'updateCount' in u) {
            this.update = u;

            if (this.toggle.news === undefined) {
                logU.debug('getUpdate.goodUpdate', { latest: u.latest?.version, known: u.current.known });
                this.toggle.news = !u.current.known || !u.latest;
            }
        }
    }

    @Watch('hasUpdate')
    emitUpdate() {
        this.$emit('update', this.hasUpdate);
    }

    /**
     * Visuals
     */
    get yohhlrf() { return this.toggle.news ?? !!this.update.latest }

    get sanitizedChangelog() {
        const raw = this.update.latest?.changelog ?? this.update.current.changelog;
        const html = marked(raw, { async: false });
        return DOMPurify.sanitize(html);
    }

    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
.border-inline-warning {
    border-inline: 2px solid var(--warning);
}
</style>
