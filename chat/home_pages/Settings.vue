<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
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

        <div class="d-flex flex-row flex-wrap justify-content-center mb-1" style="gap: 0.5rem">
            <button v-for="entry in [
                    l('settings.tabs.general'),
                    l('settings.tabs.notifications'),
                    l('settings.tabs.bonus'),
                    l('settings.tabs.filters'),
                    l('settings.tabs.hideAds'),
                    l('settings.tabs.browser'),
                    l('settings.tabs.import'),
                ]"
                :key="entry" class="btn btn-primary"
                :class="{ active: activeCollapse === entry }"
                @click.prevent="openSection(entry)"
            >
                {{ entry }}
            </button>
        </div>
    </template>

    <template v-slot:default>
        <collapse :id="tab0name" :ref="tab0name" :title="tab0name" :initial="false" class="mb-4 mt-4">
            <text-input setting="disallowedTags" :validator="vdDisallowedTags" :transformer="tfDisallowedTags"></text-input>
            <checkbox setting="clickOpensMessage"></checkbox>

            <checkbox setting="enterSend"></checkbox>
            <checkbox setting="secondEnterSend" :disabled="!settings.enterSend"></checkbox>

            <checkbox setting="showAvatars"></checkbox>
            <checkbox setting="colorBookmarks"></checkbox>
            <checkbox setting="animatedEicons"></checkbox>

            <number   setting="idleTimer" :default="idleTimerDefault" :localArgs="idleTimerArgs" :min="idleTimerMin" :max="idleTimerMax"></number>

            <checkbox setting="messageSeparators"></checkbox>
            <checkbox setting="bbCodeBar"></checkbox>

            <checkbox setting="logMessages"></checkbox>
            <checkbox setting="logChannels" :disabled="!settings.logMessages"></checkbox>
            <checkbox setting="logAds"      :disabled="!settings.logMessages"></checkbox>

            <number   setting="fontSize" :default="fontSizeDefault" :localArgs="fontSizeArgs" :min="fontSizeMin" :max="fontSizeMax"></number>
        </collapse>
        <collapse :id="tab1name" :ref="tab1name" :title="tab1name" :initial="false" class="mb-4">
            <checkbox setting="playSound"></checkbox>
            <checkbox setting="alwaysNotify" :disabled="!settings.playSound"></checkbox>
            <range    setting="notifyVolume" :localArgs="notifyVolumeArgs" :marks="notifyVolumeMarks" :disabled="!settings.playSound"></range>
            <checkbox setting="notifications"></checkbox>

            <div class="form-group"><hr></div>

            <dropdown setting="notifyFriendSignIn" :options="relationshipMap"></dropdown>
            <dropdown setting="notifyOnFriendMessage" :options="relationshipMap"></dropdown>
            <!-- show global highlights here. -->
            <checkbox setting="highlight"></checkbox>
            <text-input setting="highlightWords" :validator="vdHighlightString" :transformer="tfHighlightString"></text-input>
            <!--
            <text-input setting="highlightUsernames" :validator="tfHighlightUsernames" :transformer="tfHighlightUsernames"></text-input>
            -->

            <div class="form-group"><hr></div>

            <checkbox setting="showBroadcastsInPMs"></checkbox>
            <checkbox setting="showNeedsReply"></checkbox>
            <checkbox setting="joinMessages"></checkbox>
            <checkbox setting="eventMessages"></checkbox>
        </collapse>
        <collapse :id="tab2name" :ref="tab2name" :title="tab2name" :initial="false" class="mb-4">
            <h5>{{l('rising.header.matching')}}</h5>

            <checkbox setting="risingAdScore"></checkbox>
            <checkbox setting="expensiveMemberList"></checkbox>
            <checkbox setting="risingComparisonInUserMenu"></checkbox>
            <checkbox setting="risingComparisonInSearch"></checkbox>

            <h5>{{l('rising.header.preview')}}</h5>

            <checkbox setting="risingLinkPreview"></checkbox>
            <range setting="linkPreviewVolume" :localArgs="linkVolumeArgs" :marks="linkVolumeMarks" :disabled="!settings.risingLinkPreview"></range>
            <checkbox setting="risingCharacterPreview"></checkbox>

            <h5>{{l('rising.header.profile')}}</h5>

            <checkbox setting="risingAutoCompareKinks"></checkbox>
            <checkbox setting="risingAutoExpandCustomKinks"></checkbox>

            <h5>{{l('rising.header.misc')}}</h5>

            <checkbox setting="risingShowUnreadOfflineCount"></checkbox>
            <checkbox setting="risingColorblindMode"></checkbox>
            <checkbox setting="risingShowPortraitNearInput"></checkbox>
            <checkbox setting="risingShowPortraitInMessage"></checkbox>
            <dropdown setting="risingCharacterTheme">
                <option value="">{{ l('rising.theme.default') }}</option>
                <option disabled>---</option>
                <option v-for="theme in risingAvailableThemes" :value="theme">
                    {{ theme }}
                </option>
            </dropdown>
        </collapse>
        <collapse :id="tab3name" :ref="tab3name" :title="tab3name" :initial="false" class="mb-4">
            <div class="warning">
                <h5>{{l('rising.header.dangerZone')}}</h5>
                <p>{{ l('rising.header.desc') }}</p>
                <p>{{l('rising.filter.warning')}}</p>
            </div>

            <div>
                <h5>{{ l('rising.header.visibility') }}</h5>
                <p>{{ l('rising.header.naTo') }}</p>
                <p><small>{{ l('rising.header.visibilityCaveat') }}</small></p>
            </div>

            <template v-for="e in [
                'hideAds',
                'hideSearchResults',
                'hideChannelMembers',
                'hidePublicChannelMessages', 'hidePrivateChannelMessages',
                'hidePrivateMessages',
                'showFilterIcon',
                'autoReply',
                'penalizeMatches', 'rewardNonMatches',
            ]">
                <generic-check :obj="settings.risingFilter" :setting="e" prefix="risingFilter"></generic-check>
            </template>

            <h5>{{l('rising.header.match')}}</h5>

            <generic-num :obj="settings.risingFilter"
                setting="minAge" prefix="risingFilter" :min="0"></generic-num>
            <generic-num :obj="settings.risingFilter"
                setting="maxAge" prefix="risingFilter" :min="0"></generic-num>

            <template v-for="(_, k) in smartFilterTypes">
                <generic-check :obj="settings.risingFilter.smartFilters"
                    :setting="k" prefix="smartFilters"></generic-check>
            </template>

            <h5>{{l('rising.header.exceptionList')}}</h5>

            <generic-text :obj="settings.risingFilter"
                setting="exceptionNames" prefix="risingFilter"></generic-text>
        </collapse>
        <collapse :id="tab4name" :ref="tab4name" :title="tab4name" :initial="false" class="mb-4">
            <h5>{{ l('settings.hideAds.title') }}</h5>
            <div>{{ l('settings.hideAds.desc') }}</div>
            <template v-if="hidden.length">
                <div v-for="(user, i) in hidden">
                    <span class="fa fa-times" style="cursor:pointer" @click.stop="hidden.splice(i, 1)"></span>
                    {{user}}
                </div>
            </template>
            <template v-else>
                {{l('settings.hideAds.empty')}}
            </template>
        </collapse>
        <collapse :id="tab5name" :ref="tab5name" :title="tab5name" :initial="false" class="mb-4">
            <custom-browser-settings></custom-browser-settings>
        </collapse>
        <collapse :id="tab6name" :ref="tab6name" :title="tab6name" :initial="false" class="mb-4">
            <div class="form-label">{{ l('settings.import.desc') }}</div>
            <div class="form-group d-flex">
                <select id="import" class="form-control" v-model="importCharacter" style="flex:1;margin-right:10px">
                    <option value="">{{l('settings.import.selectCharacter')}}</option>
                    <option v-for="character in availableImports" :value="character">{{character}}</option>
                </select>
                <button class="btn btn-secondary" @click="doImport" :disabled="!importCharacter">
                    {{l('settings.import')}}
                </button>
            </div>
        </collapse>
    </template>
