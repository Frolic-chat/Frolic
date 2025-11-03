<template>
<sidebar id="user-list" :label="l('users.title')" icon="fa-users" :right="true" :open="expanded">
    <tabs style="flex-shrink:0" :tabs="channel ? { 0: l('users.friends'), 1: l('users.members') } : !isConsoleOrActivity ? { 0: l('users.friends'), 1: 'Profile'} : { 0: l('users.friends') }" v-model="tab"></tabs>
    <div class="users" style="padding-left:10px" v-show="tab === '0'">
        <h4>{{l('users.friends')}}</h4>
        <div v-for="character in friends" :key="character.name">
            <user :character="character" :showStatus="true" :bookmark="false"></user>
        </div>
        <h4>{{l('users.bookmarks')}}</h4>
        <div v-for="character in bookmarks" :key="character.name">
            <user :character="character" :showStatus="true" :bookmark="false"></user>
        </div>
    </div>
    <div v-if="channel" style="padding-left:10px;display:flex" class="flex-column flex-grow-1 flex-shrink-1" v-show="tab === '1'">
        <h4 class="flex-shrink-0 flex-grow-0">
            {{l('users.memberCount', channel.sortedMembers.length)}} <a class="btn sort" @click="switchSort"><span class="fas fa-sort-amount-down"></span></a>
        </h4>

        <!-- :debug="true" -->
        <virtual-scroller class="flex-grow-1 flex-shrink-1" :items="filteredMembers" :itemHeight="singleItemSize" :overdraw="10">
            <template v-slot:default="{ item }">
                <user style="display:inline-block;width:100%;" class="text-truncate" :character="item.character" :channel="channel" :immediate="true" :hide="false" :showStatus="true" @visibility-change="userViewUpdateThrottle"></user>
            </template>
        </virtual-scroller>

        <div class="input-group flex-shrink-0" style="margin-top:5px">
            <div class="input-group-prepend">
                <div class="input-group-text">
                    <span class="fas fa-search"></span>
                </div>
            </div>
            <input class="form-control" v-model="filter" :placeholder="l('general.filter')" type="text"/>
        </div>
    </div>
    <div v-if="!channel && !isConsoleOrActivity" style="flex:1;display:flex;flex-direction:column" class="profile" v-show="tab === '1'">

        <a :href="profileUrl" target="_blank" class="btn profile-button">
            <span class="fa fa-fw fa-user"></span>
            {{l('userlist.profile')}}
        </a>

        <character-page :authenticated="true" :oldApi="true" :name="profileName" ref="characterPage"></character-page>
    </div>
</sidebar>
</template>

<script lang="ts">
import {Component} from '@f-list/vue-ts';
import Vue from 'vue';
import VirtualScroller from '../components/VirtualScroller.vue';
import Tabs from '../components/tabs';
import core from './core';
import { Channel, Character, Conversation } from './interfaces';
import { isImportantToChannel } from './conversations';
import l from './localize';
import Sidebar from './Sidebar.vue';
import UserView from './UserView.vue';
import characterPage from '../site/character_page/character_sheet.vue';
import { profileLink } from './common';

import UserListSorter from '../learn/user-list-sorter';
import { Scoring } from '../learn/matcher-types';
import { EventBus, CharacterDataEvent } from './preview/event-bus';
import { debounce } from '../helpers/utils';

import NewLogger from '../helpers/log';
const log = NewLogger('UseList');

type StatusSort = { [key in Character.Status]: number };
type GenderSort = { [key in Character.Gender]: number };

const statusSort: StatusSort = {
    'crown':   0,
    'looking': 1,   'online':  2,
    'idle':    3,   'away':    4,
    'busy':    5,   'dnd':     6,
    'offline': 7,
} as const;

/**
 * This list is automatically re-sorted to your character's preference.
 */
const genderSort: GenderSort = {
    'Cunt-boy':     0,
    'Female':       1,
    'Herm':         2,
    'Male':         3,
    'Male-Herm':    4,
    'None':         5,
    'Shemale':      6,
    'Transgender':  7,
};

const availableSorts = ['normal', 'status', 'gender'] as const;

