<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- eslint-disable vue/no-multi-spaces vue/multiline-html-element-content-newline -->
<template>
<page ref="homePageLayout">
  <template v-slot:prescroll>
    <div class="page-header d-flex align-items-center">
      <div class="mr-auto">
        <h5>{{ l('settings') }}</h5>
      </div>
      <div class="ml-auto flex-shrink-0">
        <slot name="title-end"></slot>
      </div>
    </div>

    <!-- The mr-2 on the below elements are to account for the scrollbar on the lower element making everything appear offset. -->

    <div class="d-flex flex-row flex-wrap justify-content-center mr-2 mb-2" style="gap: 0.5rem">
      <button v-for="entry, i in tabNames"
          :key="i"
          class="btn btn-light settings-tab"
          :class="{
            active: activeCollapse === entry,
            'active-settings-result-tab': searchHighlight[entry],
          }"
          @click.prevent="openSection(entry)"
      >
        {{ entry }}
      </button>
    </div>

    <search-widget :onSearch="onSearch" class="mr-2 mb-2"></search-widget>
  </template>

  <template v-slot:default>
    <collapse :id="tabDataName" :ref="tabDataName" :title="tabDataName" :initial="false" class="mb-4 mt-4 settings-container">
      <section-title :title="l('settings.sectionHeader.logging')"></section-title>

      <checkbox setting="logMessages"></checkbox>
      <checkbox setting="logChannels" :disabled="!settings.logMessages"></checkbox>
      <checkbox setting="logAds"      :disabled="!settings.logMessages"></checkbox>

      <section-title :title="l('settings.sectionHeader.style')"></section-title>

      <number   setting="fontSize" :default="fontSizeDefault" :localArgs="fontSizeArgs" :min="fontSizeMin" :max="fontSizeMax"></number>

      <generic-dropdown :obj="generalSettings" setting="theme">
        <option v-for="theme, i in risingAvailableThemes" :key="i" :value="theme">
          {{ theme }}
        </option>
      </generic-dropdown>

      <dropdown setting="risingCharacterTheme">
        <option value="">
          {{ l('rising.theme.default') }}
        </option>
        <option disabled>
          ---
        </option>
        <option v-for="theme, i in risingAvailableThemes" :key="i" :value="theme">
          {{ theme }}
        </option>
      </dropdown>

      <checkbox setting="risingColorblindMode">
        <template v-slot:help>
          <div v-html="l('settings.risingColorblindMode.help')"></div>
        </template>
      </checkbox>

      <section-title :title="l('settings.sectionHeader.import')"></section-title>

      <!-- Import/overwrite settings from another character -->
      <div class="form-group settings-search-result-marker">
        <label class="form-label" for="import">
          {{ l('settings.import') }}
        </label>
        <div class="row" style="margin-inline: 0; gap: 1rem"><!-- wrapper to put button on same line -->
          <select id="import" v-model="importCharacter" class="form-control col">
            <option value="">
              ---
            </option>
            <option v-for="character, i in availableImports" :key="i" :value="character">
              {{ character }}
            </option>
          </select>
          <button class="btn btn-secondary col-auto" :disabled="!importCharacter" @click="doImport">
            {{ l('settings.import.button') }}
          </button>
        </div>
        <small id="importHelp" class="help form-text text-muted">
          {{ l('settings.import.help', you) }}
        </small>
      </div>
    </collapse>
    <collapse :id="tabNotifName" :ref="tabNotifName" :title="tabNotifName" :initial="false" class="mb-4 settings-container">
      <section-title :title="l('settings.sectionHeader.system')"></section-title>

      <checkbox setting="notifications"></checkbox>

      <section-title :title="l('settings.sectionHeader.audio')"></section-title>

      <checkbox setting="playSound"></checkbox>
      <checkbox setting="alwaysNotify" :disabled="!settings.playSound"></checkbox>
      <range    setting="notifyVolume" :localArgs="notifyVolumeArgs" :marks="notifyVolumeMarks" :disabled="!settings.playSound"></range>

      <section-title :title="l('settings.sectionHeader.events')"></section-title>

      <dropdown setting="notifyFriendSignIn" :options="relationshipMap"></dropdown>
      <dropdown setting="notifyOnFriendMessage" :options="relationshipMap"></dropdown>

      <section-title :title="l('settings.sectionHeader.contentMatch')"></section-title>

      <checkbox setting="highlight"></checkbox>

      <text-input setting="highlightWords" :validator="vdHighlightString" :transformer="tfHighlightString"></text-input>

      <!--
      <text-input setting="highlightUsernames" :validator="tfHighlightUsernames" :transformer="tfHighlightUsernames"></text-input>
      -->
    </collapse>
    <collapse :id="tabBehaviorName" :ref="tabBehaviorName" :title="tabBehaviorName" :initial="false" class="mb-4 settings-container">
      <section-title :title="l('settings.sectionHeader.misc')"></section-title>

      <number setting="idleTimer" :default="idleTimerDefault" :localArgs="idleTimerArgs" :min="idleTimerMin" :max="idleTimerMax"></number>

      <section-title :title="l('settings.sectionHeader.messaging')"></section-title>

      <checkbox setting="clickOpensMessage"></checkbox>

      <checkbox setting="showNeedsReply">
        <template v-slot:title>
          <div v-html="l('settings.showNeedsReply')"></div>
        </template>
      </checkbox>

      <generic-check :obj="generalSettings" setting="autoPinPMs">
        <template v-slot:title>
          <div v-html="l('settings.autoPinPMs')"></div>
        </template>
      </generic-check>

      <section-title :title="l('settings.sectionHeader.visual')"></section-title>

      <checkbox setting="risingAutoExpandCustomKinks"></checkbox>
      <checkbox setting="risingAutoCompareKinks"></checkbox>

      <div class="form-group"><hr></div>

      <checkbox setting="colorBookmarks">
        <template v-slot:help>
          <div v-html="l('settings.colorBookmarks.help')"></div>
        </template>
      </checkbox>

      <checkbox setting="showAvatars"></checkbox>

      <checkbox setting="animatedEicons">
        <template v-slot:help>
          <div class="d-flex flex-row align-items-center">
            <img alt="nyancat" title="nyancat" class="character-avatar icon mr-2" :src="`https://static.f-list.net/images/eicon/nyancat.${settings.animatedEicons ? 'gif' : 'png'}`">
            {{ l('settings.animatedEicons.help') }}
          </div>
        </template>
      </checkbox>

      <text-input setting="disallowedTags" :validator="vdDisallowedTags" :transformer="tfDisallowedTags">
        <template v-slot:help>
          <div v-html="l('settings.disallowedTags.help')"></div>
        </template>
      </text-input>

      <section-title :title="l('settings.sectionHeader.preview')"></section-title>

      <checkbox setting="risingCharacterPreview"></checkbox>
      <checkbox setting="risingLinkPreview"></checkbox>
      <range setting="linkPreviewVolume" :localArgs="linkVolumeArgs" :marks="linkVolumeMarks" :disabled="!settings.risingLinkPreview"></range>
    </collapse>
    <collapse :id="tabChatName" :ref="tabChatName" :title="tabChatName" :initial="false" class="mb-4 settings-container">
      <section-title :title="l('settings.sectionHeader.messages')"></section-title>

      <checkbox setting="risingShowPortraitInMessage"></checkbox>
      <checkbox setting="messageSeparators"></checkbox>

      <div class="border border-secondary rounded mb-3 mx-4"><!-- test message area for above settings -->
        <message-view v-for="message, i in exampleMessages" :key="i" :message="message"></message-view>
      </div>

      <checkbox setting="joinMessages"></checkbox>
      <checkbox setting="eventMessages"></checkbox>
      <checkbox setting="showBroadcastsInPMs"></checkbox>

      <section-title :title="l('settings.sectionHeader.input')"></section-title>

      <checkbox setting="bbCodeBar"></checkbox>
      <checkbox setting="risingShowPortraitNearInput" :disabled="!settings.bbCodeBar"></checkbox>

      <div class="form-group"><hr></div>

      <checkbox setting="enterSend"></checkbox>
      <checkbox setting="secondEnterSend" :disabled="!settings.enterSend"></checkbox>

      <editor v-model="testEditorInput" maxlength="255" :placeholder="l('settings.testInput.ph')" :hasToolbar="settings.bbCodeBar" :characterName="bbcodePortrait" :classes="`form-control chat-text-box ${waitingForSecondEnterClass}`" @keydown="onInputTestKeyDown">
        <template v-slot:default>
          <div class="bbcode-editor-controls">
            {{ testEditorInputLength }} / 255
          </div>
        </template>
        <template v-slot:toolbar-end>
          <div v-if="!settings.enterSend" class="btn btn-sm btn-primary ml-1" @click="onInputTestSend">
            {{ l('chat.send') }}
          </div>
        </template>
      </editor>
    </collapse>
    <collapse :id="tabRisingName" :ref="tabRisingName" :title="tabRisingName" :initial="false" class="mb-4 settings-container">
      <section-title :title="l('settings.sectionHeader.matching')"></section-title>

      <checkbox setting="risingAdScore"></checkbox>
      <checkbox setting="expensiveMemberList"></checkbox>
      <checkbox setting="risingComparisonInUserMenu"></checkbox>
      <checkbox setting="risingComparisonInSearch"></checkbox>

      <!-- HIDDEN ADS -->
      <section-title :title="l('settings.sectionHeader.hideAds')"></section-title>
      <section-text :body="l('settings.hideAds.desc')"></section-text>

      <div v-if="hidden.length" class="settings-search-result-marker">
        <div v-for="user, i in hidden" :key="user">
          <span class="fa fa-times" style="cursor:pointer" @click.stop="hidden.splice(i, 1)"></span>
          {{ user }}
        </div>
      </div>
      <div v-else class="settings-search-result-marker">
        {{ l('settings.hideAds.empty') }}
      </div>

      <!-- CHAT FILTERS -->
      <section-title :title="l('settings.sectionHeader.filterVisibility')"></section-title>
      <section-text :body="l('rising.header.naTo')" :sub="l('rising.header.visibilityCaveat')"></section-text>

      <div class="warning p-2 mb-2">
        <section-title :title="l('settings.sectionHeader.dangerZone')"></section-title>
        <section-text :body="l('rising.header.desc')" :sub="l('rising.filter.warning')"></section-text>
      </div>

      <generic-check
          v-for="e in smartFilterEnum"
          :key="e" :obj="settings.risingFilter" :setting="e" prefix="risingFilter"
      >
        <template v-slot:title>
          <div v-html="l(`settings.risingFilter.${e}`)"></div>
        </template>
      </generic-check>

      <section-title :title="l('settings.sectionHeader.matchParams')"></section-title>

      <generic-num :obj="settings.risingFilter"
          setting="minAge" prefix="risingFilter" :min="0"
      ></generic-num>
      <generic-num :obj="settings.risingFilter"
          setting="maxAge" prefix="risingFilter" :min="0"
      ></generic-num>

      <generic-check
          v-for="_, k in smartFilterTypes"
          :key="k" :obj="settings.risingFilter.smartFilters" :setting="k" prefix="smartFilters"
      ></generic-check>

      <section-title :title="l('settings.sectionHeader.exceptions')"></section-title>

      <generic-text :obj="settings.risingFilter"
          setting="exceptionNames" prefix="risingFilter"
      ></generic-text>
    </collapse>
    <collapse :id="tabBrowserName" :ref="tabBrowserName" :title="tabBrowserName" :initial="false" class="mb-4 settings-container">
      <custom-browser-settings></custom-browser-settings>
    </collapse>
  </template>