</page>
</template>

<script lang="ts">
import * as fs from 'fs';
import * as path from 'path';

import Vue from 'vue';
import { Component, Hook } from '@frolic/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import Collapse from '../../components/collapse.vue';

import Checkbox from './settings/Checkbox.vue';
import GenericCheckbox from './settings/GenericCheckbox.vue';
import TextInput from './settings/TextInput.vue';
import GenericText from './settings/GenericText.vue';
import NumberInput from './settings/Number.vue';
import GenericNumber from './settings/GenericNumber.vue';
import Range from './settings/Range.vue';
import Dropdown from './settings/Dropdown.vue';

import BrowserSettings from './Settings-CustomBrowserPage.vue';

import { Settings as SettingsInterface, Relation } from '../interfaces';
import { /* SmartFilterSelection, */ smartFilterTypes as smartFilterTypesImport } from '../../learn/filter/types';

import core from '../core';
import l from '../localize';

@Component({
    components: {
        page: HomePageLayout,
        collapse: Collapse,

        checkbox: Checkbox,
        'generic-check': GenericCheckbox,
        'text-input': TextInput,
        'generic-text': GenericText,
        number: NumberInput,
        'generic-num': GenericNumber,
        range: Range,
        dropdown: Dropdown,

        'custom-browser-settings': BrowserSettings,
    }
})
export default class Settings extends Vue {
    l = l;

