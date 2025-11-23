<template>
<collapse bodyClass="d-flex flex-column user-select-auto" :state="collapsed" @open="collapsed = false" @close="collapsed = true">
    <template v-slot:header>
        {{ headerText }}
    </template>

    <template v-slot:button>
        <span :class="buttonClasses"></span>
    </template>

    <template v-slot:default>
        <template v-if="hasUpdate">
            {{ update.latest ? update.latest.changelog : '' }}
        </template>
        <template v-else-if="unknownVersion">
            <div class="border-inline-warning rounded-lg p-3 my-4" style="margin-top: 10px">
                <p>You are using Frolic version {{ update.current.version }}. An update could not be found.</p>
                <p>This is not a problem if you are using a beta or testing release.</p>
                <p>Additionally, this may occur if you couldn't connect to the update server. (Is github down?)</p>
            </div>
        </template>
        <template v-else>
            <p>You're up-to-date.</p>
            {{ update.current.changelog }}
        </template>
    </template>
</collapse>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@f-list/vue-ts';

import Collapse from '../../../components/collapse.vue';

import * as Electron from 'electron';

import NewLogger from '../../../helpers/log';
const logU = NewLogger('updater');

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

    @Hook('mounted')
    mounted() {
        Electron.ipcRenderer.on('update-available', (_e, u) => {
            logU.debug('checkForUpdates', u);

            if (u && u.current && u.updateCount) { // probably approximately good enough maybe
                this.update = u;
                if (this.update.latest) this.collapsed = false;
                else                    this.collapsed = true;
            }
        });

        setImmediate(() => this.getUpdate());
    }

    async getUpdate(): Promise<void> {
        const u = await Electron.ipcRenderer.invoke('get-release-info');
        logU.debug('getUpdate', u);

        if (u && u.current && u.updateCount) { // probably approximately good enough maybe
            this.update = u;
            if (this.update.latest) this.collapsed = false;
            else                    this.collapsed = true;
        }
    }

    /**
     * Visuals
     */

     collapsed = false;
    /**
     * Electron main will infrequently run the update check, which calls `PrimaryWindow?.webContents.send('update-available', true);` - but this component may not be loaded even in those circumstances.
     * However, the update check does register this signal to get the current version as an object:
     * ipcMain.handle('get-release-info', () => versions.current.version ? versions : null);
     * which gets an object that looks like this:
        // version -> changelog mapping
        const versions: {
            current:  { version: string, changelog: string },
            latest?:  { version: string, changelog: string },
            updateCount: number,
        } = {
            current: { version: '', changelog: '' },
            updateCount: 0,
        };
     *
     */
}
</script>

<style lang="scss">
.border-inline-warning {
    border-inline: 2px solid var(--warning);
}
</style>