</page>
</template>

<script lang="ts">
import * as FS from 'fs';
import * as Path from 'path';

import Vue from 'vue';
import { Component, Hook } from '@frolic/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import Collapse from '../../components/collapse.vue';
import SectionTitle from './settings/SectionTitle.vue';
import SectionText from './settings/SectionText.vue';
import MessageView from '../message_view';
import { Editor } from '../bbcode';

import Checkbox from './settings/Checkbox.vue';
import GenericCheckbox from './settings/GenericCheckbox.vue';
import TextInput from './settings/TextInput.vue';
import GenericText from './settings/GenericText.vue';
import NumberInput from './settings/Number.vue';
import GenericNumber from './settings/GenericNumber.vue';
import Range from './settings/Range.vue';
import Dropdown from './settings/Dropdown.vue';
import GenericDropdown from './settings/GenericDropdown.vue';
import Search from './settings/Search.vue';

import BrowserSettings from './Settings-CustomBrowserPage.vue';
import { getKey } from '../common';
import { Keys } from '../../keys';

import type { Settings as SettingsInterface } from '../interfaces';
import { Relation } from '../interfaces';
import { smartFilterTypes as smartFilterTypesImport } from '../../learn/filter/types';
import { Message, EventMessage } from '../common';
import { Conversation } from '../interfaces';
import type { Character } from '../interfaces';