    generalSettings = core.state.generalSettings;
    settings = core.state.settings;

    tab0name = l('settings.tabs.general');
    tab1name = l('settings.tabs.notifications');
    tab2name = l('settings.tabs.bonus');
    tab3name = l('settings.tabs.filters');
    tab4name = l('settings.tabs.hideAds');
    tab5name = l('settings.tabs.browser');
    tab6name = l('settings.tabs.import');

    get tabNames() {
        return [ this.tab0name, this.tab1name, this.tab2name, this.tab3name, this.tab4name, this.tab5name, this.tab6name ];
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

    @Hook('mounted')
    async onMount() {
        // Tab 2
        this.risingAvailableThemes = this.getAvailableThemes();

        // Tab 7
        this.availableImports = await this.getAvailableImports();
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

    get disallowedTags() { return this.settings.disallowedTags.join(',') }
    get highlightWords() { return this.settings.highlightWords.join(',') }

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

    /**
     * Tab 1
     */
    notifyVolumeMarks = [  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ];
    notifyVolumeArgs = { help: [  '0',  '100' ] };

    get relationshipMap() {
        return Object.values(Relation.Chooser)
            // ts sucks at this type-narrowing, but it works.
            .filter(v => typeof v === 'number')
            .map(v => [ v, l(Relation.Label[v as Relation.Chooser]) ]);
    }

    /**
     * Tab 2
     */
    linkVolumeMarks   = [  0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100 ];
    linkVolumeArgs   = { help: [  '0',  '100' ] };

    risingAvailableThemes: ReadonlyArray<string> = [];

    getAvailableThemes = () => {
        return fs.readdirSync(path.join(__dirname, 'themes'))
            .filter(file => file.slice(-4) === '.css')
            .map(file => file.slice(0, -4));
            // In the event we want to capitalize the entries...
            //.map(name => name.charAt(0).toUpperCase() + name.slice(1));
    }

    /**
     * Tab 3
     */
    smartFilterTypes = smartFilterTypesImport;

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

    getAvailableImports = async () => { return (await core.settingsStore.getAvailableCharacters()).filter(c => c !== core.connection.character) }

    async doImport(): Promise<void> {
        if (!confirm(l('settings.import.confirm', this.importCharacter, core.connection.character))) {
            return;
        }

        const importKey = async (key: keyof SettingsInterface.Keys) => {
            const settings = await core.settingsStore.get(key, this.importCharacter);

            if (settings !== undefined)
                await core.settingsStore.set(key, settings);
        };

        await importKey('settings');
        await importKey('pinned');
        await importKey('modes');
        await importKey('conversationSettings');
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
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 3px;

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
</style>
