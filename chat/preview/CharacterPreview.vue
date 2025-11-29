<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
  <div class="character-preview">
    <div v-if="match && character" class="row">
      <div class="col-2">
        <img :src="avatarUrl" class="character-avatar">
      </div>

      <div class="col-10">
        <h1 class="user-view">
          <span class="character-name" :class="(statusClasses || {}).userClass">{{ character.character.name }}</span>
          <span v-if="((statusClasses) && (statusClasses.matchScore === 'unicorn'))" :class="(statusClasses || {}).matchClass">Unicorn</span>
        </h1>
        <h3>{{ status }}</h3>

        <div class="summary">
          <div class="info-text-block" v-if="age || species || kemonomimi">
            <span class="uc" v-if="age">{{ l('characterPreview.yearsOld', age) }}</span>
            <span class="divider" v-if="age && (species || kemonomimi)"> / </span>
            <span class="uc">
              <span v-if="species">{{ species }}</span>{{ (species && kemonomimi) ? ' ' : '' }}<span v-if="kemonomimi">{{ kemonomimi }}</span>
            </span>
            <span class="divider" v-if="species || kemonomimi"> / </span>
          </div>

          <div class="info-text-block" v-if="sexualOrientation || subDomRole || gender">
            <span class="uc" v-if="gender">{{ gender }}</span>
            <span class="divider" v-if="gender && subDomRole"> / </span>
            <span class="uc" v-if="subDomRole">{{ subDomRole }}</span>
            <span class="divider" v-if="(gender || subDomRole) && sexualOrientation"> / </span>
            <span class="uc" v-if="sexualOrientation">{{ sexualOrientation }}</span>
            <span class="divider" v-if="sexualOrientation"> / </span>
          </div>
        </div>

        <match-tags v-if="match" :match="match"></match-tags>

        <div class="filter-matches" v-if="isFiltered">
          <span class="matched-tags">
            <span v-for="filterName in filtersDetails" class="mismatch smart-filter-tag" :class="filterName">
              <i class="fas fa-solid fa-filter"></i>
              {{ (smartFilterLabels[filterName] || {}).name }}
            </span>
          </span>
        </div>

<!--        <div v-if="customs">-->
<!--          <span v-for="c in customs" :class="Score.getClasses(c.score)">{{c.name}}</span>-->
<!--        </div>-->

        <div class="memo" v-if="memo">
          <h4>{{ l('characterPreview.memo') }}</h4>
          <div class="memo-body">{{ memo }}</div>
        </div>

        <div class="status-message" v-if="statusMessage">
          <h4>{{ l('character.status') }} <span v-if="latestAd && statusMessage === latestAd.message">{{ l('characterPreview.status2') }}</span></h4>
          <bbcode :text="statusMessage"></bbcode>
        </div>

        <div class="conversation" v-if="conversation && conversation.length > 0">
          <h4>{{ l('characterPreview.messages') }}</h4>

          <message-view v-for="message in conversation" :message="message" :key="message.id">
          </message-view>
        </div>

        <div class="latest-ad-message" v-if="latestAd && latestAd.message !== statusMessage">
          <h4>{{ l('characterPreview.ad') }} <span class="message-time">{{ formatTime(latestAd.datePosted) }}</span></h4>
          <bbcode :text="latestAd.message"></bbcode>
        </div>
      </div>
    </div>
    <div v-else>
      {{ l('general.loading') }}
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Hook, Watch } from '@f-list/vue-ts';
import Vue from 'vue';
import core from '../core';
import { methods } from '../../site/character_page/data_store';
import {Character as ComplexCharacter} from '../../site/character_page/interfaces';
import { Matcher, MatchReport, Score } from '../../learn/matcher';
import { Character as CharacterStatus } from '../../fchat';
import { getStatusIcon } from '../UserView.vue';
import { kinkMatchWeights, Scoring, genderToKinkMap, genderKinkStringMap } from '../../learn/matcher-types';
import { CharacterCacheRecord } from '../../learn/profile-cache';

import l from '../localize';
import {formatTime} from '../common';
import MatchTags from './MatchTags.vue';
import {
  furryPreferenceMapping,
  Gender,
  Orientation,
  Species,
  SubDomRole,
  TagId
} from '../../learn/matcher-types';
import { BBCodeView } from '../../bbcode/view';
import { EventBus, CharacterScoreEvent } from './event-bus';
// import { CustomKink } from '../../interfaces';
import { testSmartFilters } from '../../learn/filter/smart-filter';
import { smartFilterTypes } from '../../learn/filter/types';
import { Conversation } from '../interfaces';
import MessageView from '../message_view';
import { lastElement } from '../../helpers/utils';

import NewLogger from '../../helpers/log';
const logG = NewLogger('custom-gender');

