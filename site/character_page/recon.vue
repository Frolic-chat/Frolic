<template>
    <div class="recon row">
        <div class="conversation" v-if="conversation && conversation.length > 0">
          <div class="col-sm-10" style="margin-top:5px">
            <h4>Latest Messages</h4>
            <message-view v-for="message in conversation" :key="message.id" :message="message"></message-view>
          </div>
        </div>

        <div class="row ad-viewer" v-if="ads.length > 0">
          <div class="col-sm-10" style="margin-top:5px">
            <h4>Latest Ads</h4>

            <template v-for="message in ads">
                <h3>#{{message.channelName}} <span class="message-time">{{formatTime(message.datePosted)}}</span></h3>
                <div class="border-bottom">
                    <bbcode :text="message.message"></bbcode>
                </div>
            </template>
          </div>
        </div>

        <div class="row" v-if="ads.length === 0 && conversation.length === 0">
          <div class="col-sm-10" style="margin-top:5px">
            You have not seen any ads or messages from this character.
          </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Hook, Prop } from '@f-list/vue-ts';
    import Vue from 'vue';
    import {Character} from './interfaces';
    import { Conversation } from '../../chat/interfaces';
    import core from '../../chat/core';
    import { AdCachedPosting } from '../../learn/ad-cache';
    import MessageView from '../../chat/message_view';

    import {formatTime} from '../../chat/common';
    import { lastElement } from '../../helpers/utils';

    @Component({
      components: {
        'message-view': MessageView
      }
    })
    export default class ReconView extends Vue {
      @Prop({required: true})
      readonly character!: Character;

      conversation: Conversation.Message[] = [];
      ads: AdCachedPosting[] = [];

      formatTime = formatTime;

      @Hook('mounted')
      async mounted(): Promise<void> {
          await this.load();
      }

      async load(): Promise<void> {
        this.conversation = [];
        this.ads = [];

        await Promise.all([
          this.loadAds(),
          this.loadConversation()
        ]);
      }

      async loadAds(): Promise<void> {
        const cache = core.cache.adCache.getSync(this.character.character.name);

        // Bug: This log has always been able to return fewer than five posts, even if there could be more.
        this.ads = cache
            ? [ // De-duplication via converting to LUT
              ...new Map(cache.posts.slice(-5).reverse().map(post => [post, true]))
                  .keys()
            ]
            : [];
      }

      async loadConversation(): Promise<void> {
        const ownName = core.characters.ownCharacter.name;
        const logKey = this.character.character.name.toLowerCase();
        const logDates = await core.logs.getLogDates(ownName, logKey);

        if (logDates.length === 0) {
          return;
        }

        const messages = await core.logs.getLogs(ownName, logKey, lastElement(logDates));
        const matcher = /\[AUTOMATED MESSAGE]/;

        this.conversation = messages
            .filter(m => !matcher.exec(m.text))
            .slice(-5);
      }
    }
</script>
