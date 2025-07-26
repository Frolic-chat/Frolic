<template>
    <sidebar id="user-list" :label="l('users.title')" icon="fa-users" :right="true" :open="expanded">
        <tabs style="flex-shrink:0" :tabs="channel ? { 0: l('users.friends'), 1: l('users.members') } : !isConsoleTab ? { 0: l('users.friends'), 1: 'Profile'} : { 0: l('users.friends') }" v-model="tab"></tabs>
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
        <div v-if="channel" style="padding-left:5px;flex:1;display:flex;flex-direction:column" v-show="tab === '1'">
            <div class="users" style="flex:1;padding-left:5px">
                <h4>
                  {{l('users.memberCount', channel.sortedMembers.length)}} <a class="btn sort" @click="switchSort"><i class="fas fa-sort-amount-down"></i></a>
                </h4>
                <div v-for="member in memberList" :key="member.character.name">
                    <user :character="member.character" :channel="channel" @user-filter="userViewUpdateDebounce" @user-status="userViewUpdateDebounce" @user-rank="userViewUpdateDebounce"></user>
                </div>
            </div>
            <div class="input-group" style="margin-top:5px;flex-shrink:0">
                <div class="input-group-prepend">
                    <div class="input-group-text">
                        <span class="fas fa-search"></span>
                    </div>
                </div>
                <input class="form-control" v-model="filter" @input="filterDebounce()" :placeholder="l('general.filter')" type="text"/>
            </div>
        </div>
        <div v-if="!channel && !isConsoleTab" style="flex:1;display:flex;flex-direction:column" class="profile" v-show="tab === '1'">

            <a :href="profileUrl" target="_blank" class="btn profile-button">
                <span class="fa fa-fw fa-user"></span>
                {{l('userlist.profile')}}
            </a>

            <character-page :authenticated="true" :oldApi="true" :name="profileName" :imagePreview="true" ref="characterPage"></character-page>
        </div>
    </sidebar>
</template>

<script lang="ts">
import { Component, Watch } from '@f-list/vue-ts';
import Vue from 'vue';
import Tabs from '../components/tabs';
import core from './core';
import { Channel, Character, Conversation } from './interfaces';
import l from './localize';
import Sidebar from './Sidebar.vue';
import UserView from './UserListUserView.vue';
import characterPage from '../site/character_page/character_page.vue';
import { profileLink } from './common';

import { UserListSorter } from '../learn/matcher';
import { Scoring } from '../learn/matcher-types';
import { debounce } from '../helpers/utils';

// import Logger from 'electron-log/renderer';
// const log = Logger.scope('UserList');

import { EventBus, CharacterDataEvent } from './preview/event-bus';

type StatusSort = {
    [key in Character.Status]: number;
};

type GenderSort = {
    [key in Character.Gender]: number;
};

const statusSort: StatusSort = {
    'crown':   0,
    'looking': 1,
    'online':  2,
    'idle':    3,
    'away':    4,
    'busy':    5,
    'dnd':     6,
    'offline': 7,
};

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

async function recalculateSorterGenderPriorities(profileEvent: CharacterDataEvent): Promise<void> {
    const you = profileEvent.profile.character;
    const likes: Record<Scoring, Character.Gender[]> = {
        '1': [], '0.5': [], '0': [], '-0.5': [], '-1': [],
    };

    for (const gender of (Object.keys(genderSort) as Character.Gender[])) {
        // Try by kink, then by orientation.
        const scoring = UserListSorter.getGenderPreferenceFromKink(you, gender)
            ?? UserListSorter.GetGenderPreferenceFromOrientation(you, gender);

        likes[scoring].push(gender);
    }

    let i = 0;
    Object.values(likes).forEach(level =>
        level.sort((a, b) => a.localeCompare(b))
            .forEach(g => genderSort[g] = i++)
    );

    //log.debug('userlist.sorter.gender', { genderSort: genderSort });
}

EventBus.$on('own-profile-update', async e => await recalculateSorterGenderPriorities(e));

function isImportantToChannel(char: Character.Character, conv: Channel.Channel): boolean {
    return char.isChatOp // Global operator
        || conv.opList.includes(char.name)
        || conv.owner === char.name;
}

let asyncSortedMembers: ReadonlyArray<Channel.Member> | null = null;
let syncSortedMembers: ReadonlyArray<Channel.Member> = [];

@Component({
    components: {characterPage, user: UserView, sidebar: Sidebar, tabs: Tabs}
})
export default class UserList extends Vue {
    proxy: boolean = false;
    tab = '0';
    expanded = window.innerWidth >= 992;
    filter = '';
    l = l;

    get memberList(): ReadonlyArray<Channel.Member> {
        this.proxy;

        if (asyncSortedMembers) {
            //log.debug('memberList.asyncSort');
            const m = [ ...asyncSortedMembers ];
            asyncSortedMembers = null;
            return m;
        }
        else {
            //log.debug('memberList.syncSort');
            return syncSortedMembers;
        }
    }

