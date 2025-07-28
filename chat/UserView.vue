<!-- Linebreaks inside this template will break BBCode views
     v-bind character and channel are used in UserMenu handleEvent when crawling up the DOM -->
<template><span v-if="showing" :class="userClass" v-bind:bbcodeTag.prop="'user'" v-bind:character.prop="character" v-bind:channel.prop="channel" @mouseover.prevent="show()" @mouseenter.prevent="show()" @mouseleave.prevent="dismiss()" @click.middle.prevent.stop="toggleStickyness()" @click.right.passive="dismiss(true)" @click.left.passive="dismiss(true)"><img v-if="avatar" :src="avatarUrl" class="user-avatar" /><span v-if="showStatus" :class="statusClass"></span><span v-if="rankIcon" :class="rankIcon"></span><span v-if="smartFilterIcon" :class="smartFilterIcon"></span>{{ character.name }}<span v-if="match" :class="matchInfo.class">{{ matchInfo.title }}</span></span></template>

<script lang="ts">
import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
import Vue from 'vue';
import {Channel, Character} from '../fchat';
import { Conversation } from './interfaces';
import { isImportantToChannel } from './conversations';
import { Score } from '../learn/matcher';
import core from './core';
import { EventBus, CharacterScoreEvent } from './preview/event-bus';
import { kinkMatchWeights, Scoring } from '../learn/matcher-types';
import { characterImage } from './common';
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

function getMatchScoreTitle(score: number | string | null): string {
    switch (score) {
    case 'unicorn':
        return 'Unicorn';
    case Scoring.MATCH:
        return 'Great';
    case Scoring.WEAK_MATCH:
        return 'Good';
    case Scoring.WEAK_MISMATCH:
        return 'Maybe';
    case Scoring.MISMATCH:
        return 'No';
    }

    return '';
}

@Component({ components: {} })
export default class UserView extends Vue {
    /**
     * Watching this character is used to determine when you switch private conversations, since the UserView at the top of the conversation window is not destroyed+created, but is only changed. In fact, the whole Conversation is the same, only the props fed to the components are different (and thus load different content).
     */
    @Prop({ required: true })
    readonly character!: Character;

    /**
     * Display moderator markers, crowns, etc.
     *
     * Global operator sigils are always shown (so you know you're chatting with a mod)
     */
    @Prop({ default: undefined })
    readonly channel?: Channel;

    /**
     * Exclusively used to tell if we're the header in the [private] conversation component.
     */
    @Prop({ default: undefined })
    readonly private?: Conversation;

    /**
     * This is exclusively used by the UserList for channels.
     */
    @Prop({ default: false })
    readonly hide: boolean = false;

    /**
     * Enable the status icon.
     */
    @Prop({ default: false })
    readonly showStatus: boolean = true;

    /**
     * Color username special for friends/bookmarks
     */
    @Prop({ default: true })
    readonly bookmark: boolean = true;

    /**
     * Display match-quality text ("Great", "Good", etc.)
     */
    @Prop({ default: false })
    readonly match: boolean = false;

    /**
     * Display user info in the image-preview popup on mouseover.
     */
    @Prop({ default: true })
    readonly preview: boolean = true;

    /**
     * Display the user avatar
     *
     * Used in private message header and search results
     */
    @Prop({ default: false })
    readonly avatar: boolean = false;

    cache?: CharacterCacheRecord | null;
    scoreWatcher: ((e: CharacterScoreEvent) => Promise<void>) | null = null;
    /**
     * If the user isn't in the cache when the UserView is shown,
     * this watcher is how their score data will be intercepted and displayed.
     */
    settingsWatcher: (() => Promise<void>) | null = null;

    /**
     * A pseudo-event trigger for 'select-conversation'
     */
    privateWatcher: (() => void) | null = null;

    characterUrl = '';
    getCharacterUrl(): UserView['characterUrl'] { return `flist-character://${this.character.name}` }

    avatarUrl = '';
    getAvatarUrl(): UserView['avatarUrl'] { return characterImage(this.character.name) }

