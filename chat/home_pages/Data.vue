<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page>
    <template v-slot:prescroll>
        <div class="d-flex justify-content-between">
            <slot class="mr-auto align-self-center" name="title"></slot>
            <slot class="ml-auto align-self-center" name="title-end"></slot>
        </div>
    </template>

    <template v-slot:default>
        <div class="d-flex flex-column flex-nowrap">
            <slot name="before-body"></slot>
            <template v-if="conversation && !isHome">
                <div class="row">
                    <div class="col-auto">Conversation key:</div>
                    <div class="col">{{ conversation.key }}</div>
                </div>
                <div class="row">
                    <div class="col-auto">Logging:</div>
                    <div class="col">{{ isLogging }}</div>
                </div>
                <div v-if="conversation.infoText" class="row">
                    <div class="col-auto">Info text:</div>
                    <div class="col">{{ conversation.infoText }}</div>
                </div>
                <div v-if="conversation.errorText" class="row">
                    <div class="col-auto">Error text:</div>
                    <div class="col">{{ conversation.errorText }}</div>
                </div>
                <div v-if="conversation.reportMessages" class="row">
                    <div class="col-auto">Messages counted:</div>
                    <div class="col">{{ conversation.reportMessages.length }}</div>
                </div>
                <template v-if="isChannel">
                    <div class="row">
                        <div class="col-auto">Level:</div>
                        <div class="col">Are you op?</div>
                    </div>
                    <div class="row">
                        <div class="col-auto">Chat modes:</div>
                        <div class="col">Ads/Chat/Both?</div>
                    </div>
                </template>
                <div class="row form-group">
                    <div class="col-auto">Custom styling:</div>
                    <textarea class="form-control" style="min-height: 3em;" placeholder="Placeholder: Inactive + Ineffective"></textarea>
                </div>
            </template>

            <!-- License -->
            <div v-if="isHome" id="frolic-licenses" class="card modal-content d-flex flex-column">
                <div class="card-header modal-header">
                    Applicable Licenses
                </div>
                <div class="card-body modal-body d-flex flex-column" style="user-select:text;">
                    <!-- <h5 class="card-title">
                        These licenses apply if you <i>distribute</i> copies or modifications of Frolic!
                    </h5> -->
                    <p class="card-text">Frolic! Copyright <span class="fa-regular fa-copyright" style="position:relative; bottom:-1px;"></span> 2025 <a style="text-primary" href="https://github.com/FireUnderTheMountain">Fire Under the Mountain</a></p>
                    <p class="card-text">Frolic is free software; you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.</p>
                    <p class="card-text">Frolic is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.</p>
                    <p class="card-text">You should have received a copy of the GNU Affero General Public License along with this program; if not, see https://www.gnu.org/licenses.</p>
                    <div v-if="licenseFiles.length" class="btn-group-vertical mx-auto my-2" role="group" aria-label="license information">
                        <button v-for="f in licenseFiles" :key="f" class="btn btn-primary" @click="loadLicense(f)">
                            {{ f }}
                        </button>
                    </div>
                    <div v-else>No licenses found with the files (uh oh!), but that doesn't mean you won't be bound by them if you choose to distribute copies or modifiations. Maybe look for them in the app installation folder?</div>
                    <a class="btn btn-outline-primary mx-auto my-2" href="https://github.com/Frolic-chat/Frolic">Frolic Source Code Repository<span class="fa-solid fa-up-right-from-square ml-2"></span></a>
                </div>

                <!-- file view -->
                <modal ref="licenseView" :action="loadedLicense.name" dialogClass="w-100" :buttons="false">
                    <div v-if="loading_a_license">Loading license text...</div>
                    <div v-if="!loading_a_license && loadedLicense.body" class="d-flex">
                        <pre class="m-auto preformatted-shrink-wrap">{{ loadedLicense.body }}</pre>
                    </div>
                    <div v-if="!loading_a_license && !loadedLicense.body">
                        The license text wasn't retrievable. Try again or visit your installation directory directly.
                    </div>
                </modal>
            </div>
        </div>
        <slot name="after-body"></slot>
    </template>

    <template v-slot:postscroll>
        <div class="d-flex flex-wrap-reverse justify-content-between align-items-end small border-top">
        </div>
    </template>
</page>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';

import Modal from '../../components/Modal.vue';

import { ipcRenderer } from 'electron';
import core from '../core';
import { Conversation } from '../interfaces';

import NewLogger from '../../helpers/log';
const log = NewLogger('home-data');

@Component({
    components: {
        page: HomePageLayout,
        modal: Modal,
    },
})
export default class Data extends Vue {

    /**
     * Conversations
     */

    @Prop({ required: false })
    conversation: Conversation | undefined;

    convoIsPrivate  = Conversation.isPrivate;
    convoIsChannel  = Conversation.isChannel;
    convoIsActivity = Conversation.isActivity;
    convoIsConsole  = Conversation.isConsole;

    get isPrivate() { return this.conversation && this.convoIsPrivate(this.conversation) }
    get isChannel() { return this.conversation && this.convoIsChannel(this.conversation) }
    get isHome() {
        return this.conversation && (this.convoIsActivity(this.conversation) || this.convoIsConsole(this.conversation));
    }

    get isLogging() {
        if (this.isPrivate)      return core.state.settings.logMessages;
        else if (this.isChannel) return core.state.settings.logChannels;
    }

    /**
     * Licenses
     */

     @Hook('mounted')
     onMount() {
        setImmediate(async () => {
            try {
                this.licenseFiles = await ipcRenderer.invoke('get-license-files');
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

        try {
            this.loadedLicense.body = await ipcRenderer.invoke('get-text-for-license', f);
            this.loadedLicense.name = f;

            (this.$refs['licenseView'] as Modal).show();
        }
        catch (e) {
            log.warn('Failed to load license text.', e);
            /* Don't show anything. */
        }
        finally {
            this.loading_a_license = false;
        }
    }
}
</script>

<style>
.preformatted-shrink-wrap {
    color:inherit; /* Claaaaassic bootstrap! HaHaHa! */

    display:inline-block;

    white-space: pre-wrap;
    user-select:text;
}
</style>
