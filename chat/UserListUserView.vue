<!-- Linebreaks inside this template will break BBCode views -->
<template><span :class="userClass" v-bind:character.prop="character" @mouseover.prevent="show()" @mouseenter.prevent="show()" @mouseleave.prevent="dismiss()" @click.middle.prevent.stop="toggleStickyness()" @click.right.passive="dismiss(true)" @click.left.passive="dismiss(true)"><span v-if="!!statusClass" :class="statusClass"></span><span v-if="!!rankIcon" :class="rankIcon"></span><span v-if="!!smartFilterIcon" :class="smartFilterIcon"></span>{{character.name}}</span></template>


<script lang="ts">
import { Component, Hook, Prop } from '@f-list/vue-ts';
import Vue from 'vue';
import {Channel, Character} from '../fchat';
import core from './core';
import { EventBus, CharacterScoreEvent } from './preview/event-bus';
import { CharacterCacheRecord } from '../learn/profile-cache';

export function getStatusIcon(status: Character.Status): string {
    switch(status) {
        case 'online':
            return 'far fa-user';
        case 'looking':
            return 'fa fa-eye';
        case 'dnd':
            return 'fa fa-minus-circle';
        case 'offline':
            return 'fa fa-ban';
        case 'away':
            return 'far fa-circle';
        case 'busy':
            return 'fa fa-cog';
        case 'idle':
            return 'far fa-clock';
        case 'crown':
            return 'fa fa-birthday-cake';
    }
}

@Component({ components: {} })
export default class UserView extends Vue {
    @Prop({ required: true })
    readonly character!: Character;

    @Prop()
    readonly channel?: Channel;

    @Prop({default: true})
    readonly bookmark?: boolean = true;

    @Prop({default: true})
    readonly preview: boolean = true;

    get userClass() {
        const gender = ((this.character.overrides.gender || this.character.gender) ?? 'None').toLowerCase();

        // `isOpen` continues to be a bad legacy proxy for accessing `core.state.settings` without error. The error is deliberate and should be handled appropriately.
        const isBookmark = this.bookmark && core.connection.isOpen && core.state.settings.colorBookmarks && (this.character.isFriend || this.character.isBookmarked);

        return `user-view gender-${gender}${isBookmark ? ' user-bookmark' : ''}`;
    }

    get rankIcon() {
        //this.$emit('user-rank');

        let rankIcon = '';

         if (this.character.isChatOp) {
            rankIcon = 'far fa-gem';
        }
        else if (this.channel) {
            if (this.character.name === this.channel.owner) {
                rankIcon = 'fa fa-key';
            }
            else if (this.channel.opList.includes(this.character.name)) {
                rankIcon = (this.channel.id.substring(0, 4) === 'adh-' ? 'fa fa-shield-alt' : 'fa fa-star')
            }
        }

        return `user-rank ${rankIcon}`;
    }

    get statusClass() {
        // Is this necessary given channel member add/remove comes directly from server?
        if (this.character.status === 'offline')
            this.$emit('user-status');

        return `fa-fw ${getStatusIcon(this.character.status)}`;
    }

    cache?: CharacterCacheRecord | null;
    get smartFilterIcon() {
        try { // Do we really.......
            if (core.state.settings.risingFilter.showFilterIcon)
                this.cache = core.cache.profileCache.getSync(this.character.name);

            if (core.state.settings.risingFilter.hideChannelMembers && this.cache?.match.isFiltered)
                this.$emit('user-filter');
        }
        catch {}

        return this.cache?.match.isFiltered
            ? 'user-filter fas fa-filter'
            : '';
    }

    scoreWatcher: ((event: CharacterScoreEvent) => void) | null = null;

    @Hook('mounted')
    onMounted(): void {
        if (this.scoreWatcher)
            EventBus.$off('character-score', this.scoreWatcher);

        this.scoreWatcher = async (event): Promise<void> => {

            if (this.scoreWatcher && event.profile.character.name === this.character.name) {
                this.cache = await core.cache.profileCache.get(this.character.name);

                EventBus.$off('character-score', this.scoreWatcher);

                this.scoreWatcher = null;
            }
        };

        EventBus.$on('character-score', this.scoreWatcher);
    }

    @Hook('beforeDestroy')
    onBeforeDestroy(): void {
        if (this.scoreWatcher)
            EventBus.$off('character-score', this.scoreWatcher);

        this.dismiss();
    }

    @Hook('deactivated')
    deactivate(): void { this.dismiss() }

    get characterUrl(): string {
        return `flist-character://${this.character.name}`;
    }

    cacheHit(): void {
        try {
            /**
             * `core.connection.isOpen` is often used as a proxy for loaded
             * `core.state.settings` - it works because you're stuck on a load
             * screen while both set up. However, this coupling just tip-toes
             * around the issue. `.settings` *deliberately* throws... so catch.
             */
            if (core.state.settings.risingFilter.showFilterIcon) {
                this.cache = core.cache.profileCache.getSync(this.character.name);

                if (!this.cache)
                    void core.cache.addProfile(this.character.name);
            }
        }
        catch {}
    }

    dismiss(force: boolean = false): void {
        if (!this.preview)
            return;

        EventBus.$emit('imagepreview-dismiss', { url: this.characterUrl, force });
    }


    show(): void {
        this.cacheHit();

        if (!this.preview)
            return;

        EventBus.$emit('imagepreview-show', { url: this.characterUrl });
    }


    toggleStickyness(): void {
        if (!this.preview)
            return;

        EventBus.$emit('imagepreview-toggle-sticky', { url: this.characterUrl });
    }
}
</script>

<style lang="scss">
.user-view {
    content-visibility: auto;
}
</style>