    sorter = (x: Character, y: Character) => (
        x.name.toLocaleLowerCase() < y.name.toLocaleLowerCase()
            ? -1
            : x.name.toLocaleLowerCase() > y.name.toLocaleLowerCase()
                ? 1
                : 0
    );

    sortType: typeof availableSorts[number] = 'normal';

    get friends(): Character[] {
        return core.characters.friends.slice()
            .sort(this.sorter);
    }

    get bookmarks(): Character[] {
        return core.characters.bookmarks.slice()
            .filter(x => !core.characters.friends.includes(x))
            .sort(this.sorter);
    }

    get channel(): Channel {
        return (<Conversation.ChannelConversation>core.conversations.selectedConversation).channel;
    }

    get isConsoleTab(): Boolean {
        return core.conversations.selectedConversation === core.conversations.consoleTab;
    }

    get profileName(): string | undefined {
        return this.channel ? undefined : core.conversations.selectedConversation.name;
    }

    get profileUrl(): string | undefined {
        if (!this.profileName)
            return;

        return profileLink(this.profileName);
    }

    /* If we should ever want to use custom icons for each sort type, combining level-down-alt with:
     * stream (normal)
     * user-clock (status)
     * venus-mars (gender)
     * would be easy and make sense.
     */
    fastMemberList(): ReadonlyArray<Channel.Member> {
        const sorted = [ ...this.matcherFilteredMembers() ];

        switch (this.sortType) {
        case 'normal':
            break;
        case 'status':
            sorted.sort((a, b) => {
                const aVal = statusSort[a.character.status];
                const bVal = statusSort[b.character.status];

                if (aVal - bVal === 0)
                    return a.character.name.localeCompare(b.character.name);

                return aVal - bVal;
            });
            break;
        case 'gender':
            sorted.sort((a, b) => {
                const aVal = genderSort[(a.character.gender || 'None')];
                const bVal = genderSort[(b.character.gender || 'None')];

                if (aVal - bVal === 0)
                    return a.character.name.localeCompare(b.character.name);

                return aVal - bVal;
            });
            break;
        }

        //log.debug('fastMemberList', { list: sorted.length });
        return sorted;
    }

    matcherFilteredMembers() {
        const members = this.userFilteredMembers();

        if (!core.state.settings.risingFilter.hideChannelMembers)
            return members;

        return members.filter(m => {
            const p = core.cache.profileCache.getSync(m.character.name);

            return !p?.match.isFiltered || isImportantToChannel(m.character, this.channel);
        });
    }

    userFilteredMembers(): ReadonlyArray<Channel.Member> {
        const sorted = this.channel.sortedMembers;

        if (!this.filter)
            return sorted;

        const filter = new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');

        return sorted.filter(member => filter.test(member.character.name));
    }

    switchSort() {
        const nextSortIndex = availableSorts.indexOf(this.sortType) + 1;
        this.sortType = availableSorts[nextSortIndex % availableSorts.length];
    }

    @Watch('channel', { deep: false })
    fastChannelUpdate(): void {
        //log.debug('fastChannelUpdate');

        if (this.channel) {
            syncSortedMembers = this.fastMemberList();
            this.proxy = !this.proxy;

            this.$nextTick(this.update);
        }
    }

    @Watch('sortType')
    sortUpdate(): void { this.update() }

    filterDebounce = debounce(this.update, { wait: 355 });

    changeFilter(): void { this.update() }

    userViewUpdateDebounce = debounce(this.update, { maxWait: 1000 });

    async update(): Promise<void> {
        asyncSortedMembers = await this.updateMemberList();
        this.proxy = !this.proxy;

        //log.debug('update', { asm: asyncSortedMembers.length });
    }

    async updateMemberList(): Promise<ReadonlyArray<Channel.Member>> {
        const sorted = [ ...this.matcherFilteredMembers() ];

        switch (this.sortType) {
        case 'normal':
            break;
        case 'status':
            sorted.sort((a, b) => {
                const aVal = statusSort[a.character.status];
                const bVal = statusSort[b.character.status];

                if (aVal - bVal === 0)
                    return a.character.name.localeCompare(b.character.name);

                return aVal - bVal;
            });
            break;
        case 'gender':
            sorted.sort((a, b) => {
                const aVal = genderSort[(a.character.gender || 'None')];
                const bVal = genderSort[(b.character.gender || 'None')];

                if (aVal - bVal === 0)
                    return a.character.name.localeCompare(b.character.name);

                return aVal - bVal;
            });
            break;
        }

        return sorted;
    }

    // @Hook('mounted')
    // mounted(): void {
    //     log.debug('mounted');
    //     this.fastChannelUpdate();

    //     // EventBus.$on('select-conversation', async (_c: Conversation) => {
    //     //     if (this.channel) {
    //     //         //this.asyncSortedMembers = await this.updateAsyncMemberList();
    //     //         log.debug('select-conversation');
    //     //         //log.debug('created.select-conversation', { asm: this.asyncSortedMembers });
    //     // });
    // }
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
          .compare-highlight-block
          {
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
