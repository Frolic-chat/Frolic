<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Linebreaks inside this template will break BBCode views
     v-bind character and channel are used in UserMenu handleEvent when crawling up the DOM -->
<template>
<div :class="{
        'faded': faded,
        'border-success': character.isFriend,
        'border-primary': character.isBookmarked && !character.isFriend
    }"
    class="user-activity-card p-2 border rounded-lg"
>
    <div @click="removeUser()" class="btn-sm btn-outline-danger close-button">
        <span class="fa-solid fa-fw fa-circle-xmark"></span>
    </div>
    <!-- :id="classId" -->
    <div class="simple-column d-flex flex-column no-wrap" v-bind:bbcodeTag.prop="'user'" v-bind:character.prop="character"><!-- Icon+Name stack -->
        <div class="d-flex flex-column no-wrap mb-auto align-items-center" @mouseover.prevent="show()" @mouseenter.prevent="show()" @mouseleave.prevent="dismiss()" @click.middle.prevent.stop="toggleStickyness()" @click.right.passive="dismiss(true)" @click.left.passive="dismiss(true)">
            <img :src="avatarUrl" class="user-avatar" />
            <div :class="userClass" class="text-center" style="line-clamp: 2; text-overflow: ellipsis; overflow: hidden;">
                {{ character.name }}
            </div>
            <div class="text-center text-truncate">
                is {{ character.status }}
            </div>
        </div>
    </div>

    <div v-if="character.statusText" class="secondary-column ml-2 mr-1 d-flex flex-column"><!-- Status -->
        <bbcode class="flex-grow-1" style="overflow-x: hidden; overflow-y: auto;" :text="character.statusText.trim()"></bbcode>
    </div>
</div>
</template>

<script lang="ts">
import { Component, Hook, Prop } from '@frolic/vue-ts';
import Vue from 'vue';

import core from '../../core';
import EventBus from '../../preview/event-bus';
import {BBCodeView} from '../../../bbcode/view';

import type { Character } from '../../../fchat';

import NewLogger from '../../../helpers/log';
const log = NewLogger('activity');

@Component({
    components: {
        bbcode: BBCodeView(core.bbCodeParser),
    }
})
export default class UserActivity extends Vue {
    /**
     * Character displayed in this UserActivity display.
     */
    @Prop({ required: true })
    readonly character!: Character;

    /**
     * Star in top corner.
     */
    @Prop({ default: true })
    readonly friendIndicator = true;

     /**
     * Display user info in the image-preview popup on mouseover. This may be undesirable if we want a different tooltip.
     */
    @Prop({ default: true })
    readonly preview = true;

    get characterId() {
        return this.character.name.replace(/[^A-Za-z0-9_-]/g, '-');
    }

    // get activityType(): Conversation.ActivityType | null {
    //     return core.conversations.activityTab.messageTypeForMember(this.character.name);
    // }

    get userClass() {
        const gender = this.character.gender.toLowerCase();

        return `user-view gender-${gender}`;
    }

    get friendClass() { return this.character.isFriend }

    get characterUrl() { return `flist-character://${this.character.name}` }

    get avatarUrl() { return core.characters.getImage(this.character.name) }


    /**
     * Fade out
     */

    faded = false;

    removeUser() {
        this.faded = true;
        setTimeout(
            () => {
                log.debug('UserActivity.removeUser.setTimeout.activate', this.character.name, this.faded);
                this.$emit('close', this.character.name);
            },
            400
        );
    }


    /**
     * Character preview popup
     */

    @Hook('beforeDestroy')
    beforeDestroy() {
        this.dismiss();
    }

    dismiss(force: boolean = false): void {
        if (this.preview)
            EventBus.$emit('imagepreview-dismiss', { url: this.characterUrl, force });
    }

    show(): void {
        if (this.preview)
            EventBus.$emit('imagepreview-show', { url: this.characterUrl });
    }

    toggleStickyness(): void {
        if (this.preview)
            EventBus.$emit('imagepreview-toggle-sticky', { url: this.characterUrl });
    }
}
</script>

<style lang="scss">
.user-activity-card {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    flex-grow: 0;
    flex-shrink: 0;

    position: relative;

    opacity: 1;
    transition: opacity 0.38s ease-out;

    &.faded {
        opacity: 0;
    }

    .close-button {
        position: absolute;
        top:  -1px; // -1 for matching border;
        left: -1px;

        cursor: pointer;
    }

    .user-avatar {
        height: 70px;
        width:  70px;
    }

    .simple-column {
        height: 100%; // For flex margins
        max-height: calc(3lh + 80px); // 80 heuristic, can we size buttons and avatar in lh?
        max-width: calc(80px + 1em);
    }

    .secondary-column {
        height: 100%;
        max-height: calc(3lh + 80px);
        max-width: calc(160px + 2em); // x2
    }
}
</style>
