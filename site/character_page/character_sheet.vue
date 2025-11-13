<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <div class="row character-page" id="pageBody" ref="pageBody">
        <div class="col-12" style="min-height:0">
            <div class="alert alert-info" v-show="loading">Loading character information.</div>
            <div class="alert alert-danger" v-show="error">{{error}}</div>
        </div>
        <div class="col-md-4 col-lg-3 col-xl-2" v-if="!loading && character && character.character && matchReport && selfCharacter">
            <sidebar :character="character" :characterMatch="matchReport" @memo="memo" @bookmarked="bookmarked" :oldApi="oldApi"></sidebar>
        </div>
        <div class="col-md-8 col-lg-9 col-xl-10 profile-body" v-if="!loading && character && character.character && matchReport && selfCharacter">
            <div id="characterView">
                <div>
                    <div v-if="character.ban_reason" id="headerBanReason" class="alert alert-warning">
                        This character has been banned and is not visible to the public. Reason:
                        <br/> {{ character.ban_reason }}
                        <template v-if="character.timeout"><br/>Timeout expires:
                            <date :time="character.timeout"></date>
                        </template>
                    </div>
                    <div v-if="character.block_reason" id="headerBlocked" class="alert alert-warning">
                        This character has been blocked and is not visible to the public. Reason:
                        <br/> {{ character.block_reason }}
                    </div>
                    <!-- Legacy style a && a.b because no ts in templates :) -->
                    <div v-if="character.memo && character.memo.memo" id="headerCharacterMemo" class="alert alert-info">Memo: {{ character.memo.memo }}</div>
                    <div class="card bg-light">
                        <div class="card-header character-card-header">
                            <tabs class="card-header-tabs" v-model="tab">
                                <span>Overview</span>
                                <span>Info</span>
                                <span v-if="!oldApi">Groups <span class="tab-count" v-if="groups !== null">({{ groups.length }})</span></span>
                                <span>Images <span class="tab-count">({{ character.character.image_count }})</span></span>
                                <span v-if="character.settings.guestbook">Guestbook <span class="tab-count" v-if="guestbook !== null">({{ guestbook.posts.length }})</span></span>
                                <span v-if="character.is_self || character.settings.show_friends">Friends <span class="tab-count" v-if="friends !== null">({{ friends.length }})</span></span>
                                <span>Recon</span>
                            </tabs>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <div role="tabpanel" v-show="tab === '0'" id="overview">
                                    <match-report :characterMatch="matchReport" v-if="shouldShowMatch"></match-report>

                                    <div style="margin-bottom:10px" class="character-description">
                                        <bbcode v-if="descBody" :text="descBody"></bbcode>
                                    </div>

                                    <character-kinks :character="character" :oldApi="oldApi" ref="tab0" :autoExpandCustoms="autoExpandCustoms"></character-kinks>
                                </div>
                                <div role="tabpanel" v-show="tab === '1'" id="infotags">
                                    <character-infotags :character="character" ref="tab1" :characterMatch="matchReport"></character-infotags>
                                </div>
                                <div role="tabpanel" v-show="tab === '2'" v-if="!oldApi">
                                    <character-groups :character="character" ref="tab2"></character-groups>
                                </div>
                                <div role="tabpanel" v-show="tab === '3'">
                                    <character-images ref="tab3" :images="images"></character-images>
                                </div>
                                <div v-if="character.settings.guestbook" role="tabpanel" v-show="tab === '4'" id="guestbook">
                                    <character-guestbook :character="character" :oldApi="oldApi" ref="tab4"></character-guestbook>
                                </div>
                                <div v-if="character.is_self || character.settings.show_friends" role="tabpanel" v-show="tab === '5'" id="friends">
                                    <character-friends :character="character" ref="tab5"></character-friends>
                                </div>
                                <div role="tabpanel" v-show="tab === '6'">
                                    <character-recon :character="character" ref="tab6"></character-recon>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Hook, Prop, Watch} from '@f-list/vue-ts';
    import Vue from 'vue';

    import NewLogger from '../../helpers/log';
    const log = NewLogger('cahracter_sheet');

    import {StandardBBCodeParser} from '../../bbcode/standard';
    import {BBCodeView} from '../../bbcode/view';
    import * as Utils from '../utils';
    import {methods, Store} from './data_store';
    import {Character, CharacterGroup, Guestbook, SharedStore} from './interfaces';

    import DateDisplay from '../../components/date_display.vue';
    import Tabs from '../../components/tabs';
    import FriendsView from './friends.vue';
    import GroupsView from './groups.vue';
    import GuestbookView from './guestbook.vue';
    import ImagesView from './images.vue';
    import InfotagsView from './infotags.vue';
    import CharacterKinksView from './kinks.vue';
    import ReconView from './recon.vue';
    import Sidebar from './sidebar.vue';
    import core from '../../chat/core';
    import { Matcher, MatchReport } from '../../learn/matcher';
    import MatchReportView from './match-report.vue';
    import { CharacterImage, SimpleCharacter } from '../../interfaces';

    const CHARACTER_CACHE_EXPIRE      = 7 * 24 * 60 * 60 * 1000; // 7 days (milliseconds)
    const CHARACTER_META_CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7 days (milliseconds)

    type ArmorStand = Pick<CharacterPage, 'character'
                                        | 'descBody'
                                        | 'guestbook'
                                        | 'friends'
                                        | 'groups'
                                        | 'images'
                                        | 'matchReport'>;

    /**
     * Where does this come from? What is show?
     */
    interface ShowableVueTab extends Vue {
        show?(): void;
    }

    const standardParser = new StandardBBCodeParser();

    function shouldShowFriendsTabs(char: Character | undefined): char is NonNullable<typeof char> {
        return (char?.is_self ?? false) || (char?.settings.show_friends ?? false);
    }

    @Component({
        components: {
            sidebar:                Sidebar,
            date:                   DateDisplay,
            tabs:                   Tabs,
            'character-friends':    FriendsView,
            'character-guestbook':  GuestbookView,
            'character-groups':     GroupsView,
            'character-infotags':   InfotagsView,
            'character-images':     ImagesView,
            'character-kinks':      CharacterKinksView,
            'character-recon':      ReconView,
            'match-report':         MatchReportView,
            bbcode: BBCodeView(standardParser)
        }
    })
    export default class CharacterPage extends Vue {
        /**
         * Name of the character the profile should display.
         *
         * Unintuitively, this name is watched to determine when you switch private conversations, since the character sheet is never destroyed, but is reused.
         *
         * Should this be required?
         */
        @Prop
        readonly name?: string;

        /**
         * Always passed in as true; presumably as a very bad proxy for you being logged in. If you're not logged in, presumably you can't click on a person's name to open this window.
         */
        @Prop({ required: true })
        readonly authenticated!: boolean;

        /**
         * I'm not sure what the old api is exactly. It's always received as true and is then passed onto the sidebar, kinks, and guestbook.
         *
         * The Groups tab only shows if using the new api, so we never have group functionality in the app.
         */
        @Prop({ default: false })
        readonly oldApi: boolean = false;

        shared: SharedStore = Store;
        character: Character | undefined;
        loading = true;
        refreshing = false;
        error = '';
        tab = '0';

        // Tab content:
        descBody:   string            | null = null;
        guestbook:  Guestbook         | null = null;
        friends:    SimpleCharacter[] | null = null;
        groups:     CharacterGroup[]  | null = null;
        images:     CharacterImage[]  | null = null;

        // Rising matchmaker display:
        selfCharacter:  Character | undefined;
        matchReport: MatchReport | undefined;


        @Hook('beforeMount')
        beforeMount(): void {
            this.shared.authenticated = this.authenticated;
        }

        @Hook('mounted')
        async mounted(): Promise<void> {
            await this.load(false);
        }

        @Watch('tab')
        switchTabHook(): void {
            const target = <ShowableVueTab>this.$refs[`tab${this.tab}`];

            if (typeof target.show === 'function')
                target.show();

            this.scrollToTopOnNextTick();
        }

        /**
         * The entry point for all the functionality of the character sheet. Changing the name provokes loading a new profile.
         */
        @Watch('name')
        async onCharacterSet(): Promise<void> {
            // Set loading screen here stead of in load()?

            this.tab = '0';

            await this.load();

            this.scrollToTopOnNextTick()
        }

        get autoExpandCustoms() {
            return core.state.settings.risingAutoExpandCustomKinks;
        }


        get shouldShowMatch() {
            return core.state.settings.risingAdScore;
        }


        /**
         * This is invoked from the modal header, described in Index.vue. The payload (commented out) is shift key or right-click.
         */
        async reload(/* force: boolean */): Promise<void> {
            if (!this.name)
                return;

            // await this.load(force, force);
            await this.load(true, true);

            const target = <ShowableVueTab>this.$refs[`tab${this.tab}`];

            //tslint:disable-next-line:no-unbound-method
            if (typeof target.show === 'function')
                target.show();
        }


        async load(mustLoad: boolean = true, skipCache: boolean = false): Promise<void> {
            if (!this.name)
                return;

            const n = this.name;

            this.loading = true;
            this.refreshing = false;
            this.error = '';

            try {
                const due: Promise<void>[] = [];

                // Should this be pushed into the due?
                await methods.fieldsGet();

                // Initial loading of your own character profile into ownCharacter, which is globally accessible.
                // What kind of proxy is Utils.settings.defaultCharacter...?
                if (!this.selfCharacter && Utils.settings.defaultCharacter >= 0
                ||  this.selfCharacter?.character.name !== core.characters.ownCharacter.name) {
                    due.push(this.loadSelfCharacter());
                }

                if (mustLoad || n !== this.character?.character.name)
                    due.push(this._getCharacter(n, skipCache));

                await Promise.all(due);
            }
            catch (e) {
                console.error(e);

                this.error = Utils.isJSONError(e)
                    ? <string>e.response.data.error
                    : (<Error>e).message;

                Utils.ajaxError(e, 'Failed to load character information.');
            }

            this.loading = false;
        }

        /**
         * Attach guestbook posts to an in-progress mannequin.
         *
         * It would be nice if we could pass ArmorStand as `ArmorStand & { character: Character }`, but async makes typescript's detection of valid ArmorStand unreliable.
         * @param as ArmorStand; inherited from getCharacter
         */
        async updateGuestbook(stand: ArmorStand): Promise<void> {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name)) {
            log.debug("Discarding guestbook; this armor isn't for this character.");
                return;
        }

            try {
                if (!stand.character.settings.guestbook)
                    stand.guestbook = null;
                else
                    stand.guestbook = await methods.guestbookPageGet(stand.character.character.id, 1);
            }
            catch (err) {
                console.error(err);
                stand.guestbook = null;
            }
        }

        /**
         * Attach groups to an in-progress mannequin.
         *
         * Groups still depend on the never-true new api.
         *
         * It would be nice if we could pass ArmorStand as `ArmorStand & { character: Character }`, but async makes typescript's detection of valid ArmorStand unreliable.
         * @param as ArmorStand; inherited from getCharacter
         */
        async updateGroups(stand: ArmorStand): Promise<void> {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("Discarding groups; this armor isn't for this character.");
                return;
            }

            try {
                if (this.oldApi)
                    stand.groups = null;
                else
                    stand.groups = await methods.groupsGet(stand.character.character.id);
            }
            catch (err) {
                console.error('Update groups', err);
                stand.groups = null;
            }
        }

        /**
         * Attach friends to an in-progress mannequin.
         *
         * Friends still depend on the character having them set to show up.
         *
         * It would be nice if we could pass ArmorStand as `ArmorStand & { character: Character }`, but async makes typescript's detection of valid ArmorStand unreliable.
         * @param as ArmorStand; inherited from getCharacter
         */
        async updateFriends(stand: ArmorStand): Promise<void> {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("Discarding friends; this armor isn't for this character.");
                return;
            }

            try {
                if (shouldShowFriendsTabs(stand.character))
                    stand.friends = await methods.friendsGet(stand.character.character.id);
                else
                    stand.friends = null;
            }
            catch (err) {
                console.error('Update friends', err);
                stand.friends = null;
            }
        }

        /**
         * Attach images to an in-progress mannequin.
         *
         * It would be nice if we could pass ArmorStand as `ArmorStand & { character: Character }`, but async makes typescript's detection of valid ArmorStand unreliable.
         * @param as ArmorStand; inherited from getCharacter
         */
        async updateImages(stand: ArmorStand): Promise<void> {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("Discarding images; this armor isn't for this character.");
                return;
            }

            try {
                // log.debug('updateImages.start', stand.character.character.name);
                stand.images = await methods.imagesGet(stand.character.character.id) || [];
            }
            catch (err) {
                console.error('updateImages.error', err);
                stand.images = [];
            }
        }

        /**
         * Attach all the meta-profile information to an in-progress character.
         * @param as in-progress character from getCharacter
         */
        async updateMeta(stand: ArmorStand): Promise<void> {
            if (!stand.character) {
                log.error('Tried updating meta without an armor stand. A very strange error.', { noncanon_name: this.name, stand });
                return;
            }

            if (!this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("Abandoning meta stand; it isn't for this character.", { this_char: stand.character.character.name, on_sheet: this.name, stand });
                return;
            }

            const name = stand.character.character.name;

            log.debug('updateMeta.start', name);

            await Promise.allSettled([
                this.updateImages(stand),
                this.updateGuestbook(stand),
                this.updateFriends(stand),
                this.updateGroups(stand),
            ]);

            log.debug('updateMeta.resolved', name);

            // Update current character from meta.
            if (this.isCurrentCharacter(name))
                this.printArmorStand(stand);

            await core.cache.profileCache.registerMeta(
                name, {
                    lastMetaFetched: new Date(),
                    groups:    stand.groups    ?? null,
                    friends:   stand.friends   ?? null,
                    guestbook: stand.guestbook ?? null,
                    images:    stand.images    ?? null,
                }
            );

            log.debug('updateMeta.finished', name);
        }

        printArmorStand(stand: ArmorStand): void {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("Discarding armor; it doesn't fit this character.");
                return;
            }

            // Refresh inlines BEFORE putting descBody on the character (as that triggers the parser).
            standardParser.inlines = stand.character.character.inlines;

            Object.assign(
                this,
                Object.fromEntries(
                    Object.entries(stand).filter(([_, v]) => v !== undefined)
                )
            );
        }

        memo(memo: {id: number, memo: string | null}): void {
            Vue.set(this.character!, 'memo', memo);

            void core.cache.profileCache.register(this.character!);
        }

        bookmarked(state: boolean): void {
            Vue.set(this.character!, 'bookmarked', state);

            void core.cache.profileCache.register(this.character!);
        }

        protected async loadSelfCharacter(): Promise<void> {
            this.selfCharacter = core.characters.ownProfile;
        }

        /**
         * Builds the data that will fil in this.* attributes, like `this.character` and `this.images`. We use an {@link ArmorStand|armor stand} to hold the cache/API data until we've built the full character; if we wrote to this.* every step of the way; the async messes up and we change this.name to a new character as this.character is the old one; then this.character to the old one as this.images are set for the old one. Chaos.
         * @param skipCache
         */
        private async _getCharacter(name: string, skipCache: boolean = false): Promise<void> {
            if (!name) {
                log.debug('profile.getCharacter.noName');
                return;
            }

            log.debug('profile.getCharacter', { name });

            this.character = undefined;
            this.descBody  = null;
            this.friends   = null;
            this.groups    = null;
            this.guestbook = null;
            this.images    = null;

            /**
             * This armor stand is how we'll prevent collisions with alternative async code that modifies this.name and this.character. It's entirely possible to get part way through loading and have another this.name begin another load of this.character, and result in us putting data from the second character into the first character's profile.
             */
            const stand: ArmorStand = {
                character:   undefined,
                descBody:    null,
                friends:     null,
                groups:      null,
                guestbook:   null,
                images:      null,
                matchReport: undefined,
            };

            const char_record = !skipCache
                ? await core.cache.profileCache.get(name)
                : null;

            stand.character = char_record?.character
                ?? await methods.characterData(name, undefined, false);

            const now = Date.now();

            if (char_record?.lastFetched && now - char_record.lastFetched.getTime() >= CHARACTER_CACHE_EXPIRE) {
                // void: will have to put the armor on the character on its own.
                void this.refreshCache(stand); // calls updateMeta internally.
            }
            else  {
                if (!char_record?.meta?.lastMetaFetched || now - char_record.meta.lastMetaFetched.getTime() >= CHARACTER_META_CACHE_EXPIRE) {
                    log.debug('updateMeta.solo', name);

                    // void: will have to put the armor on the character on its own.
                    void this.updateMeta(stand)
                        .catch(err => log.error('_getCharacter.updateMeta', stand.character?.character.name, err));
                }

                stand.descBody = stand.character.character.description;
            }

            if (!this.isCurrentCharacter(stand.character.character.name)) {
                log.debug("_getCharacter: Abandoning printable stand because it doesn't fit current character.");
                return;
            }

            if (char_record?.meta) {
                stand.guestbook = char_record.meta.guestbook;
                stand.friends   = char_record.meta.friends;
                stand.groups    = char_record.meta.groups;
                stand.images    = char_record.meta.images;
            }

            if (this.selfCharacter) {
                const yourOverrides = (await core.characters.getAsync(this.selfCharacter.character.name)).overrides;
                const theirOverrides = (await core.characters.getAsync(stand.character.character.name)).overrides;

                stand.matchReport = Matcher.identifyBestMatchReport(this.selfCharacter.character, stand.character.character, yourOverrides, theirOverrides);
            }

            /**
             * Time to dump the armor stand out into a character.
             * At this point we only have basic info; the meta and refresh haven't returned.
             */
            this.printArmorStand(stand);
        }

        /**
         * Needs reworking to operate entirely as a background task.
         *
         * Only called from getCharacter when the cache is too old.
         * @param as In-progress character.
         */
        private async refreshCache(stand: ArmorStand): Promise<void> {
            if (!stand.character || !this.isCurrentCharacter(stand.character.character.name))
                return;

            this.refreshing = true;

            const name = stand.character?.character.name;

            log.debug('refreshCache.start', name);

            try {
                stand.character = await methods.characterData(name, undefined, false);

                log.debug('refreshCache.characterData.fetched', { char: stand.character });

                // We've moved on; skip updating the character page.
                // This used to check this.refreshing.
                if (!stand.character || !this.isCurrentCharacter(name))
                    return;

                stand.descBody = stand.character.character.description;

                if (this.selfCharacter) {
                    const [ yourOverrides, theirOverrides ] = await Promise.all([
                        core.characters.getAsync(this.selfCharacter.character.name).then(c => c.overrides),
                        core.characters.getAsync(stand.character.character.name).then(c => c.overrides),
                    ])

                    stand.matchReport = Matcher.identifyBestMatchReport(this.selfCharacter.character, stand.character.character, yourOverrides, theirOverrides);
                }

                void this.updateMeta(stand)
                    .catch(err => log.error('refreshCache.updateMeta', stand.character?.character.name, err));
            }
            finally {
                this.refreshing = false;
            }

            if (this.isCurrentCharacter(name))
                this.printArmorStand(stand);
        }

        isCurrentCharacter(name: string): boolean {
            return this.name?.toLowerCase() === name.toLowerCase();
        }

        scrollToTopOnNextTick(): void {
            this.$nextTick(() => {
                const el = document.querySelector('.modal .profile-viewer .modal-body');

                if (!el)
                    console.error('Could not find modal body for profile view');

                el?.scrollTo(0, 0);
            });
        }
    }
