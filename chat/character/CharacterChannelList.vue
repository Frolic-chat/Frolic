<template>
   <modal :buttons="false" ref="dialog" style="width:98%" dialogClass="">
        <template slot="title">
            {{ l('characterChannels.title') }}<user :character="character">{{character.name}}</user>
        </template>

       <div class="user-channel-list" ref="pageBody" v-if="channels.length > 0">
            <template v-for="channel in channels">
                <h3><a href="#" @click.prevent="jumpToChannel(channel)">#{{channel.name}}</a></h3>
            </template>
        </div>

        <div class="user-channel-list" ref="pageBody" v-else>
            <i><user :character="character">{{character.name}}</user>{{ l('characterChannels.none') }}</i>
        </div>

   </modal>
</template>


<script lang="ts">

import * as _ from 'lodash';
import l from '../localize';
import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
import CustomDialog from '../../components/custom_dialog';
import Modal from '../../components/Modal.vue';
import { Character } from '../../fchat/interfaces';
import core from '../core';
import { Conversation } from '../interfaces';
import UserView from '../UserView.vue';
import ChannelConversation = Conversation.ChannelConversation;

@Component({
    components: {modal: Modal, user: UserView}
})
export default class CharacterChannelList extends CustomDialog {
    l = l;

    @Prop({required: true})
    readonly character!: Character;

    channels: ChannelConversation[] = [];

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
            return;
        }

        this.channels = _.sortBy(
            _.filter(
                core.conversations.channelConversations,
                (cc: ChannelConversation) => !!cc.channel.members[this.character.name]
            ),
            'name'
        );
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
