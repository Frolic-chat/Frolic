<template>
   <modal :buttons="false" ref="dialog" dialogClass="mw-100"><!-- style="width:98%" -->
        <template slot="title">
            <user :character="character" :reusable="true">{{character.name}}</user>{{ l('characterRelation.title') }}
        </template>

        <div ref="pageBody">
            <!-- memo view here -->
            <!--<br />-->

            <!-- shared channels view -->
            <h4 class="card-subtitle">{{ l('characterChannels.title') }}</h4>
            <div v-if="channels.length > 0" class="user-channel-list">
                <template v-for="channel in channels">
                    <a href="#" @click.prevent="jumpToChannel(channel)">#{{channel.name}}</a><br />
                </template>
            </div>
            <div v-else class="user-channel-list">
                <i>{{ l('characterChannels.none') }}</i>
            </div>

            <br />

            <!-- ads -->
            <h4 class="card-subtitle">{{ l('characterAds.title') }}</h4>
            <div v-if="messages.length > 0" class="ad-viewer">
                <template v-for="message in messages">
                    <h5>#{{message.channelName}} <span class="message-time">{{formatTime(message.datePosted)}}</span></h5>
                    <div class="border-bottom">
                        <bbcode :text="message.message"></bbcode>
                    </div>
                </template>
            </div>
            <div v-else class="ad-viewer">
                <i>{{ l('characterAds.none') }}</i>
            </div>
        </div>
   </modal>
</template>


<script lang="ts">
import l from '../localize';
import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
import CustomDialog from '../../components/custom_dialog';
import Modal from '../../components/Modal.vue';
import { Character } from '../../fchat/interfaces';
import core from '../core';
import UserView from '../UserView.vue';

import { Conversation } from '../interfaces';
import ChannelConversation = Conversation.ChannelConversation;

import { AdCachedPosting } from '../../learn/ad-cache';
import {formatTime} from '../common';
import { BBCodeView } from '../../bbcode/view';

@Component({
    components: {
        modal: Modal,
        user: UserView,
        bbcode: BBCodeView(core.bbCodeParser)
    }
})
export default class CharacterRelationView extends CustomDialog {
    l = l;
    formatTime = formatTime;

    @Prop({required: true})
    readonly character!: Character;

    channels: ChannelConversation[] = [];
    messages: AdCachedPosting[] = [];

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
            this.channels = [];
            this.messages = [];
            return;
        }

        this.channels = core.conversations.channelConversations
            .filter(cc => !!cc.channel.members[this.character.name])
            .sort((a, b) => a.name.localeCompare(b.name));

        const cache = core.cache.adCache.get(this.character.name);

        this.messages = cache
            ? cache.posts.slice(-10).reverse()
            : [];
    }

    jumpToChannel(channel: ChannelConversation): void {
        channel.show();
    }
}
</script>


<style lang="scss">
    .user-channel-list h3 {
        font-size: 120%;
    }
</style>