import * as FROLIC from '../../constants/frolic';
import core from '../core';
import l from '../localize';

import NewLogger from '../../helpers/log';
const logMinor = NewLogger('settings-minor');

@Component({
    components: {
        page:     HomePageLayout,
        collapse: Collapse,
        editor:   Editor,

        checkbox:           Checkbox,
        'generic-check':    GenericCheckbox,
        'text-input':       TextInput,
        'generic-text':     GenericText,
        number:             NumberInput,
        'generic-num':      GenericNumber,
        range:              Range,
        dropdown:           Dropdown,
        'generic-dropdown': GenericDropdown,

        'search-widget': Search,
        'message-view':  MessageView,
        'section-title': SectionTitle,
        'section-text':  SectionText,

        'custom-browser-settings': BrowserSettings,
    },
})
export default class Settings extends Vue {
    l = l;

    generalSettings = core.state.generalSettings;
    settings = core.state.settings;
    you = core.characters.ownCharacter.name;

    tabDataName      = l('settings.tabs.data');
    tabNotifName     = l('settings.tabs.notifications');
    tabBehaviorName  = l('settings.tabs.behavior');
    tabChatName      = l('settings.tabs.chat');
    tabRisingName    = l('settings.tabs.bonus');
    tabBrowserName   = l('settings.tabs.browser');

