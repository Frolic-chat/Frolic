<template>
<modal ref="dialog" :buttons="false" style="width:98%" dialogClass="ads-dialog" @open="onOpen" @close="onClose">
  <template slot="title">
    {{ l('characterAds.title') }}<user :character="character">{{ character.name }}</user>
  </template>

  <div v-if="messages.length > 0" ref="pageBody" class="row ad-viewer">
    <template v-for="message in messages">
      <h3>#{{ message.channelName }} <span class="message-time">{{ formatTime(message.datePosted) }}</span></h3>
      <div class="border-bottom">
        <bbcode :text="message.message"></bbcode>
      </div>
    </template>
  </div>

  <div v-else ref="pageBody" class="row ad-viewer">
    <i><user :character="character">{{ character.name }}</user>{{ l('characterAds.none') }}</i>
  </div>
</modal>
</template>


<script lang="ts">
import l from '../localize';
import { Component, Hook, Prop, Watch } from '@frolic/vue-ts';
import CustomDialog from '../../components/custom_dialog';
import Modal from '../../components/Modal.vue';
import type { Character } from '../../fchat/interfaces';
import type { AdCachedPosting } from '../../learn/ad-cache';
import core from '../core';
import { formatTime } from '../common';
import UserView from '../UserView.vue';
import { BBCodeView } from '../../bbcode/view';

@Component({
    components: { modal: Modal, user: UserView, bbcode: BBCodeView(core.bbCodeParser) },
})
export default class CharacterAdView extends CustomDialog {
    l = l;

    @Prop({ required: true })
    readonly character!: Character;

    messages: AdCachedPosting[] = [];
    formatTime = formatTime;

    @Watch('character')
    onNameUpdate(): void {
        this.update();
    }


    @Hook('mounted')
    onMounted(): void {
        this.update();
    }


    update(): void {
        if (!this.character) {
            this.messages = [];
            return;
        }

        const cache = core.cache.adCache.getSync(this.character.name);

        this.messages = cache
            ? cache.posts.slice(-10).reverse()
            : [];
    }


    onOpen(): void {
        // empty
        return;
    }


    onClose(): void {
        // empty
        return;
    }
}
</script>