    /** Utility */
    hiding = false;
    getHiding(): UserView['hiding'] {
        try {
            // Try may be unnecessary because hiding is only enabled from places where you're logged in.
            // Still: every proxy is a bad proxy.
            if (this.hide && this.channel && core.state.settings.risingFilter.hideChannelMembers)
                return true;
        }
        catch {}

        return false;
    }

    matching = false;
    getMatching(): UserView['matching'] {
        try {
            if (this.match && core.state.settings.risingAdScore)
                return true;
        }
        catch {}

        return false;
    }
    /** /Utility */

    showing = false;
    getShowing(): UserView['showing'] {
        if (this.hiding && this.cache?.match.isFiltered && !isImportantToChannel(this.character, this.channel!))
            return false;
        else
            return true;
    }

    smartFilterIcon: string | undefined = '';
    getSmartFilterIcon(): UserView['smartFilterIcon'] {
        if (core.state.settings.risingFilter.showFilterIcon && this.cache?.match.isFiltered && !(this.character.isFriend || this.character.isBookmarked)) {
            return 'user-filter fas fa-filter';
        }
        else {
            return;
        }
    }

    userClass = '';
    getUserClass(): UserView['userClass'] {
        let bookmark: string = '';
        try {
            // We may not even need to `try` by checking `isFriend|isBookmarked` first.
            if (this.bookmark && (this.character.isFriend || this.character.isBookmarked) && core.state.settings.colorBookmarks) {
                bookmark = 'user-bookmark';
            }
        }
        catch {}

        const gender = ((this.character.overrides.gender || this.character.gender) ?? 'None').toLowerCase();

        return `user-view gender-${gender} ${bookmark}`;
    }

    // Like the avatarUrl override, these only update when the character data does - so they don't need individual watchers.
    // @Watch('character.gender')
    // updateGender(): void         { this.getUserClass() }
    // @Watch('character.overrides.gender')
    // updateOverrideGender(): void { this.getUserClass() }
    @Watch('character.isFriend')
    updateFriend(): void         { this.getUserClass() }
    @Watch('character.isBookmarked')
    updateBookmark(): void       { this.getUserClass() }

    rankIcon: string | undefined = '';
    getRankIcon(): UserView['rankIcon'] {
        if (this.character.isChatOp) {
            return 'user-rank far fa-gem';
        }
        else if (this.channel) {
            if (this.channel.owner === this.character.name) {
                return 'user-rank fa fa-key';
            }
            else if (this.channel.opList.includes(this.character.name)) {
                if (this.channel.id.substring(0, 4) === 'adh-')
                    return 'user-rank fa fa-shield-alt';
                else
                    return 'user-rank fa fa-star';
            }
        }
    }

    @Watch('character.isChatOp')
    updateChatOp():        void { this.rankIcon = this.getRankIcon() }
    @Watch('channel.owner')
    updateChannelOwner():  void { this.rankIcon = this.getRankIcon() }
    @Watch('channel.opList')
    updateChannelOpList(): void { this.rankIcon = this.getRankIcon() }

    get statusClass() {
        if (this.showStatus || this.character.status === 'crown')
            return 'user-status fa-fw ' + getStatusIcon(this.character.status);
        else
            return;
    }

    matchInfo: { class?: string, title?: string } = {};
    getMatchInfo(): UserView['matchInfo'] {
        if (!this.matching || !this.cache)
            return {};

        const perfect_match = this.cache.match.searchScore >= kinkMatchWeights.unicornThreshold && this.cache.match.matchScore === Scoring.MATCH;

        return {
            class: perfect_match
                ? 'match-found unicorn'
                : 'match-found ' + Score.getClasses(this.cache.match.matchScore),
            title: perfect_match
                ? 'Unicorn'
                : getMatchScoreTitle(this.cache.match.matchScore),
        }
    }