    get tabNames() {
        return [
            this.tabDataName,
            this.tabNotifName,
            this.tabBehaviorName,
            this.tabChatName,
            this.tabRisingName,
            this.tabBrowserName,
        ];
    }

    activeCollapse = '';
    openSection(id: string): void {
        const element = document.getElementById(id);

        if (element) {
            this.tabNames.forEach(n => {
                if (n === id)
                    (this.$refs[n] as Collapse).open(true);
                else
                    (this.$refs[n] as Collapse).close(true);
            });

            window.requestAnimationFrame(() =>
                element.scrollIntoView({ behavior: 'smooth' })
            );


            this.activeCollapse = id;
        }
    }

    searchHighlight: Record<string, boolean> = {};
    /**
     * To perform this maneuver more directly, we'd have to make more assumptions about the return nodes and their children. More assumptions means easier breakage, so let's not!
     */
    onSearch(query: string, isErrorLength: boolean, results: Array<Element>): Array<Element> {
        query = query.toLowerCase();

        // Resolve prior results.
        results.forEach(el => el.classList.remove('active-settings-search-result'));

        this.searchHighlight = {};

        if (!query || isErrorLength)
            return [];

        // Select new results.
        const els: Array<Element> = [];

        const markers = this.$el.querySelectorAll('.settings-search-result-marker');
        markers.forEach(el => {
            if (el.textContent.toLowerCase().includes(query)) {
                // Highlight the element - passing down would be nicer.
                el.classList.add('active-settings-search-result');
                els.push(el);

                const parent_id = el.closest('.settings-container')?.id;
                if (parent_id) // Highlight the tab.
                    this.searchHighlight[parent_id] = true;
                else
                    logMinor.warn('Settings.onSearch.parent_id.none');
            }
        });

        return els;
    }

    /**
     * Chat visuals test
     */
    exampleMessages: Conversation.Message[] = [];

