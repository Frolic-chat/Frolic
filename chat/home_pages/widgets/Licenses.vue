<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
    Activity is a special chat window that only shows recent things you can respond to. It's important that they're actionable; people should look here if they want a head's-up.
-->
<template>
<collapse ref="licenseCollapse" :bodyClass="bodyClass" :initial="yohhlrf" @open="toggle.licenses = false" @close="toggle.licenses = true">
    <template v-slot:header>
        Applicable Licenses
    </template>
    <template v-slot:default>
        <div style="user-select:text;">
            <p class="card-text">Frolic! Copyright <span class="fa-regular fa-copyright" style="position:relative; bottom:-1px;"></span> 2025 <a style="text-primary" href="https://github.com/FireUnderTheMountain">Fire Under the Mountain</a></p>
            <p class="card-text">Frolic is free software; you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.</p>
            <p class="card-text">Frolic is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.</p>
            <p class="card-text">You should have received a copy of the GNU Affero General Public License along with this program; if not, see https://www.gnu.org/licenses.</p>
            <p class="card-text">All of the following licenses apply in some way to Frolic. <i>These licenses come into play when you distribute copies of Frolic, not simply by using the app.</i> If you're confused about how you may use Frolic's code, open a new issue on the source code repository (linked below) with your questions.</p>
        </div>
        <div v-if="licenseFiles.length" class="btn-group-vertical mx-auto my-2" role="group" aria-label="license information">
            <button v-for="f in licenseFiles" :key="f" class="btn btn-primary" @click="loadLicense(f)">
                {{ f }}
            </button>
        </div>
        <div v-else>No licenses found with the files (uh oh!), but that doesn't mean you won't be bound by them if you choose to distribute copies or modifiations. Maybe look for them in the app installation folder?</div>
        <a class="btn btn-outline-primary mx-auto my-2" href="https://github.com/Frolic-chat/Frolic">
            Frolic Source Code Repository
            <span class="fa-solid fa-up-right-from-square ml-2"></span>
        </a>

        <!-- file view -->
        <modal ref="licenseView" :action="loadedLicense.name" dialogClass="w-100" :buttons="false">
            <div v-if="loading_a_license" class="text-center text-info">Loading license text...</div>
            <div v-if="!loading_a_license && loadedLicense.body" class="d-flex">
                <pre class="m-auto preformatted-shrink-wrap">{{ loadedLicense.body }}</pre>
            </div>
            <div v-if="!loading_a_license && !loadedLicense.body">
                The license text wasn't retrievable. Try again or visit your installation directory to view applicable licenses.
            </div>
        </modal>
    </template>
</collapse>
</template>

<script lang="ts">
import { Component, Prop, Hook } from '@frolic/vue-ts';
import Vue from 'vue';

import Collapse from '../../../components/collapse.vue';
import Modal from '../../../components/Modal.vue';

import core from '../../core';
import * as Electron from 'electron';

import NewLogger from '../../../helpers/log';
const log = NewLogger('home');

@Component({
    components: {
        'collapse': Collapse,
        'modal': Modal,
    }
})
export default class Licenses extends Vue {
    @Prop({ default: undefined })
    readonly bodyClass?: string;

    @Hook('mounted')
    onMount() {
        setImmediate(async () => {
            try {
                this.licenseFiles = await Electron.ipcRenderer.invoke('get-license-files');
            }
            catch {}
        });
    }

    licenseFiles: string[] = [];
    loading_a_license = false;

    loadedLicense: { name: string, body: string } = {
        name: '',
        body: '',
    };

    async loadLicense(f: string) {
        if (this.loadedLicense.name === f) { // :)
            (this.$refs['licenseView'] as Modal).show();
            return;
        }

        this.loading_a_license = true;
        this.loadedLicense = { name: '', body: '' };

        (this.$refs['licenseView'] as Modal).show();

        try {
            this.loadedLicense.body = await Electron.ipcRenderer.invoke('get-text-for-license', f);
            this.loadedLicense.name = f;

            (this.$refs['licenseView'] as Modal).scrollToTop();
        }
        catch (e) {
            log.warn('Failed to load license text.', e);
            /* Don't show anything. */
        }
        finally {
            this.loading_a_license = false;
        }
    }

    /**
     * Pass it on; useful for any collapse wrappers
     */
    open() {
        (this.$refs['licenseCollapse'] as Collapse).open();
    }

    get yohhlrf() { return this.toggle.licenses ?? true }
    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
.preformatted-shrink-wrap {
    color:inherit; /* Claaaaassic bootstrap! HaHaHa! */

    display:inline-block;

    white-space: pre-wrap;
    user-select:text;
}
</style>
