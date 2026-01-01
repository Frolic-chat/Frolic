<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!--
    Activity is a special chat window that only shows recent things you can respond to. It's important that they're actionable; people should look here if they want a head's-up.
-->
<template>
<collapse :initial="yohhlrf" @open="toggle.activity = false" @close="toggle.activity = true">
    <template v-slot:header>
        Recent Activity
    </template>
    <template v-slot:button>
        <div :aria-label="activityInformation" data-balloon-nofocus data-balloon-pos="down-right">
            <span class="fa-solid fa-circle-question"></span>
        </div>
    </template>
    <template v-slot:default>
        <div class="d-flex flex-row flex-wrap" style="gap: 1em">
            <user-activity v-for="member in conversation.members" :key="member" :character="getCharacterFor(member)" @close="closeUser">
            </user-activity>
        </div>
    </template>
</collapse>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';
import Vue from 'vue';

import Collapse from '../../../components/collapse.vue';
import UserActivity from './UserActivity.vue';

import core from '../../core';

import NewLogger from '../../../helpers/log';
const log = NewLogger('activity');

@Component({
    components: {
        'collapse': Collapse,
        'user-activity': UserActivity,
    }
})
export default class RecentActivity extends Vue {
    /**
     * Normally we could accept a channel, but this activity is currently so highly specific it's pointless to avoid the truth, we care only about the activity tab.
     */
    // @Prop({ required: true })
    // readonly conversation!: Conversation;

    conversation = core.conversations.activityTab;

    activityInformation = 'A general summary of recently active users';

    getCharacterFor(n: string) {
        log.debug('RecentActivity.getCharacterFor', n);
        return core.characters.get(n);
    }

    closeUser(name: string) {
        this.conversation.clearMember(name);
    }

    get yohhlrf() { return this.toggle.activity ?? false }
    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
</style>