    @Hook('mounted')
    onMount() {
        // Tab 0
        this.risingAvailableThemes = this.getAvailableThemes();
        this.availableImports      = this.getAvailableImports();

        const sampleCharacter = this.createFrolicMannequin();
        this.exampleMessages.push(
            new Message(Conversation.Message.Type.Message, core.characters.ownCharacter, 'I wish I knew some cool triangle facts.', new Date()),
            new EventMessage(l('events.login', `[user]${sampleCharacter.name}[/user]`)),
            new Message(Conversation.Message.Type.Message, sampleCharacter, 'In [i]three-dimensional Euclidean space[/i], four connected points [sub]not all on the same plane[/sub] form a [b]tetrahedron[/b] - a shape with four triangular sides! [eicon]kittygiggle[/eicon]', new Date()),
            new Message(Conversation.Message.Type.Message, sampleCharacter, 'In non-Eucliden geometries, three line segments can still form a triangle - for example, a [url=https://mathworld.wolfram.com/SphericalTriangle.html]spherical triangle[/url] or a [url=https://www.math.uci.edu/~ndonalds/math161/hyper.pdf]hyperbolic triangle![/url]', new Date()),
            new Message(Conversation.Message.Type.Action, sampleCharacter, ' wanted to make a triangle joke... but it was too obtuse! [eicon]nyehe[/eicon]', new Date()),
            new EventMessage(l('events.logout', `[user]${sampleCharacter.name}[/user]`))
        );
    }

    /**
     * Simulate an online character for the chat sample display.
     */
    createFrolicMannequin(): Character {
        const temp = core.characters.get('Frolic', false);
        return {
            name:         FROLIC.frolicCharacterName,
            gender:       core.characters.ownCharacter.gender === 'Female' ? 'Transgender' : 'Female',
            status:       'looking',
            statusText:   '',
            isFriend:     temp.isFriend,
            isBookmarked: temp.isBookmarked,
            isChatOp:     temp.isChatOp,
            isIgnored:    temp.isIgnored,
            overrides:    { avatarUrl: null, gender: null, status: null },
        };
    }

    /**
     * Input test
     */
    get bbcodePortrait() { return this.settings.risingShowPortraitNearInput ? this.you : undefined; }

    testEditorInput = '';
    get testEditorInputLength() { return this.testEditorInput.length; }

    waitingForSecondEnter = false;
    waitingForSecondEnterClass:    'second-enter-send-allowed' | '' = '';
    waitingForSecondEnterTimeout?: number;
    onInputTestSend() {
        if (!this.testEditorInput.trim())
            return;

        this.testEditorInput = '';
    }
    onInputTestKeyDown(e: KeyboardEvent) {
        // This snippet is from the normal conversation page enter handler. See that page for deeper comments.
        if (getKey(e) === Keys.Enter) {
            // - Shift+Enter when "enter to send" & solo Enter otherwise
            if (e.shiftKey === this.settings.enterSend)
                return;

            e.preventDefault();

            // Stops double-enter visual feedback and potential chat spam.
            if (!this.testEditorInput.trim())
                return;

            if (!this.settings.enterSend || !this.settings.secondEnterSend) {
                this.testEditorInput = '';
                return;
            }

            // Only double-enter situations remain
            if (this.waitingForSecondEnter) {
                this.waitingForSecondEnter = false;
                this.waitingForSecondEnterClass = '';

                if (this.waitingForSecondEnterTimeout) {
                    window.clearTimeout(this.waitingForSecondEnterTimeout);
                    this.waitingForSecondEnterTimeout = undefined;
                }

                this.testEditorInput = '';
                return;
            }
            else {
                this.waitingForSecondEnter = true;
                this.waitingForSecondEnterClass = 'second-enter-send-allowed';
                this.waitingForSecondEnterTimeout = window.setTimeout(() => {
                    this.waitingForSecondEnter = false;
                    this.waitingForSecondEnterClass = '';
                    this.waitingForSecondEnterTimeout = undefined;
                }, 3000);
            }
        }
    }

    /**
     * Tab 0
     */
    idleTimerDefault = 10;
    fontSizeDefault  = 14;

    idleTimerMin   =    0;
    idleTimerMax   = 1440;
    fontSizeMin    =   10;
    fontSizeMax    =   24;

    idleTimerArgs    = { help: [  '0', '1440' ] };
    fontSizeArgs     = { help: [ '10',   '24' ] };

    get disallowedTags() { return this.settings.disallowedTags.join(','); }
    get highlightWords() { return this.settings.highlightWords.join(','); }

    vdDisallowedTags(s: string): boolean {
        if (this.tfDisallowedTags(s))
            return true;
        else
            return false;
    }

    tfDisallowedTags(s: string): string[] {
        const a = s.toLowerCase()
            .split(/\s*,\s*/)
            .filter(v => v);
        return [ ...new Set(a) ];
    }

    vdHighlightString(s: string): boolean {
        if (this.tfHighlightString(s))
            return true;
        else
            return false;
    }

