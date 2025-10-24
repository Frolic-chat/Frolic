<!-- Linebreaks inside this template will break BBCode views
     v-bind character and channel are used in UserMenu handleEvent when crawling up the DOM -->
<template><span v-if="showing" :class="userClass" v-bind:bbcodeTag.prop="'user'" v-bind:character.prop="character" v-bind:channel.prop="channel" @mouseover.prevent="show()" @mouseenter.prevent="show()" @mouseleave.prevent="dismiss()" @click.middle.prevent.stop="toggleStickyness()" @click.right.passive="dismiss(true)" @click.left.passive="dismiss(true)"><img v-if="avatar" :src="avatarUrl" class="user-avatar" /><span v-if="showStatus" :class="statusClass"></span><span v-if="rankIcon" :class="rankIcon"></span><span v-if="smartFilterIcon" :class="smartFilterIcon"></span>{{ character.name }}<span v-if="match" :class="matchInfo.class">{{ matchInfo.title }}</span></span></template>

<script lang="ts">
import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
import Vue from 'vue';
import {Channel, Character} from '../fchat';
import { isImportantToChannel } from './conversations';
import { Score } from '../learn/matcher';
import core from './core';
import { EventBus, CharacterScoreEvent } from './preview/event-bus';
import { kinkMatchWeights, Scoring } from '../learn/matcher-types';
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
     * Character displayed in this UserView.
     *
     * Unintuitively, this character's name is watched to determine when you switch private conversations, since the UserView in the conversation header is not destroyed+created, but is reused. In fact, the whole Conversation is the same - the props fed to the components are changed (and thus load different content).
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
     * Determine if this component is reused, and we have to watch a 'character change' event.
     */
    @Prop({ default: false })
    readonly reusable = false;

    /**
     * Used in message-view to determine if we need to create the UserView synchronously. Drawing the chat window, scrolling, and then updating the UserViews causes issues where the chat messages change height, and then you aren't scrolled down all the way.
     */
    @Prop({ default: false })
    readonly immediate = false;

    /**
     * This is used by the UserList to set the initial state hidden to avoid tons of DOM updates/vue observer registers all at once.
     */
    @Prop({ default: false })
    readonly hide = false;

    /**
     * Enable the online/away/offline icon.
     */
    @Prop({ default: false })
    readonly showStatus = false;

    /**
     * Use special color for friends/bookmarks
     */
    @Prop({ default: true })
    readonly bookmark = true;

    /**
     * Display match-quality text ("Great", "Good", etc.)
     */
    @Prop({ default: false })
    readonly match = false;

    /**
     * Display user info in the image-preview popup on mouseover.
     */
    @Prop({ default: true })
    readonly preview = true;

    /**
     * Display the user avatar
     *
     * Not used in private message header
     */
    @Prop({ default: false })
    readonly avatar = false;

    cache?: CharacterCacheRecord | null;

    /**
     * Update the component from the async score event, which could come at anytime after dispatching a store or API retrieval.
     *
     * There's currently some iffy behavior when the UserView is re-used, as the scoreWatcher can be dispatched with one character, and not receive information until after the character has changed.
     * This should be easy to fix once I have time. (If this message is still here in 2035, hi! Has the apocolypse happened yet? Have people realize how bad javascript is??)
     */
    scoreWatcher: ((e: CharacterScoreEvent) => Promise<void>) | null = null;

    /**
     * If the user isn't in the cache when the UserView is shown,
     * this watcher is how their score data will be intercepted and displayed.
     */
    async settingsWatcher(): Promise<void> {
        await this.updateSettings();
        this.updateBoth();
    };

    /**
     * A pseudo-event trigger for 'select-conversation'
     */
    privateWatcher: (() => void) | null = null;

    characterUrl = '';
    getCharacterUrl(): UserView['characterUrl'] { return `flist-character://${this.character.name}` }

    avatarUrl = '';
    getAvatarUrl(): UserView['avatarUrl'] { return core.characters.getImage(this.character.name) }

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
            // Is `match` only available while logged in?
            if (this.match && core.state.settings.risingAdScore)
                return true;
        }
        catch {}

        return false;
    }

    needsCache(): boolean {
        try {
            return this.matching || this.hiding || core.state.settings.risingFilter.showFilterIcon;
        }
        catch {
            return false;
        }
    }
    /** /Utility */

    showing = false;
    getShowing(): UserView['showing'] {
        if (this.hiding && this.cache?.match.isFiltered && !isImportantToChannel(this.character, this.channel!))
            return false;
        else
            return true;
    }

    smartFilterIcon: string | undefined;
    getSmartFilterIcon(): UserView['smartFilterIcon'] {
        try {
            if (core.state.settings.risingFilter.showFilterIcon && this.cache?.match.isFiltered && !(this.character.isFriend || this.character.isBookmarked)) {
                return 'user-filter fas fa-filter';
            }
        }
        catch {}

        return;
    }

    userClass = '';
    getUserClass(): UserView['userClass'] {
        let bookmark: string = '';

        // We may not even need to `try` by checking `isFriend|isBookmarked` first.
        if (this.bookmark && (this.character.isFriend || this.character.isBookmarked) && core.state.settings.colorBookmarks) {
            bookmark = 'user-bookmark';
        }

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
     * Update properties reliant on character data/cache.
     *
     * Be careful of checking cache; this only tries to load when there is no cache. Cache updating needs to be handled by your per-event judgment.
     */
    async updateCharacter(): Promise<void> {
        if (!this.cache && this.needsCache()) {
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

    @Hook('beforeMount')
    onBeforeMount(): void {
        if (this.immediate) {
            if (this.needsCache()) this.cache = core.cache.profileCache.getSync(this.character.name);
            this.registerEvents();
            this.updateSettings();

            // updateCharacter without `cache.get`. This avoid possibility of async.
            this.characterUrl = this.getCharacterUrl();
            this.avatarUrl = this.getAvatarUrl();

            this.rankIcon = this.getRankIcon();
            this.matchInfo = this.getMatchInfo();

            this.showing = this.getShowing();

            this.updateBoth();
        }
        else {
            this.chunkProcessor();
        }
    }

    async chunkProcessor(): Promise<void> {
        if (this.needsCache()) this.cache = core.cache.profileCache.getSync(this.character.name);
        this.registerEvents();
        setTimeout(async () => {
            // Character updates need `hiding` and `matching` so settings updates run first.
            this.updateSettings();
            setTimeout(async () => {
                await this.updateCharacter();
                setTimeout(() => {
                    this.updateBoth();
                });
            });
        });
    }

    registerEvents(): void {
        // Be cautious with reusable components.
        if (this.scoreWatcher)    EventBus.$off('character-score',      this.scoreWatcher);
        if (this.settingsWatcher) EventBus.$off('configuration-update', this.settingsWatcher);
        if (this.privateWatcher)  this.privateWatcher(); // destroy

        if (this.reusable) {
            this.privateWatcher = this.$watch('character.name', async () => {
                // Essentially a re-creation
                this.cacheHit();
                await this.updateSettings();
                await this.updateCharacter();
                this.updateBoth();
            });
        }

        EventBus.$on('configuration-update', this.settingsWatcher);

        if (!this.cache) {
            this.scoreWatcher = async ({ profile }): Promise<void> => {
                if (this.scoreWatcher && profile.character.name === this.character.name) {
                    await this.updateCharacter();
                    this.updateBoth();

                    if (this.hiding && this.cache?.match.isFiltered)
                        this.$emit('visibility-change');

                    EventBus.$off('character-score', this.scoreWatcher);
                    this.scoreWatcher = null;
                }
            };

            EventBus.$on('character-score', this.scoreWatcher);
        }
    }

    /**
     * We rely on the scoreWatcher to pick up the score update from `addProfile()`, since `cache` is null when it fails `getSync()`, so it won't update computed values.
     */
    cacheHit(): void {
        if (this.needsCache()) {
            this.cache = core.cache.profileCache.getSync(this.character.name);

            if (!this.cache)
                void core.cache.addProfile(this.character.name);
        }
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