function recalculateSorterGenderPriorities({ profile }: CharacterDataEvent): void {
    const you = profile.character;
    const likes: Record<Scoring, string[]> = {
        '1': [], '0.5': [], '0': [], '-0.5': [], '-1': [],
    }

    for (const gender of Object.keys(genderSort)) {
        // SCORE GENDER BY KINK
        let scoring = UserListSorter.getGenderPreferenceFromKink(you, gender);

        // SCORE GENDER BY ORIENTATION
        if (scoring === null)
            scoring = UserListSorter.GetGenderPreferenceFromOrientation(you, gender);

        likes[scoring].push(gender);
    }

    // re-sort genderSort for character's gender pref.
    for (const array of Object.values(likes)) {
        array.sort((a, b) => a.localeCompare(b))
    }

    const simpleStruct = [
        likes['1'], likes['0.5'], likes['0'], likes['-0.5'], likes['-1'],
    ];
    let i=0;
    simpleStruct.forEach(array => {
        while (array.length > 0) {
            const value = array.shift() as Character.Gender;
            if (value) {
                genderSort[value] = i;
                i++;
            }
        }
    });

    log.debug('userlist.sorter.gender', { genderSort: genderSort });
}

EventBus.$on('own-profile-update', recalculateSorterGenderPriorities);

@Component({
    components: {
        characterPage,
        user: UserView,
        sidebar: Sidebar,
        tabs: Tabs,
        'virtual-scroller': VirtualScroller,
    }
})
export default class UserList extends Vue {
    tab = '0';
    expanded = window.innerWidth >= 992;
    filter = '';
    l = l;

    // singleElementSize = core.state.settings.fontSize * 1.25; // 1.25em from fa-fw icons
    // I'm not sure where we get 1.5em line height, but that's what the legacy userlist+useview does.
    singleItemSize = core.state.settings.fontSize * 1.5;

    userListProxy = false;
    userViewUpdateThrottle = debounce(this.update, { wait: 500, maxWait: 1500 });

    /** This was async in testing */
    update(): void {
        // asyncSortedMembers = await this.updateMemberList();
        this.userListProxy = !this.userListProxy;
    }

    sortType: typeof availableSorts[number] = 'normal';

    get friends(): Character[] {
        return core.characters.friends.slice()
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    get bookmarks(): Character[] {
        return core.characters.bookmarks.slice()
            .filter(x => !core.characters.friends.includes(x))
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }

    get channel(): Channel {
        return (<Conversation.ChannelConversation>core.conversations.selectedConversation).channel;
    }

    get isConsoleOrActivity() {
            return core.conversations.selectedConversation === core.conversations.consoleTab
                || core.conversations.selectedConversation === core.conversations.activityTab;
        }

    get profileName(): string | undefined {
        return this.channel ? undefined : core.conversations.selectedConversation.name;
    }

    get profileUrl(): string | undefined {
        return this.profileName ? profileLink(this.profileName) : undefined;
    }

    /* If we should ever want to use custom icons for each sort type, combining level-down-alt with:
        * stream (normal)
        * user-clock (status)
        * venus-mars (gender)
        * would be easy and make sense.
        */
    get filteredMembers(): ReadonlyArray<Channel.Member & { id: string }> {
        //Trigger update from UserView
        this.userListProxy;

        const members = this.getFilteredMembers();

        // Gross:
        const sorted = members.map(e => ({
            ...e,
            id: e.character.name
        })) as Array<Channel.Member & { id: string }>;

        if (this.sortType === 'normal')
            return sorted;

        /** `{ sensitivity: 'base' }` should not be necessary due to the pre-sorting that happens when a new channel member joins, but could technically come in handy after changing through various list sorts. */
        switch (this.sortType) {
        case 'status':
            sorted.sort((a, b) => {
                const aVal = statusSort[a.character.status];
                const bVal = statusSort[b.character.status];

                if (aVal === bVal)
                    return a.character.name.localeCompare(b.character.name, undefined, { sensitivity: 'base' });

                return aVal - bVal;
            });
            break;

        case 'gender':
            sorted.sort((a, b) => {
                const aVal = genderSort[(a.character.gender || 'None')];
                const bVal = genderSort[(b.character.gender || 'None')];

                if (aVal === bVal)
                    return a.character.name.localeCompare(b.character.name, undefined, { sensitivity: 'base' });

                return aVal - bVal;
            });
            break;
        }

        return sorted;
    }

    getFilteredMembers() {
        const members = this.prefilterMembers();

        if (!core.state.settings.risingFilter.hideChannelMembers)
            return members;

        return members.filter(m => {
            const p = core.cache.profileCache.getSync(m.character.name);

            return !p?.match.isFiltered || isImportantToChannel(m.character, this.channel);
        });
    }

    prefilterMembers(): ReadonlyArray<Channel.Member> {
        const sorted = this.channel.sortedMembers;

        if (!this.filter)
            return sorted;

        const filter = new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');

        return sorted.filter(member => filter.test(member.character.name));
    }

    switchSort() {
        const next = availableSorts.indexOf(this.sortType) + 1;
        this.sortType = availableSorts[next % availableSorts.length];
    }
}
</script>

<style lang="scss">
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins/breakpoints";

#user-list {
    flex-direction: column;

