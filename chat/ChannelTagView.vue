<template>
    <a href="#" @click.prevent="joinChannel()" :disabled="channel && channel.isJoined">
        <span class="fa fa-hashtag"></span>
        <template v-if="channel">{{channel.name}}<span class="bbcode-pseudo"> ({{channel.memberCount}})</span></template>
        <template v-else>{{text}}</template>
    </a>
</template>

<script lang="ts">
    import { Vue, Component, Prop } from 'vue-facing-decorator';
    import core from './core';
    import {Channel} from './interfaces';

    @Component
    export default class ChannelView extends Vue {
        @Prop({required: true})
        readonly id!: string;
        @Prop({required: true})
        readonly text!: string;

        //@Hook('mounted')
        mounted(): void {
            core.channels.requestChannelsIfNeeded(300000);
        }

        joinChannel(): void {
            if (!this.channel?.isJoined) core.channels.join(this.id);

            const channel = core.conversations.byKey(`#${this.id}`);

            if (channel) channel.show();
        }

        get channel(): Channel.ListItem | undefined {
            return core.channels.getChannelItem(this.id);
        }
    }
</script>
