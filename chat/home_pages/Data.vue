<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page>
    <template v-slot:prescroll>
        <div class="page-header d-flex">
            <div class="mr-auto align-self-center"><slot name="title"></slot></div>
            <div class="ml-auto align-self-center flex-shrink-0"><slot name="title-end"></slot></div>
        </div>
    </template>

    <template v-slot:default>
        <slot name="before-body"></slot>

        <div class="d-flex flex-column flex-nowrap">

            <!-- Link/unlink channel? -->

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
                <licenses bodyClass="d-flex flex-column" ref="licenses"></licenses>
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
import { Component, Prop, Watch } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import Licenses from './widgets/Licenses.vue';

import core from '../core';
import { Conversation } from '../interfaces';

// import NewLogger from '../../helpers/log';
// const log = NewLogger('home');

@Component({
    components: {
        page: HomePageLayout,
        licenses: Licenses,
    },
})
export default class Data extends Vue {
    /**
     * Conversations
     */

    @Prop({ required: false })
    readonly conversation: Conversation | undefined;

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
        else                     return false;
    }


    @Prop({ default: false })
    readonly navigationRequest!: { tab: string, conversation?: any, section: any };

    @Watch('navigationRequest')
    onNavigationRequest() {
        if (!this.navigationRequest)
            return;

        if (this.navigationRequest.section === 'frolic-licenses')
            (this.$refs['licenses'] as Licenses).open();
    }
}
</script>

<style>
.page-header {
    height: 3em;
}

.preformatted-shrink-wrap {
    color:inherit; /* Claaaaassic bootstrap! HaHaHa! */

    display:inline-block;

    white-space: pre-wrap;
    user-select:text;
}
</style>