export interface StatusClasses {
    rankIcon:         string          | null;
    smartFilterIcon:  string          | null;
    statusClass:      string          | null;
    matchClass:       string          | null;
    matchScore:       string | number | null;
    userClass:        string;
    isBookmark:       boolean;
}

export function getStatusClasses(character:    CharacterStatus.Character,
                                 showStatus:   boolean,
                                 showBookmark: boolean,
                                 showMatch:    boolean
                                ): StatusClasses {

    let rankIcon:        StatusClasses['rankIcon']        = null;
    let statusClass:     StatusClasses['statusClass']     = null;
    let matchClass:      StatusClasses['matchClass']      = null;
    let matchScore:      StatusClasses['matchScore']      = null;
    let smartFilterIcon: StatusClasses['smartFilterIcon'] = null;

    if (character.isChatOp) {
        rankIcon = 'far fa-gem';
    }

    if (showStatus || character.status === 'crown')
        statusClass = `fa-fw ${getStatusIcon(character.status)}`;

    let cache: CharacterCacheRecord | null | undefined = undefined;
    try {
        /**
         * In old code, `core.connection.isOpen` is a proxy for `core.state.settings`,
         * and it works because you're stuck on a load screen for the duration of both
         * structures setting up. However, this coupling just tip-toes around the issue.
         * `.settings` *deliberately* throws, so catching is proper and intended.
         */
        if (showMatch && core.state.settings.risingAdScore) {
            // Isn't this supposed to show some sort of matching?
            cache = core.cache.profileCache.getSync(character.name);
        }
        else if (core.state.settings.risingFilter.showFilterIcon) {
            cache = core.cache.profileCache.getSync(character.name);
        }
    }
    catch {}

    // undefined == not interested
    // null == no cache hit
    if (cache === null && showMatch)
        void core.cache.addProfile(character.name);

    if (cache && showMatch && core.state.settings.risingAdScore) {
        if (cache.match.searchScore >= kinkMatchWeights.unicornThreshold && cache.match.matchScore === Scoring.MATCH) {
            matchClass = 'match-found unicorn';
            matchScore = 'unicorn';
        }
        else {
            matchClass = `match-found ${Score.getClasses(cache.match.matchScore)}`;
            matchScore = cache.match.matchScore;
        }
    }

    if (cache?.match.isFiltered && core.state.settings.risingFilter.showFilterIcon) {
        smartFilterIcon = 'user-filter fas fa-filter';
    }

    const gender = character.gender.toLowerCase(); // for classes; skip custom

    let isBookmark: boolean = false;
    try {
        if (showBookmark && core.state.settings.colorBookmarks && (character.isFriend || character.isBookmarked)) {
            isBookmark = true;
        }
    }
    catch {}

    const userClass = `user-view gender-${gender}${isBookmark ? ' user-bookmark' : ''}`;

    return {
        rankIcon:    rankIcon    ? `user-rank   ${rankIcon}`    : null,
        statusClass: statusClass ? `user-status ${statusClass}` : null,
        matchClass,
        matchScore,
        userClass,
        smartFilterIcon,
        isBookmark,
    };
}

// Hard string replacements are english coded. Do these ever risk appearing in another language?
function readable(s: string): string {
    return s
        .replace(/([A-Z])/g, ' $1').trim().toLowerCase()
        .replace(/(always|usually) (submissive|dominant|top|bottom)/, '$2')
        .replace(/bi ((?:fe)?male) preference/, '$1-favoring bi')
        .replace(/bi curious/, 'bi-curious');
}

// interface CustomKinkWithScore extends CustomKink {
//     score: number;
//     name: string;
// }

@Component({
    components: {
        'match-tags': MatchTags,
        bbcode: BBCodeView(core.bbCodeParser),
        'message-view': MessageView
    }
})
export default class CharacterPreview extends Vue {
    l = l;
    formatTime = formatTime;
    TagId = TagId;
    Score = Score;

    characterName?: string;
    character?: ComplexCharacter;
    onlineCharacter?: CharacterStatus;
    ownCharacter?: ComplexCharacter;
    match?: MatchReport;

    smartFilterLabels: Record<string, { name: string }> = {
        ...smartFilterTypes,
        ageMin: { name: 'Min age' },
        ageMax: { name: 'Max age' }
    };

    conversation?: Conversation.Message[];

    scoreWatcher: ((e: CharacterScoreEvent) => Promise<void>) | null = null;

    get avatarUrl() {
        this.recomputer;
        return core.characters.getImage(this.characterName ?? this.character?.character.name ?? '');
    }

    get status() {
        this.recomputer;
        const s = this.onlineCharacter?.status;
        return s
            ? `${s.substring(0, 1).toUpperCase()}${s.substring(1)}`
            : 'Offline';
    }