    /**
     * Update properties reliant on character data/cache
     */
    async updateCharacter(): Promise<void> {
        if (!this.cache && (this.matching || this.hiding || core.state.settings.risingFilter.showFilterIcon)) {
            if (core.state.settings.expensiveMemberList)
                this.cache = await core.cache.profileCache.get(this.character.name);
            else
                this.cache = core.cache.profileCache.getSync(this.character.name);
        }


        this.characterUrl = this.getCharacterUrl();
        this.avatarUrl = this.getAvatarUrl();

        this.rankIcon = this.getRankIcon();
        this.matchInfo = this.getMatchInfo();

        this.showing = this.getShowing();
    }

    /**
     * Properties to update when the user settings change
     */
    async updateSettings(): Promise<void> {
        //await Promise.resolve(); // no-op await if necessary
        this.hiding = this.getHiding();
        this.matching = this.getMatching();
        this.userClass = this.getUserClass();
    }

    /**
     * Update properties depending both on character cache and settings
     */
    updateBoth(): void {
        //await Promise.resolve(); // no-op await if necessary
        this.smartFilterIcon = this.getSmartFilterIcon();
    }

    @Hook('mounted')
    onMounted(): void {
        // Character-based updates depend on `hiding` and `matching` so settings-based updates have to run first.
        this.chunkProcessor();

        if (this.private) {
            this.privateWatcher = this.$watch('private', async () => {
                this.cache = core.cache.profileCache.getSync(this.character.name);
                await this.updateSettings();
                await this.updateCharacter();
                this.updateBoth();
            });
        }
    }

    registerEvents(): void {
        this.settingsWatcher = async (): Promise<void> => {
            await this.updateSettings();
            await this.updateBoth();

            // Additional hooks?
        };

        EventBus.$on('configuration-update', this.settingsWatcher);

        if (this.scoreWatcher)
            EventBus.$off('character-score', this.scoreWatcher);

        if (!this.cache) {
            this.scoreWatcher = async ({ profile }): Promise<void> => {
                if (this.scoreWatcher && profile.character.name === this.character.name) {
                    await this.updateCharacter();
                    await this.updateBoth();

                    if (this.hiding && this.cache?.match.isFiltered)
                        this.$emit('visibility-change');

                    EventBus.$off('character-score', this.scoreWatcher);
                    this.scoreWatcher = null;
                }
            };

            EventBus.$on('character-score', this.scoreWatcher);
        }
    }

    async chunkProcessor(): Promise<void> {
        setTimeout(async () => {
            this.updateSettings();
            setTimeout(async () => {
                await this.updateCharacter();
                setTimeout(() => {
                    this.updateBoth();
                    setTimeout(() => {
                        this.registerEvents();
                    });
                });
            });
        });
    }

    /**
     * We rely on the scoreWatcher to pick up the score update from `addProfile()`, since `cache` is null when it fails `getSync()`, so it won't update computed values.
     */
    cacheHit(): void {
        try {
            if (this.matching || this.hiding || core.state.settings.risingFilter.showFilterIcon) {
                this.cache = core.cache.profileCache.getSync(this.character.name);

                if (!this.cache)
                    void core.cache.addProfile(this.character.name);
            }
        }
        catch {}
    }

    @Hook('beforeDestroy')
    onBeforeDestroy(): void {
        if (this.scoreWatcher)    EventBus.$off('character-score',      this.scoreWatcher);
        if (this.settingsWatcher) EventBus.$off('configuration-update', this.settingsWatcher);
        if (this.privateWatcher)  this.privateWatcher(); // destroy

        this.dismiss();
    }

    dismiss(force: boolean = false): void {
        if (this.preview)
            EventBus.$emit('imagepreview-dismiss', { url: this.characterUrl, force });
    }

    show(): void {
        this.cacheHit();

        if (this.preview)
            EventBus.$emit('imagepreview-show', { url: this.characterUrl });
    }

    toggleStickyness(): void {
        if (this.preview)
            EventBus.$emit('imagepreview-toggle-sticky', { url: this.characterUrl });
    }
}
</script>