</script>


<style lang="scss">
    .compare-highlight-block {
        margin-bottom: 3px;

        .quick-compare-block button {
            margin-left: 2px;
        }
    }

    .character-kinks-block {
        i.fa {
            margin-right: 0.25rem;
        }


        .character-kink {
            .popover {
                display:block;
                bottom:100%;
                top:initial;
                // margin-bottom:5px;

                min-width: 200px;
                margin-bottom: 0;
                padding-bottom: 0;

                opacity: 1;
            }

            p {
                line-height: 125%;
            }

            p:last-child {
                margin-bottom:0;
            }


            &.comparison-result {
                margin: -4px;
                padding: 4px;
                padding-top: 2px;
                padding-bottom: 2px;
                margin-top: 1px;
                margin-bottom: 1px;
                border-radius: 3px;
            }
        }
    }

    .expanded-custom-kink {
        .custom-kink {
            margin-top: 14px;
            margin-bottom: 14px;
        }
    }

    .custom-kink {
        &:first-child {
            margin-top: 0;
        }

        &:last-child {
            margin-bottom: 0;
        }

        .kink-name {
            font-weight: bold;
            color: var(--characterKinkCustomColor);
        }

        i {
            color: var(--characterKinkCustomColor);
        }

        margin-top: 7px;
        margin-bottom: 7px;
        margin-left: -6px;
        margin-right: -6px;
        border: 1px var(--characterKinkCustomBorderColor) solid;
        border-radius: 2px;
        /* border-collapse: collapse; */
        padding: 5px;
    }


    .stock-kink {
        .kink-name, i {
            color: var(--characterKinkStockColor);
            font-weight: normal;
        }

        &.highlighted {
            .kink-name, i {
                font-weight: bold;
                color: var(--characterKinkStockHighlightedColor);
            }
        }
    }

    .character-kinks-block {
        .highlighting {
            .character-kink.stock-kink {
                .kink-name {
                    opacity: 0.4;
                }

                &.highlighted {
                    .kink-name {
                        opacity: 1;
                    }
                }
            }
        }
    }


    .kink-custom-desc {
        display: block;
        font-weight: normal;
        font-size: 0.9rem;
        color: var(--characterInfotagColor);
        line-height: 125%;
    }


    .infotag-label {
        display: block;
        /* margin-bottom: 1rem; */
        font-weight: normal !important;
        line-height: 120%;
        font-size: 85%;
        color: var(--characterInfotagColor);
    }


    .infotag-value {
        display: block;
        margin-bottom: 1rem;
        font-weight: bold;
        line-height: 120%;
    }

    .quick-info-value {
        display: block;
        font-weight: bold;
    }

    .quick-info-label {
        display: block;
        /* margin-bottom: 1rem; */
        font-weight: normal !important;
        line-height: 120%;
        font-size: 85%;
        color: var(--characterInfotagColor);
    }

    .quick-info {
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: var(--characterInfotagColor);
    }

    .guestbook-post {
        margin-bottom: 15px;
        margin-top: 15px;
        background-color: var(--characterGuestbookPostBg);
        border-radius: 5px;
        padding: 15px;
        border: 1px solid var(--characterGuestbookPostBorderColor);

        .characterLink {
            font-size: 20pt;
        }

        .guestbook-timestamp {
            color: var(--characterGuestbookTimestampFg);
            font-size: 85%
        }

        .guestbook-message {
            margin-top: 10px;
            display: block;
        }

        .guestbook-reply {
            margin-top: 20px;
            background-color: var(--characterGuestbookReplyBg);
            padding: 15px;
            border-radius: 4px;
        }
    }


    .contact-block {
        margin-top: 25px !important;
        margin-bottom: 25px !important;

        .contact-method {
            font-size: 80%;
            display: block;
            margin-bottom: 2px;

            img {
                border-radius: 2px;
            }
        }
    }

    #character-page-sidebar .character-list-block {
        .character-avatar.icon {
            height: 43px !important;
            width: 43px !important;
            border-radius: 3px;
        }


        .characterLink {
            font-size: 85%;
            padding-left: 3px;
        }
    }

    .character-images {
        column-width: auto;
        column-gap: 0.5rem;
        column-count: 1;
        column-fill: balance;

        .character-image-wrapper {
            display: inline-block;
            background-color: var(--characterImageWrapperBg);
            border-radius: 5px;
            box-sizing: border-box;
            margin: 5px;

            a {
                border: none;

                img {
                    max-width: 100% !important;
                    width: 100% !important;
                    height:  auto !important;
                    object-fit:  contain;
                    object-position: top center;
                    vertical-align: top !important;
                    border-radius: 6px;
                }
            }

            .image-description {
                font-size: 85%;
                padding-top: 5px;
                padding-bottom: 5px;
                padding-left: 10px;
                padding-right: 10px;
                word-break: break-word;
            }
        }
    }



    .infotag {
        &.match-score {
            padding-top: 2px;
            padding-left: 4px;
            padding-right: 4px;
            margin-left: -4px;
            margin-right: -4px;
            border-radius: 2px;
            padding-bottom: 2px;
            margin-bottom: 1rem;

            .infotag-value {
                margin-bottom: 0;
            }
        }
    }


    .match-report {
        display: flex;
        flex-direction: row;
        background-color: var(--scoreReportBg);
        /* width: 100%; */
        margin-top: -1.2rem;
        margin-left: -1.2rem;
        margin-right: -1.2rem;
        padding: 1rem;
        margin-bottom: 1rem;
        padding-bottom: 0;
        padding-top: 0.5rem;

        .thumbnail {
            width: 50px;
            height: 50px;
        }

        &.minimized {
            height: 0;
            overflow: hidden;
            background-color: transparent;

            .vs, .scores {
                display: none;
            }

            .minimize-btn {
                opacity: 0.6;
            }
        }

        h3 {
            font-size: 1.25rem;
        }

        .minimize-btn {
            position: absolute;
            display: block;
            right: 0.5rem;
            background-color: var(--scoreMinimizeButtonBg);
            padding: 0.4rem;
            padding-top: 0.2rem;
            padding-bottom: 0.2rem;
            font-size: 0.8rem;
            color: var(--scoreMinimizeButtonFg);
            border-radius: 4px;
            z-index: 1000;
        }

        .scores {
            float: left;
            flex: 1;
            margin: 0;
            max-width: 25rem;

            &.you {
                margin-right: 1rem;
           }

            &.them {
                margin-left: 1rem;
            }

            .species {
              display: inline-block;
              color: var(--characterInfotagColor);
              // opacity: 0.7;
            }

            ul {
                padding: 0;
                list-style: none;
            }

            .match-score {
                font-size: 0.85rem;
                border-radius: 2px;
                margin-bottom: 4px;
                padding: 2px;
                padding-left: 4px;
                padding-right: 4px;

                span {
                    color: var(--scoreTitleColor);
                    font-weight: bold;
                }
            }
        }

        .vs {
            margin-left: 1rem;
            margin-right: 1rem;
            text-align: center;
            font-size: 5rem;
            line-height: 0;
            color: rgba(255, 255, 255, 0.3);
            margin-top: auto;
            margin-bottom: auto;
            font-style: italic;
            font-family: 'Times New Roman', Georgia, serif;
        }
    }

    .character-kinks-block .character-kink.comparison-favorite,
    .match-report .scores .match-score.match,
    .infotag.match {
        background-color: var(--scoreMatchBg);
        border: solid 1px var(--scoreMatchFg);
    }

    .character-kinks-block .character-kink.comparison-yes,
    .match-report .scores .match-score.weak-match,
    .infotag.weak-match {
        background-color: var(--scoreWeakMatchBg);
        border: 1px solid var(--scoreWeakMatchFg);
    }

    .character-kinks-block .character-kink.comparison-maybe,
    .match-report .scores .match-score.weak-mismatch,
    .infotag.weak-mismatch {
        background-color: var(--scoreWeakMismatchBg);
        border: 1px solid var(--scoreWeakMismatchFg);
    }

    .character-kinks-block .character-kink.comparison-no,
    .match-report .scores .match-score.mismatch,
    .infotag.mismatch {
        background-color: var(--scoreMismatchBg);
        border: 1px solid var(--scoreMismatchFg);
    }


    .character-kinks-block .highlighting {
        .character-kink {
            &.comparison-favorite {
                background-color: var(--scoreFadedMatchBg);
                border-color: var(--scoreFadedMatchFg);

                &.highlighted {
                    background-color: var(--scoreMatchBg);
                    border-color: var(--scoreMatchFg);
                }
            }

            &.comparison-yes {
                background-color: var(--scoreWeakMatchBg);
                border-color: var(--scoreWeakMatchFg);

                &.highlighted {
                    background-color: var(--scoreWeakMatchBg);
                    border-color: var(--scoreWeakMatchFg);
                }
            }

            &.comparison-maybe {
                background-color: var(--scoreWeakMismatchBg);
                border-color: var(--scoreWeakMismatchFg);

                &.highlighted {
                    background-color: var(--scoreWeakMismatchBg);
                    border-color: var(--scoreWeakMismatchFg);
                }
            }

            &.comparison-no {
                background-color: var(--scoreMismatchBg);
                border-color: var(--scoreMismatchFg);

                &.highlighted {
                    background-color: var(--scoreMismatchBg);
                    border-color: var(--scoreMismatchFg);
                }
            }
        }
    }


    .tab-count {
        color: var(--tabSecondaryFgColor);
    }


    .character-card-header {
        position: sticky;
        top: -1.03rem;
        /* Lowered from 10000 - Choosing 1001 to be *just* above .minimize-btn's 1000. */
        z-index: 1001;
        background: var(--headerBackgroundMaskColor) !important;
    }

    .character-description .bbcode {
      white-space: pre-line !important;

      blockquote {
        margin: 0;
        background-color: var(--characterImageWrapperBg);
        padding: 1em;
        border-radius: 3px;

        .quoteHeader {
          border-bottom: 1px solid;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 80%;
          opacity: 0.7;
        }
      }
    }
</style>