    tfHighlightString(s: string): string[] {
        const a = s.trim().toLowerCase()
            .split(/\s*,\s*/)
            .filter(v => v);
        return [ ...new Set(a) ];
    }

    notifyVolumeMarks = [ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ];
    notifyVolumeArgs = { help: [  '0',  '100' ] };

    /**
     * Eliminates the 'Default' option because
     */
    get relationshipMap() {
        return Object.values(Relation.Chooser)
            .filter(v => typeof v === 'number' && v !== Relation.Chooser.Default)
            .map(v => [ v, l(Relation.Label[v]) ]);
    }

    linkVolumeMarks   = [ 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ];
    linkVolumeArgs   = { help: [  '0',  '100' ] };

    risingAvailableThemes: ReadonlyArray<string> = [];

    getAvailableThemes = () => {
        // eslint-disable-next-line no-undef
        return FS.readdirSync(Path.join(__dirname, 'themes'))
            .filter(file => file.slice(-4) === '.css')
            .map(file => file.slice(0, -4));
        // In the event we want to capitalize the entries...
        //.map(name => name.charAt(0).toUpperCase() + name.slice(1));
    };

    /**
     * Tab 3
     */
    smartFilterTypes = smartFilterTypesImport;

    smartFilterEnum = [
        'hideAds',
        'hideSearchResults',
        'hideChannelMembers',
        'hidePublicChannelMessages',
        'hidePrivateChannelMessages',
        'hidePrivateMessages',
        'showFilterIcon',
        'autoReply',
        'penalizeMatches',
        'rewardNonMatches',
    ] as const;

    /**
     * Tab 4
     */
    get hidden(): string[] {
        return core.state.hiddenUsers;
    }

    /**
     * Tab 6
     */
    importCharacter = '';

    availableImports: ReadonlyArray<string> = [];

    getAvailableImports = () => core.settingsStore.getAvailableCharacters().filter(c => c !== core.connection.character);

    async doImport(): Promise<void> {
        if (!this.importCharacter)
            return;

        if (!window.confirm(l('settings.import.confirm', this.importCharacter, core.connection.character)))
            return;

        const import_key = async (key: keyof SettingsInterface.Keys) => {
            const settings = await core.settingsStore.get(key, this.importCharacter);

            if (settings !== undefined)
                await core.settingsStore.set(key, settings);
        };

        await import_key('settings');
        await import_key('pinned');
        await import_key('modes');
        await import_key('conversationSettings');
        core.connection.close(false);
    }
}
</script>

<style lang="scss">
.page-header {
    height: 3em;
}

#settings > .prescroll .nav-tabs-scroll {
    margin-left:  -10px; /* Offset for bootstrap .container */
    margin-right: -10px; /* Offset for bootstrap .container */
}
#settings .form-group {
    margin-left: 0;
    margin-right: 0;

    hr {
        opacity: 0.75;
    }
}

#settings .form-group.filters label {
    display: list-item;
    margin: 0;
    margin-left: 5px;
    list-style: none;
}

#settings .warning {
    border: 1px solid var(--warning);
    border-radius: 4px;

    div {
        margin-top: 10px;
    }
}

#settings .form-group.filters.age label {
    padding-top: 10px;
}

#settings .form-group.filters.age  input {
    margin-left: 5px;
}

#settings .hqp-error {
    color: var(--danger);
}
#settings .hqp-input {
    resize: none;
}

/**
 * Fixes bootstraps negative margin on the checkbox.
 */
#settings .settings-search-result-marker {
    padding-left: 1.5rem;
}

/**
 * Improves the highlighting effect by giving more space for the border to show.
 */
#settings .settings-search-result-marker.active-settings-search-result {
    padding-block: 0.5rem;
}

/**
 * Keep this style and the one below similar for maximum end-user comprehension.
 */
#settings .settings-tab.active-settings-result-tab {
    border: 1px groove var(--info);
    box-shadow: inset 1.15rem 0 10px 2px var(--info);
    background-color: color-mix(in oklab, var(--info) 30%, var(--light));
    text-decoration: underline;
}

#settings .active-settings-search-result {
    border: 1px groove var(--info);
    box-shadow: inset 1.15rem 0 10px 2px var(--info);
    border-radius: 8px;
}
</style>