    h4 {
        margin: 5px 0 0 -5px;
        font-size: 17px;
    }

    .users {
        overflow: auto;

        // > div {
        //     overflow: hidden;
        //     text-overflow: ellipsis;
        //     -webkit-line-clamp: 2;
        //     line-clamp: 2;
        // }
    }

    .nav li:first-child a {
        border-left: 0;
        border-top-left-radius: 0;
    }

    .sidebar {
        .body {
            overflow-x: hidden;
        }
    }

    @media (min-width: breakpoint-min(md)) {
        .sidebar {
            position: static;
            margin: 0;
            padding: 0;
            height: 100%;
        }

        .modal-backdrop {
            display: none;
        }
    }

    &.open .body {
        display: flex;
    }

    .profile {
        .profile-button {
            border: 1px var(--secondary) solid;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            min-height: 2rem;
            margin-left: 0.3rem;
            margin-right: 0.3rem;
            margin-top: 0.6rem;
            display: block;
        }

        h4 {
            margin: 0.5rem 0 0.5rem 0 !important;
            padding-left: 0.25rem;
            padding-right: 0.2rem;
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
            color: var(--characterKinkCustomColor);
        }

        .match-report {
            display: none;
        }

        .tab-content #overview > div {
            margin-bottom: 0.4rem !important;
            margin-left: 5px;
            margin-right: 5px;

            &.character-kinks-block {
                margin-left: 0;
                margin-right: 0;
            }
        }

        .row.character-page {
            display: block;
            margin-right: 0;
            margin-left: 0;

            > div {
                max-width: 100% !important;
                margin: 0;
                padding: 0;
                border: 0;
                flex: 0 0 100%;
            }
        }

        #character-page-sidebar {
            border: none;
            background-color: transparent !important;
        }

        .card-body {
            padding: 0;
        }

        .character-page {
            .character-links-block,
            .character-avatar,
            .character-page-note-link,
            .character-card-header,
            .compare-highlight-block {
                display: none !important;
            }

            #characterView {
                .card {
                    border: none !important;
                    background-color: transparent !important;
                }

                .character-kinks-block {
                    .kink-block-no {
                        .card {
                            background-color: var(--scoreMismatchBgFaint) !important;
                        }
                    }

                    .kink-block-maybe {
                        .card {
                            background-color: var(--scoreWeakMismatchBgFaint) !important;
                        }
                    }

                    .kink-block-yes {
                        .card {
                            background-color: var(--scoreWeakMatchBgFaint) !important;
                        }
                    }

                    .kink-block-favorite {
                        .card {
                            background-color: var(--scoreMatchBgFaint) !important;
                        }
                    }
                }
            }

            .infotag {
                margin: 0;
                padding: 0;
                margin-bottom: 0.3rem;

                .infotag-value {
                    margin: 0;
                }
            }

            .character-list-block {
                display: none !important;
            }

            .quick-info-block {
                margin-left: 5px;
                margin-right: 5px;
            }

            .quick-info {
                display: none !important;
            }

            #headerCharacterMemo {
                margin-left: 5px;
                margin-right: 5px;
                margin-top: 0.75rem;
                margin-bottom: 0.75rem;
            }

            .character-kinks-block {
                > div {
                    flex-direction: column !important;
                    margin: 0 !important;

                    > div {
                        min-width: 100% !important;
                        padding: 0 !important;
                        margin-top: 0.5rem;

                        .card {
                            border: none !important;

                            .card-header {
                                margin: 0;
                                padding: 0;
                            }

                            div.stock-kink + div.custom-kink {
                                border-top: 1px var(--characterKinkCustomBorderColor) solid !important;
                                padding-top: 0.25rem !important;
                                margin-top: 0.25rem !important;
                            }

                            .character-kink {
                                margin: 0;
                                padding: 0;

                                &.stock-kink {
                                    padding-left: 0.2rem !important;
                                    margin-right: 0.3rem !important;
                                    margin-left: 0.1rem !important;
                                }

                                &.custom-kink {
                                    margin-bottom: 0.3rem;
                                    border: none;
                                    margin-left: auto;
                                    max-width: 95%;
                                    margin-right: auto;
                                    padding-bottom: 0.5rem;
                                    border-bottom: 1px var(--characterKinkCustomBorderColor) solid;
                                }

                                .popover {
                                    min-width: 180px;
                                    max-width: 180px;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
</style>
