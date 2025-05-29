<template>
    <modal :action="l('settings.action')" @submit="submit" @open="load()" id="settings" dialogClass="w-100">
        <tabs style="flex-shrink:0;margin-bottom:10px" v-model="selectedTab"
            :tabs="[l('settings.tabs.general'), l('settings.tabs.notifications'), l('settings.tabs.bonus'), l('settings.tabs.filters'), l('settings.tabs.hideAds'), l('settings.tabs.import')]"></tabs>
        <div v-show="selectedTab === '0'">
            <div class="form-group">
                <label class="control-label" for="disallowedTags">{{l('settings.disallowedTags')}}</label>
                <input id="disallowedTags" class="form-control" v-model="disallowedTags"/>
            </div>
            <div class="form-group">
                <label class="control-label" for="clickOpensMessage">
                    <input type="checkbox" id="clickOpensMessage" v-model="clickOpensMessage"/>
                    {{l('settings.clickOpensMessage')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="enterSend">
                    <input type="checkbox" id="enterSend" v-model="enterSend"/>
                    {{l('settings.enterSend')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="showAvatars">
                    <input type="checkbox" id="showAvatars" v-model="showAvatars"/>
                    {{l('settings.showAvatars')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="colorBookmarks">
                    <input type="checkbox" id="colorBookmarks" v-model="colorBookmarks"/>
                    {{l('settings.colorBookmarks')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="animatedEicons">
                    <input type="checkbox" id="animatedEicons" v-model="animatedEicons"/>
                    {{l('settings.animatedEicons')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="idleTimer">{{l('settings.idleTimer')}}</label>
                <input id="idleTimer" class="form-control" type="number" v-model="idleTimer" min="0" max="1440"/>
            </div>
            <div class="form-group">
                <label class="control-label" for="messageSeparators">
                    <input type="checkbox" id="messageSeparators" v-model="messageSeparators"/>
                    {{l('settings.messageSeparators')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="bbCodeBar">
                    <input type="checkbox" id="bbCodeBar" v-model="bbCodeBar"/>
                    {{l('settings.bbCodeBar')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="logMessages">
                    <input type="checkbox" id="logMessages" v-model="logMessages"/>
                    {{l('settings.logMessages')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="logAds">
                    <input type="checkbox" id="logAds" v-model="logAds"/>
                    {{l('settings.logAds')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="fontSize">{{l('settings.fontSize')}}</label>
                <input id="fontSize" type="number" min="10" max="24" class="form-control" v-model="fontSize"/>
            </div>
        </div>
        <div v-show="selectedTab === '1'">
            <div class="form-group">
                <label class="control-label" for="playSound">
                    <input type="checkbox" id="playSound" v-model="playSound"/>
                    {{l('settings.playSound')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="alwaysNotify">
                    <input type="checkbox" id="alwaysNotify" v-model="alwaysNotify" :disabled="!playSound"/>
                    {{l('settings.alwaysNotify')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="notifications">
                    <input type="checkbox" id="notifications" v-model="notifications"/>
                    {{l('settings.notifications')}}
                </label>
            </div>
            <div class="form-group"><hr></div>
            <div class="form-group">
                <label class="control-label" :for="notifyFriendSignIn">
                    {{l('settings.friendSignIn')}}
                </label>
                <select class="form-control" :id="notifyFriendSignIn" v-model="notifyFriendSignIn">
                    <option :value="friendchooser.Friends">{{l('conversationSettings.friendsOnly')}}</option>
                    <option :value="friendchooser.Bookmarks">{{l('conversationSettings.bookmarksOnly')}}</option>
                    <option :value="friendchooser.Both">{{l('conversationSettings.friendsAndBookmarks')}}</option>
                    <option :value="friendchooser.NoOne">{{l('conversationSettings.noOne')}}</option>
                </select>
            </div>
            <div class="form-group">
                <label class="control-label" :for="notifyOnFriendMessage">
                    {{l('settings.friendMessageNotification')}}
                </label>
                <select class="form-control" :id="notifyOnFriendMessage" v-model="notifyOnFriendMessage">
                    <option :value="friendchooser.Friends">{{l('conversationSettings.friendsOnly')}}</option>
                    <option :value="friendchooser.Bookmarks">{{l('conversationSettings.bookmarksOnly')}}</option>
                    <option :value="friendchooser.Both">{{l('conversationSettings.friendsAndBookmarks')}}</option>
                    <option :value="friendchooser.NoOne">{{l('conversationSettings.noOne')}}</option>
                </select>
            </div>
            <div class="form-group">
                <label class="control-label" for="highlight">
                    <input type="checkbox" id="highlight" v-model="highlight"/>
                    {{l('settings.highlight')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="highlightWords">{{l('settings.highlightWords')}}</label>
                <input id="highlightWords" class="form-control" v-model="highlightWords"/>
            </div>
            <div class="form-group"><hr></div>
            <div class="form-group">
                <label class="control-label" for="showBroadcastsInPMs">
                    <input type="checkbox" id="showBroadcastsInPMs" v-model="showBroadcastsInPMs"/>
                    {{l('settings.showBroadcastsInPMs')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="showNeedsReply">
                    <input type="checkbox" id="showNeedsReply" v-model="showNeedsReply"/>
                    {{l('settings.showNeedsReply')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="joinMessages">
                    <input type="checkbox" id="joinMessages" v-model="joinMessages"/>
                    {{l('settings.joinMessages')}}
                </label>
            </div>
            <div class="form-group">
                <label class="control-label" for="eventMessages">
                    <input type="checkbox" id="eventMessages" v-model="eventMessages"/>
                    {{l('settings.eventMessages')}}
                </label>
            </div>
        </div>
        <div v-show="selectedTab === '2'">
            <h5>{{l('rising.header.matching')}}</h5>

            <div class="form-group">
                <label class="control-label" for="risingAdScore">
                    <input type="checkbox" id="risingAdScore" v-model="risingAdScore"/>
                    {{l('rising.match.colorizeCompat')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingComparisonInUserMenu">
                    <input type="checkbox" id="risingComparisonInUserMenu" v-model="risingComparisonInUserMenu"/>
                    {{l('rising.match.showOnRightClick')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingComparisonInSearch">
                    <input type="checkbox" id="risingComparisonInSearch" v-model="risingComparisonInSearch"/>
                    {{l('rising.match.showInSearch')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="experimentalOrientationMatching">
                    <input type="checkbox" id="experimentalOrientationMatching" v-model="experimentalOrientationMatching"/>
                    <b> {{ l('general.experiment') }}</b> {{ l('settings.experiment.orientationMatching') }}
                </label>
                <div v-if="experimentalOrientationMatching">
                    <small>{{ l('settings.experiment.orientationMatching.selectedInfo') }}</small>
                    <br>
                    <small>{{ l('general.feedback') }}</small>
                </div>
            </div>

            <div class="form-group">
                <label class="control-label" for="relaxPostLengthMatching">
                    <input type="checkbox" id="relaxPostLengthMatching" v-model="relaxPostLengthMatching"/>
                    {{ l('settings.match.relaxlength') }}
                </label>
                <small v-if="relaxPostLengthMatching">
                    <br />
                    {{ l('settings.match.relaxlength.selectedInfo') }}
                </small>
            </div>

<!--            <div class="form-group">-->
<!--                <label class="control-label" for="hideProfileComparisonSummary">-->
<!--                    <input type="checkbox" id="hideProfileComparisonSummary" :checked="!hideProfileComparisonSummary" @input="hideProfileComparisonSummary = !$event.target.checked"/>-->
<!--                    Show quick match results at the top of the character profile-->
<!--                </label>-->
<!--            </div>-->


            <h5>{{l('rising.header.preview')}}</h5>

            <div class="form-group">
                <label class="control-label" for="risingLinkPreview">
                    <input type="checkbox" id="risingLinkPreview" v-model="risingLinkPreview"/>
                    {{l('rising.preview.showLinkPopup')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingCharacterPreview">
                    <input type="checkbox" id="risingCharacterPreview" v-model="risingCharacterPreview"/>
                    {{l('rising.preview.showCharacterPopup')}}
                </label>
            </div>


            <h5>{{l('rising.header.profile')}}</h5>

            <div class="form-group">
                <label class="control-label" for="risingAutoCompareKinks">
                    <input type="checkbox" id="risingAutoCompareKinks" v-model="risingAutoCompareKinks"/>
                    {{l('rising.profile.compareKinks')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingAutoExpandCustomKinks">
                    <input type="checkbox" id="risingAutoExpandCustomKinks" v-model="risingAutoExpandCustomKinks"/>
                    {{l('rising.profile.expandCustoms')}}
                </label>
            </div>

            <h5>{{l('rising.header.misc')}}</h5>

            <div class="form-group">
                <label class="control-label" for="risingShowUnreadOfflineCount">
                    <input type="checkbox" id="risingShowUnreadOfflineCount" v-model="risingShowUnreadOfflineCount"/>
                    {{l('rising.misc.showUnread')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingColorblindMode">
                    <input type="checkbox" id="risingColorblindMode" v-model="risingColorblindMode"/>
                    {{l('rising.misc.colorblind')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingShowPortraitNearInput">
                    <input type="checkbox" id="risingShowPortraitNearInput" v-model="risingShowPortraitNearInput"/>
                    {{l('rising.misc.yourPortrait')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingShowPortraitInMessage">
                    <input type="checkbox" id="risingShowPortraitInMessage" v-model="risingShowPortraitInMessage"/>
                    {{l('rising.misc.chatPortrait')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingShowHighQualityPortraits">
                    <input type="checkbox" id="risingShowHighQualityPortraits" v-model="risingShowHighQualityPortraits"/>
                    {{l('rising.misc.risingPortraits')}}
                </label>
            </div>

            <div class="form-group">
                <label class="control-label" for="risingCharacterTheme">
                    {{l('rising.theme.select')}}
                    <select id="risingCharacterTheme" class="form-control" v-model="risingCharacterTheme" style="flex:1;margin-right:10px">
                        <option value=undefined>{{l('rising.theme.default')}}</option>
                        <option disabled>---</option>
                        <option v-for="theme in risingAvailableThemes" :value="theme">
                            {{theme}}
                        </option>
                    </select>
                </label>
            </div>
        </div>

        <div v-show="selectedTab === '3'">
            <div class="warning">
              <h5>{{l('rising.header.dangerZone')}}</h5>
              <div>{{l('rising.filter.warning')}}</div>
              <div>{{l('rising.filter.adminWarning')}}</div>
              <div>{{l('rising.filter.naToFriends')}}</div>
              <div>{{l('rising.filter.beta')}}</div>
            </div>

            <div>
                <h5>{{ l('rising.header.visibility') }}</h5>
                <p><small>{{ l('rising.header.visibilityCaveat') }}</small></p>
            </div>

            <div class="form-group filters">
                <label class="control-label" for="risingFilter.hideAds">
                    <input type="checkbox" id="risingFilter.hideAds" v-model="risingFilter.hideAds" />
                    {{l('rising.filter.hideAds')}}
                </label>

                <label class="control-label" for="risingFilter.hideSearchResults">
                    <input type="checkbox" id="risingFilter.hideSearchResults" v-model="risingFilter.hideSearchResults" />
                    {{l('rising.filter.hideSearch')}}
                </label>

                <label class="control-label" for="risingFilter.hideChannelMembers">
                    <input type="checkbox" id="risingFilter.hideChannelMembers" v-model="risingFilter.hideChannelMembers"/>
                    {{l('rising.filter.hideMembers')}}
                </label>

                <label class="control-label" for="risingFilter.hidePublicChannelMessages">
                    <input type="checkbox" id="risingFilter.hidePublicChannelMessages" v-model="risingFilter.hidePublicChannelMessages"/>
                    {{l('rising.filter.hidePubChat')}}
                </label>

                <label class="control-label" for="risingFilter.hidePrivateChannelMessages">
                    <input type="checkbox" id="risingFilter.hidePrivateChannelMessages" v-model="risingFilter.hidePrivateChannelMessages"/>
                     {{l('rising.filter.hidePrivChat')}}
                </label>

                <label class="control-label" for="risingFilter.hidePrivateMessages">
                    <input type="checkbox" id="risingFilter.hidePrivateMessages" v-model="risingFilter.hidePrivateMessages"/>
                     {{l('rising.filter.hidePMs')}}
                </label>

                <label class="control-label" for="risingFilter.showFilterIcon">
                    <input type="checkbox" id="risingFilter.showFilterIcon" v-model="risingFilter.showFilterIcon"/>
                     {{l('rising.filter.showIcon')}}
                </label>
            </div>

            <div class="form-group filters">
                <label class="control-label" for="risingFilter.autoReply">
                    <input type="checkbox" id="risingFilter.autoReply" v-model="risingFilter.autoReply"/>
                     {{l('rising.filter.automate')}}
                </label>

                <label class="control-label" for="risingFilter.penalizeMatches">
                    <input type="checkbox" id="risingFilter.penalizeMatches" v-model="risingFilter.penalizeMatches"/>
                     {{l('rising.filter.penalize')}}
                </label>

                <label class="control-label" for="risingFilter.rewardNonMatches">
                    <input type="checkbox" id="risingFilter.rewardNonMatches" v-model="risingFilter.rewardNonMatches"/>
                     {{l('rising.filter.reward')}}
                </label>
            </div>

            <h5>{{l('rising.header.ageMatch')}}</h5>
            <div class="form-group">{{l('rising.age.match')}}</div>

            <div class="form-group">
                <label class="control-label" for="risingFilter.minAge">
                    {{l('rising.age.min')}}
                </label>
                <input id="risingFilter.minAge" type="number" class="form-control" v-model="risingFilter.minAge" :placeholder="l('rising.age.enter')" />

                <label class="control-label" for="risingFilter.maxAge">
                    {{l('rising.age.max')}}
                </label>
                <input id="risingFilter.maxAge" type="number" class="form-control" v-model="risingFilter.maxAge" :placeholder="l('rising.age.enter')" />
            </div>

            <h5>{{l('rising.header.typeMatch')}}</h5>
            <div class="form-group filters" >
                <label class="control-label" :for="'risingFilter.smartFilters.' + key" v-for="(value, key) in smartFilterTypes">
                    <input type="checkbox" :id="'risingFilter.smartFilters.' + key" v-bind:checked="getSmartFilter(key)" @change="v => setSmartFilter(key, v)"/>
                    {{value.name}}
                </label>
            </div>

            <h5>{{l('rising.header.exceptionList')}}</h5>
            <div class="form-group">{{l('rising.exceptions')}}</div>

            <div class="form-group">
                <textarea class="form-control" :value="getExceptionList()" @change="setExceptionList" :placeholder="l('rising.exceptions.ph')"></textarea>
            </div>
        </div>


        <div v-show="selectedTab === '4'">
            <template v-if="hidden.length">
                <div v-for="(user, i) in hidden">
                    <span class="fa fa-times" style="cursor:pointer" @click.stop="hidden.splice(i, 1)"></span>
                    {{user}}
                </div>
            </template>
            <template v-else>{{l('settings.hideAds.empty')}}</template>
        </div>
        <div v-show="selectedTab === '5'" style="display:flex;padding-top:10px">
            <select id="import" class="form-control" v-model="importCharacter" style="flex:1;margin-right:10px">
                <option value="">{{l('settings.import.selectCharacter')}}</option>
                <option v-for="character in availableImports" :value="character">{{character}}</option>
            </select>
            <button class="btn btn-secondary" @click="doImport" :disabled="!importCharacter">
                {{l('settings.import')}}
            </button>
        </div>
    </modal>
</template>

<script lang="ts">
    import * as fs from 'fs';
    import * as path from 'path';
    import {Component} from '@f-list/vue-ts';
    import CustomDialog from '../components/custom_dialog';
    import Modal from '../components/Modal.vue';
    import Tabs from '../components/tabs';
    import core from './core';
    import {Settings as SettingsInterface} from './interfaces';
    import {Conversation} from './interfaces';
    import l from './localize';
    import { SmartFilterSettings, SmartFilterSelection, smartFilterTypes as smartFilterTypesOrigin } from '../learn/filter/types';
    import _ from 'lodash';
    import { matchesSmartFilters } from '../learn/filter/smart-filter';
    import { EventBus } from './preview/event-bus';

    @Component({
        components: {modal: Modal, tabs: Tabs}
    })
    export default class SettingsView extends CustomDialog {
        l = l;
        availableImports: ReadonlyArray<string> = [];
        selectedTab = '0';
        importCharacter = '';
        playSound!: boolean;
        clickOpensMessage!: boolean;
        disallowedTags!: string;
        notifications!: boolean;
        friendchooser = Conversation.RelationChooser;
        notifyFriendSignIn!: Conversation.RelationChooser;
        notifyOnFriendMessage!: Conversation.RelationChooser;
        highlight!: boolean;
        highlightWords!: string;
        highlightUsers!: boolean;
        showBroadcastsInPMs!: boolean;
        showAvatars!: boolean;
        animatedEicons!: boolean;
        idleTimer!: string;
        messageSeparators!: boolean;
        eventMessages!: boolean;
        joinMessages!: boolean;
        alwaysNotify!: boolean;
        logMessages!: boolean;
        logAds!: boolean;
        fontSize!: string;
        showNeedsReply!: boolean;
        enterSend!: boolean;
        colorBookmarks!: boolean;
        bbCodeBar!: boolean;

        risingAdScore!: boolean;
        risingLinkPreview!: boolean;
        risingAutoCompareKinks!: boolean;

        risingAutoExpandCustomKinks!: boolean;
        risingCharacterPreview!: boolean;
        risingComparisonInUserMenu!: boolean;
        risingComparisonInSearch!: boolean;
        experimentalOrientationMatching!: boolean;
        relaxPostLengthMatching!: boolean;

        risingShowUnreadOfflineCount!: boolean;
        risingColorblindMode!: boolean;

        risingShowPortraitNearInput!: boolean;
        risingShowPortraitInMessage!: boolean;
        risingShowHighQualityPortraits!: boolean;

        risingFilter: SmartFilterSettings = {} as any;

        risingAvailableThemes: ReadonlyArray<string> = [];
        risingCharacterTheme!: string | undefined;

        smartFilterTypes = smartFilterTypesOrigin;

        async load(): Promise<void> {
            const settings = core.state.settings;
            this.playSound = settings.playSound;
            this.clickOpensMessage = settings.clickOpensMessage;
            this.disallowedTags = settings.disallowedTags.join(',');
            this.notifications = settings.notifications;
            this.notifyOnFriendMessage = settings.notifyOnFriendMessage;
            this.highlight = settings.highlight;
            this.highlightWords = settings.highlightWords.join(',');
            this.highlightUsers = settings.highlightUsers;
            this.showBroadcastsInPMs = settings.showBroadcastsInPMs;
            this.showAvatars = settings.showAvatars;
            this.animatedEicons = settings.animatedEicons;
            this.idleTimer = settings.idleTimer.toString();
            this.messageSeparators = settings.messageSeparators;
            this.eventMessages = settings.eventMessages;
            this.joinMessages = settings.joinMessages;
            this.alwaysNotify = settings.alwaysNotify;
            this.notifyOnFriendMessage = settings.notifyOnFriendMessage;
            this.logMessages = settings.logMessages;
            this.logAds = settings.logAds;
            this.fontSize = settings.fontSize.toString();
            this.showNeedsReply = settings.showNeedsReply;
            this.enterSend = settings.enterSend;
            this.colorBookmarks = settings.colorBookmarks;
            this.bbCodeBar = settings.bbCodeBar;
            this.availableImports = (await core.settingsStore.getAvailableCharacters()).filter((x) => x !== core.connection.character);

            // settings.rising

            this.risingAdScore = settings.risingAdScore;
            this.risingLinkPreview = settings.risingLinkPreview;
            this.risingAutoCompareKinks = settings.risingAutoCompareKinks;

            this.risingAutoExpandCustomKinks = settings.risingAutoExpandCustomKinks;
            this.risingCharacterPreview = settings.risingCharacterPreview;
            this.risingComparisonInUserMenu = settings.risingComparisonInUserMenu;
            this.risingComparisonInSearch = settings.risingComparisonInSearch;
            this.experimentalOrientationMatching = settings.experimentalOrientationMatching;
            this.relaxPostLengthMatching = settings.relaxPostLengthMatching;
            this.risingShowUnreadOfflineCount = settings.risingShowUnreadOfflineCount;

            this.risingColorblindMode = settings.risingColorblindMode;
            this.risingShowPortraitNearInput = settings.risingShowPortraitNearInput;
            this.risingShowPortraitInMessage = settings.risingShowPortraitInMessage;
            this.risingShowHighQualityPortraits = settings.risingShowHighQualityPortraits;

            this.notifyFriendSignIn = settings.notifyFriendSignIn;

            this.risingFilter = settings.risingFilter;

            this.risingAvailableThemes = fs.readdirSync(path.join(__dirname, 'themes')).filter((x) => x.slice(-4) === '.css').map((x) => x.slice(0, -4));
            this.risingCharacterTheme = settings.risingCharacterTheme;
        }

        async doImport(): Promise<void> {
            if(!confirm(l('settings.import.confirm', this.importCharacter, core.connection.character))) return;
            const importKey = async(key: keyof SettingsInterface.Keys) => {
                const settings = await core.settingsStore.get(key, this.importCharacter);
                if(settings !== undefined) await core.settingsStore.set(key, settings);
            };
            await importKey('settings');
            await importKey('pinned');
            await importKey('modes');
            await importKey('conversationSettings');
            core.connection.close(false);
        }

        get hidden(): string[] {
            return core.state.hiddenUsers;
        }

        async submit(): Promise<void> {
            const oldRisingFilter = JSON.parse(JSON.stringify(core.state.settings.risingFilter));

            const idleTimer = parseInt(this.idleTimer, 10);
            const fontSize = parseFloat(this.fontSize);

            const minAge = this.getAsNumber(this.risingFilter.minAge);
            const maxAge = this.getAsNumber(this.risingFilter.maxAge);

            core.state.settings = {
                playSound: this.playSound,
                clickOpensMessage: this.clickOpensMessage,
                disallowedTags: this.disallowedTags.split(',').map((x) => x.trim()).filter((x) => x.length),
                notifications: this.notifications,
                notifyOnFriendMessage: this.notifyOnFriendMessage,
                highlight: this.highlight,
                highlightWords: this.highlightWords.split(',').map((x) => x.trim()).filter((x) => x.length),
                highlightUsers: this.highlightUsers,
                showBroadcastsInPMs: this.showBroadcastsInPMs,
                showAvatars: this.showAvatars,
                animatedEicons: this.animatedEicons,
                idleTimer: isNaN(idleTimer) ? 0 : idleTimer < 0 ? 0 : idleTimer > 1440 ? 1440 : idleTimer,
                messageSeparators: this.messageSeparators,
                eventMessages: this.eventMessages,
                joinMessages: this.joinMessages,
                alwaysNotify: this.alwaysNotify,
                logMessages: this.logMessages,
                logAds: this.logAds,
                fontSize: isNaN(fontSize) ? 14 : fontSize < 10 ? 10 : fontSize > 24 ? 24 : fontSize,
                showNeedsReply: this.showNeedsReply,
                enterSend: this.enterSend,
                colorBookmarks: this.colorBookmarks,
                bbCodeBar: this.bbCodeBar,

                risingAdScore: this.risingAdScore,
                risingLinkPreview: this.risingLinkPreview,
                risingAutoCompareKinks: this.risingAutoCompareKinks,

                risingAutoExpandCustomKinks: this.risingAutoExpandCustomKinks,
                risingCharacterPreview: this.risingCharacterPreview,
                risingComparisonInUserMenu: this.risingComparisonInUserMenu,
                risingComparisonInSearch: this.risingComparisonInSearch,
                experimentalOrientationMatching: this.experimentalOrientationMatching,
                relaxPostLengthMatching: this.relaxPostLengthMatching,

                risingShowUnreadOfflineCount: this.risingShowUnreadOfflineCount,
                risingShowPortraitNearInput: this.risingShowPortraitNearInput,
                risingShowPortraitInMessage: this.risingShowPortraitInMessage,
                risingShowHighQualityPortraits: this.risingShowHighQualityPortraits,

                notifyFriendSignIn: this.notifyFriendSignIn,

                risingColorblindMode: this.risingColorblindMode,
                risingFilter: {
                    ...this.risingFilter,
                    minAge: (minAge !== null && maxAge !== null) ? Math.min(minAge, maxAge) : minAge,
                    maxAge: (minAge !== null && maxAge !== null) ? Math.max(minAge, maxAge) : maxAge
                },

                risingCharacterTheme: this.risingCharacterTheme != "undefined" ? this.risingCharacterTheme : undefined
            };

            console.log('SETTINGS', minAge, maxAge, core.state.settings);

            const newRisingFilter = JSON.parse(JSON.stringify(core.state.settings.risingFilter));

            if (!_.isEqual(oldRisingFilter, newRisingFilter)) {
                this.rebuildFilters();
            }

            if(this.notifications) await core.notifications.requestPermission();

            EventBus.$emit('configuration-update', core.state.settings);
            EventBus.$emit('own-profile-update', { profile: core.characters.ownProfile });
        }

        rebuildFilters() {
            core.cache.profileCache.onEachInMemory(
                c => {
                    const oldFiltered = c.match.isFiltered;

                    c.match.isFiltered = matchesSmartFilters(c.character.character, core.state.settings.risingFilter);

                    if (oldFiltered !== c.match.isFiltered) {
                        core.cache.populateAllConversationsWithScore(c.character.character.name, c.match.matchScore, c.match.isFiltered);
                    }
                }
            );
        }

        getAsNumber(input: any): number | null {
            if (input === null || input === undefined || input === '')
                return null;

            const n = parseInt(input, 10);

            return !Number.isNaN(n) && Number.isFinite(n) ? n : null;
        }

        getExceptionList(): string {
            return this.risingFilter.exceptionNames?.join('\n') || '';
        }

        setExceptionList(v: Event): void {
            this.risingFilter.exceptionNames = (v.target as HTMLInputElement).value.split('/[\r\n]+/').map(n => n.trim());
        }

        getSmartFilter(key: keyof SmartFilterSelection): boolean {
            return !!this.risingFilter.smartFilters?.[key];
        }

        setSmartFilter(key: keyof SmartFilterSelection, v: Event): void {
            this.risingFilter.smartFilters[key] = (v.target as HTMLInputElement).checked;
        }
    }
</script>

<style lang="scss">
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
</style>