    get statusClasses(): StatusClasses | undefined {
        this.recomputer;
        return this.onlineCharacter
            ? getStatusClasses(this.onlineCharacter, true, false, true)
            : undefined;
    }

    get statusMessage(): string | undefined {
        this.recomputer;
        return this.onlineCharacter?.statusText;
    }

    get age() {
        this.recomputer;
        if (!this.match)
            return undefined;

        const age = this.match.them.yourAnalysis.age;
        if (age)
            return age;

        const raw = Matcher.getTagValue(TagId.Age, this.match.them.you)?.string;
        return raw && /[0-9]/.test(raw) ? raw : undefined;
    }

    get species() {
        this.recomputer;
        if (!this.match)
            return undefined;

        const species = this.match.them.yourAnalysis.species;
        if (species)
            return readable(Species[species]);

        const raw = Matcher.getTagValue(TagId.Species, this.match.them.you)?.string;

        return raw ?? undefined;

    }

    get kemonomimi() {
        this.recomputer;
        return this.match?.them.yourAnalysis.isKemonomimi && (!this.species || !this.species.endsWith('mimi'))
            ? readable('kemomimi')
            : undefined;
    }

    get sexualOrientation() {
        this.recomputer;
        return this.match?.them.yourAnalysis.orientation
            ? readable(Orientation[this.match.them.yourAnalysis.orientation])
            : undefined;
    }

    get subDomRole() {
        this.recomputer;
        const sdr = this.match?.them.yourAnalysis.subDomRole;
        return sdr && sdr !== SubDomRole.Switch
            ? readable(SubDomRole[sdr])
            : undefined;
    };

    get gender() {
        this.recomputer;
        const g = this.onlineCharacter?.overrides.gender?.string
        if (g)
            return readable(g);

        const kink_map = this.match?.them.yourAnalysis.gender
            ?.filter(g => g !== Gender.None)
             .map(g => genderToKinkMap[g]);

        if (!kink_map?.length)
            return undefined;

        const gender_string = genderKinkStringMap[kink_map[0]];
        if (gender_string) {
            logG.debug(`No custom gender, using: ${gender_string[0]}`);
            return readable(gender_string[0]);
        }
    }

    get memo() {
        this.recomputer;
        return this.character?.memo?.memo ?? null;
    }

    // Unused, but updated anyways.
    get furryPref() {
        this.recomputer;
        if (!this.match)
            return;

        const pref = this.match.them.yourAnalysis.furryPreference;

        return pref
            ? readable(furryPreferenceMapping[pref])
            : undefined;
    }

    @Hook('mounted')
    mounted(): void {
        this.scoreWatcher = async ({ profile }): Promise<void> => {
            if (this.characterName && profile.character.name === this.characterName)
                this.load(this.characterName, true);
        };

        EventBus.$on('character-score', this.scoreWatcher);
    }


  @Hook('beforeDestroy')
  beforeDestroy(): void {
      if (this.scoreWatcher) {
          EventBus.$off('character-score', this.scoreWatcher);
          this.scoreWatcher = null;
      }
  }

    recomputer = false;
    async load(characterName: string, force: boolean = false): Promise<void> {
        if (force)
            this.recomputer = !this.recomputer;

        if (!force && this.characterName === characterName && this.match && this.character && this.onlineCharacter)
            return;

        // Step 1: Void the current character. `this.character` and `this.match` must be true to show the tooltip.
        //
        this.character       = undefined;
        this.onlineCharacter = undefined;
        this.character       = undefined;
        this.ownCharacter    = core.characters.ownProfile; // safety, likely unnecessary
        this.match           = undefined;
        this.conversation    = undefined;

        const char_name = characterName;

        // Step 2. Load the core attributes necessary for computed getters to operate.
        // `this.characterName` is the character sheet and `this.onlineCharacter` is the chat character.
        const promises = await Promise.all([
            core.characters.getAsync(char_name),
            this.getCharacterData(char_name),
            this.ownCharacter && core.characters.getAsync(this.ownCharacter.character.name),
        ]);

        this.onlineCharacter     = promises[0];
        this.character           = promises[1];
        const ownOnlineCharacter = promises[2];

        if (this.ownCharacter && ownOnlineCharacter) { // && this.character) ...exists, errored if it didn't.
            const theirOverrides = this.onlineCharacter.overrides;
            const yourOverrides = ownOnlineCharacter.overrides;

            this.match = Matcher.identifyBestMatchReport(this.ownCharacter.character, this.character.character, yourOverrides, theirOverrides);
        }

        // Wait to set this until after the awaits so that computed getters don't update based on it.
        this.characterName = char_name;

        // Step 3. The computed getters see their observed variables change and update themselves accordingly.
        // :)
    }

    // Only used for other getters.
    get filtersResults() {
        this.recomputer;
        return this.character
            ? testSmartFilters(this.character.character, core.state.settings.risingFilter)
            : undefined;
    }

