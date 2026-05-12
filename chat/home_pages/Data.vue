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

    <div class="d-flex flex-column flex-nowrap" style="gap: 1em;">
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
            <div class="col-auto">Channel op level:</div>
            <div class="col">{{ channelOp }}</div>
          </div>
          <div class="row">
            <div class="col-auto">Channel message mode:</div>
            <div class="col">{{ channelMode }}</div>
          </div>
          <div class="row">
            <div class="col-auto">Next Ad:</div>
            <div class="col">{{ channelNextAd }}</div>
          </div>
          <div class="row">
            <div class="col">Ad Settings</div>
          </div>
          <div class="row">
            <div class="col">
              <pre class="preformatted-shrink-wrap">{{ channelAdSettings }}</pre>
            </div>
          </div>
          <div class="row">
            <div class="col">Ad Manager</div>
          </div>
          <div class="row">
            <div class="col">
              <pre class="preformatted-shrink-wrap">{{ channelAdManager }}</pre>
            </div>
          </div>
        </template>
        <div class="row form-group">
          <div class="col-auto">Custom styling:</div>
          <textarea class="form-control" style="min-height: 3em;" placeholder="Placeholder: Inactive + Ineffective"></textarea>
        </div>
      </template>

      <!-- License -->
      <div v-if="isHome" id="frolic-licenses" class="card modal-content d-flex flex-column">
        <licenses ref="licenses" bodyClass="d-flex flex-column"></licenses>
      </div>

      <!-- Developer assistance -->
      <dev-match-details v-if="isPrivate" :conversation="conversation"></dev-match-details>
      <dev-logging v-else-if="isHome"></dev-logging>
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
import { Component, Prop, Watch } from '@frolic/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import Licenses from './widgets/Licenses.vue';
import DeveloperLogging from './widgets/DeveloperLogging.vue';
import MatchDetailsDeveloperDisplay from './widgets/DeveloperMatchDetails.vue';

import core from '../core';
import { Conversation } from '../interfaces';

// import NewLogger from '../../helpers/log';
// const log = NewLogger('home');

@Component({
    components: {
        page: HomePageLayout,

        // Home pages:
        licenses:      Licenses,
        'dev-logging': DeveloperLogging,

        // Private Conversation:
        'dev-match-details': MatchDetailsDeveloperDisplay,
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

    /* eslint-disable @stylistic/brace-style */
    get isPrivate() { return this.conversation && this.convoIsPrivate(this.conversation); }
    get isChannel() { return this.conversation && this.convoIsChannel(this.conversation); }
    get isHome() {
        return this.conversation && (this.convoIsActivity(this.conversation) || this.convoIsConsole(this.conversation));
    } /* eslint-enable @stylistic/brace-style */

    get isLogging() { /* eslint-disable @stylistic/nonblock-statement-body-position */
        if      (this.isPrivate) return core.state.settings.logMessages;
        else if (this.isChannel) return core.state.settings.logChannels;
        else                     return false;
    } /* eslint-enable @stylistic/nonblock-statement-body-position */

    get channelOp() {
        return this.conversation && this.convoIsChannel(this.conversation) && this.conversation.channel.opList.includes(core.characters.ownCharacter.name) ? 'Channel Op' : 'Normal User';
    }
    get channelMode() {
        return this.conversation && this.convoIsChannel(this.conversation) && this.conversation.channel.mode;
    }
    get channelNextAd() {
        return this.conversation && this.convoIsChannel(this.conversation) && new Date(this.conversation.nextAd).toLocaleString();
    }
    get channelAdManager() {
        return this.conversation && this.convoIsChannel(this.conversation) && JSON.stringify(this.conversation.adManager.debugInfo(), null, 4);
    }
    get channelAdSettings() {
        return this.conversation && this.convoIsChannel(this.conversation) && JSON.stringify(this.conversation.settings.adSettings, null, 4);
    }

    @Prop({ default: false })
    readonly navigationRequest!: { tab: string, conversation?: unknown, section: unknown };

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