    get isFiltered() {
        if (!this.filtersResults)
            return false;

        const kink_filtered = Object.values(this.filtersResults.filters)
                .some(r => r && r.isFiltered);
        const age_filtered = this.filtersResults.ageCheck.ageMax || this.filtersResults.ageCheck.ageMin;

        return kink_filtered || age_filtered;
    }

    get filtersDetails() {
        if (!this.isFiltered || !this.filtersResults)
            return [];

        return [
            ...Object.entries(this.filtersResults.ageCheck)
                .filter(v => v[1])
                .map(v => v[0]),
            ...Object.entries(this.filtersResults.filters)
                .filter(v => v[1] && v[1].isFiltered)
                .map(v => v[0]),
        ]
    }

    @Watch('recomputer') onRecomputer() { this.characterName && void this.updateConversationStatus(this.characterName) }
    @Watch('characterName') onName()    { this.characterName && void this.updateConversationStatus(this.characterName) }

    async updateConversationStatus(name: string): Promise<void> {
        const ownName = core.characters.ownCharacter.name;
        const logKey = name.toLowerCase();
        const logDates = await core.logs.getLogDates(ownName, logKey);

        if (!logDates.length)
            return;

        const messages = await core.logs.getLogs(ownName, logKey, lastElement(logDates));
        const matcher = /\[AUTOMATED MESSAGE]/;

        this.conversation = messages
            .filter(m => !matcher.exec(m.text))
            .slice(-3)
            .map(m => ({
                ...m,
                text: m.text.length > 512 ? m.text.substring(0, 512) + '…' : m.text
            }));
    }

    get latestAd() {
        if (!this.characterName)
            return;

        const cache = core.cache.adCache.getSync(this.characterName);

        if (!cache?.posts.length || Date.now() - cache.posts[cache.posts.length - 1].datePosted.getTime() > (45 * 60 * 1000))
            return;

        return cache.posts[cache.posts.length - 1];
    }

    // Unused
    // get customs(): CustomKinkWithScore[] | undefined {
    //     if (!this.character?.character.customs)
    //         return;

    //     return Object.values(this.character.character.customs)
    //         .filter((c): c is CustomKink => c !== undefined)
    //         .map(c => ({
    //             ...c,
    //             score: kinkMapping[c.choice],
    //             name: c.name.trim().replace(/^\W+/, '').replace(/\W+$/, ''),
    //         } as CustomKinkWithScore))
    //         .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    // }

    async getCharacterData(characterName: string): Promise<ComplexCharacter> {
        const cache = await core.cache.profileCache.get(characterName);
        if (cache)
            return cache.character;

        return methods.characterData(characterName, undefined, false);
    }
}
</script>

<style lang="scss">
  .character-preview {
    padding: 10px;
    padding-right: 15px;
    background-color: color-mix(in oklab, var(--input-bg) 91%, transparent);
    max-height: 100%;
    overflow: hidden;
    border-radius: 0 5px 5px 5px;
    border: 1px solid var(--secondary);

    .unicorn {
      margin-left: 8px;
    }

    .summary {
      font-size: 125%;

      .uc {
        display: inline-block;

        &::first-letter {
          text-transform: capitalize;
        }
      }
      .info-text-block {
        .divider {
          color: var(--secondary);
        }
      }

      .match {
        background-color: var(--scoreMatchBg);
        border: solid 1px var(--scoreMatchFg);
      }

      .weak-match {
        background-color: var(--scoreWeakMatchBg);
        border: 1px solid var(--scoreWeakMatchFg);
      }

      .weak-mismatch {
        background-color: var(--scoreWeakMismatchBg);
        border: 1px solid var(--scoreWeakMismatchFg);
      }

      .mismatch {
        background-color: var(--scoreMismatchBg);
        border: 1px solid var(--scoreMismatchFg);
      }
    }

    .matched-tags {
      margin-top: 1rem;
    }

    h1 {
      line-height: 100%;
      margin-bottom: 0;
      font-size: 2em;
    }

    h3 {
      font-size: 1.1rem;
      color: var(--dark);
    }

    h4 {
      font-size: 1.25rem;
      margin-bottom: 0;

      .message-time {
        font-size: 80%;
        font-weight: normal;
        color: var(--messageTimeFgColor);
        margin-left: 2px;
      }
    }

    .status-message,
    .latest-ad-message,
    .conversation,
    .memo {
      display: block;
      background-color: rgba(0,0,0,0.2);
      padding: 10px;
      border-radius: 5px;
      margin-top: 1.3rem;
    }

    .memo-body {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .filter-matches {
      margin-top: 0.75em;
    }

    .character-avatar {
      width: 100%;
      height: auto;
    }
  }
</style>
