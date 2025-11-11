<template>
    <div style="height:100%; display: flex; position: relative;" id="chatView" @click="userMenuHandle" @contextmenu="userMenuHandle" @touchstart.passive="userMenuHandle"
        @touchend="userMenuHandle">
        <sidebar id="sidebar" :label="l('chat.menu')" icon="fa-bars">
            <div class="character-header">
                <div class="image-block" v-if="showAvatars">
                    <img :src="characterImage(ownCharacter.name)" style="margin-top:5px; margin-right:5px; max-width: 100px;"/>
                </div>
                <div class="character-info">
                    <a target="_blank" :href="ownCharacterLink" class="btn character-name">
                        {{ownCharacter.name}}
                    </a>
                    <a href="#" @click.prevent="showStatus()" class="btn">
                        <span class="fas fa-fw" :class="getStatusIcon(ownCharacter.status)"></span>
                        {{l('status.' + ownCharacter.status)}}
                    </a>
                    <a href="#" @click.prevent="logOut()" class="btn">
                        <span class="fas fa-fw fa-sign-out-alt"></span>
                        {{l('chat.logout')}}
                    </a>
                </div>
            </div>

            <div>
                <a href="#" @click.prevent="showSearch()" class="btn">
                    <span class="fas fa-search"></span>
                    {{l('characterSearch.open')}}
                </a>
            </div>

            <div><a href="#" @click.prevent="showAdCenter()" class="btn">
                <span class="fas fa-ad"></span>
                {{l('chat.adEditor')}}
            </a></div>

            <div>
                <a href="#" @click.prevent="showAdLauncher()" class="btn">
                    <span class="fas fa-play"></span>
                    {{l('chat.postAds')}}
                </a>
                <span v-show="adsAreRunning()" class="adControls">
                    <span :aria-label="l('chat.stopAds')" class="fas fa-stop" @click.prevent="stopAllAds()"></span>
                </span>
            </div>

            <div v-if="env === 'development'">
                <a href="#" @click.prevent="showDevTools()" class="btn">
                    <span class="fas fa-bug"></span>
                    {{l('chat.devTools')}}
                </a>
            </div>

            <div class="nav-group-container"><!-- CONSOLE -->
                <div class="list-group conversation-nav">
                    <a :class="getHomeClasses()" href="#" @click.prevent="goHome()"
                        class="list-group-item list-group-item-action">
                        {{ l('home') }}
                    </a>
                </div>
            </div>

            <div class="nav-group-container"><!-- PMs -->
                <a href="#" @click.prevent="showAddPmPartner()" class="btn" :class="{ glowing: conversations.privateConversations.length === 0 && privateCanGlow }">
                    <span class="fas fa-comment"></span>
                    {{l('chat.pms')}}
                </a>

                <div class="list-group conversation-nav" ref="privateConversations">
                    <a v-for="conversation in conversations.privateConversations" href="#" @click.prevent="showConversation(conversation)"
                        :class="getClasses(conversation)" :data-character="conversation.character.name" data-touch="false"
                        class="list-group-item list-group-item-action item-private" :key="conversation.key"
                        @click.middle.prevent.stop="conversation.close()">
                        <img :src="characterImage(conversation.character.name)" v-if="showAvatars"/>
                        <div class="name">
                            <span>{{conversation.character.name}}</span>
                            <div class="icon-bed">
                                <span class='fa-fw online-status' :class="getOnlineStatusIconClasses(conversation)"></span>
                                <span class="fa-fw fas fa-reply" v-show="needsReply(conversation)"></span>
                                <span style="flex:1"></span>
                                <span class="pin fas fa-thumbtack" :class="{'active': conversation.isPinned}"
                                    @click="conversation.isPinned = !conversation.isPinned" :aria-label="l('chat.pinTab')"></span>
                                <span v-if="!conversation.isPinned" class="leave fas fa-times" @click.stop="conversation.close()" :aria-label="l('chat.closeTab')"></span>
                            </div>
                        </div>
                    </a>
                </div>

                <a href="#" @click.prevent="showRecent()" class="recent-conversation">
                    <span class="fas fa-history"></span>
                    {{ l('chat.recentConversations') }}
                </a>
            </div>

            <div class="nav-group-container"><!-- CHANNELS -->
                <a href="#" @click.prevent="showChannels()" class="btn">
                    <span class="fas fa-list"></span>
                    {{l('chat.channels')}}
                </a>

                <div class="list-group conversation-nav" ref="channelConversations">
                    <a v-for="conversation in conversations.channelConversations" href="#" @click.prevent="showConversation(conversation)"
                        :class="getClasses(conversation)" class="list-group-item list-group-item-action item-channel" :key="conversation.key"
                        @click.middle.prevent.stop="conversation.close()">
                        <span class="name">{{conversation.name}}</span>
                        <span>
                            <span v-if="conversation.hasAutomatedAds()" class="fas fa-ad" :class="{'active': conversation.isSendingAutomatedAds()}" :aria-label="l('chat.toggleAds')"
                            @click.stop="conversation.toggleAutomatedAds()"></span>
                            <span class="pin fas fa-thumbtack" :class="{'active': conversation.isPinned}" :aria-label="l('chat.pinTab')"
                                @click.stop="conversation.isPinned = !conversation.isPinned" @mousedown.prevent></span>
                            <span v-if="!conversation.isPinned" class="leave fas fa-times" @click.stop="conversation.close()" :aria-label="l('chat.closeTab')"></span>
                        </span>
                    </a>
                </div>

                <a href="#" @click.prevent="showChannels()" class="join-channel" :class="{ glowing: conversations.channelConversations.length === 0 && channelCanGlow }">
                    {{l('chat.joinChannel')}}
                </a>
            </div>
        </sidebar>
        <div style="display:flex;flex-direction:column;flex:1;min-width:0">
            <div id="quick-switcher" class="list-group">
                <a :class="getClasses(conversations.consoleTab)" href="#" @click.prevent="goHome()"
                    class="list-group-item list-group-item-action">
                    <span class="fas fa-home conversation-icon"></span>
                    {{conversations.consoleTab.name}}
                </a>
                <a v-for="conversation in conversations.privateConversations" href="#" @click.prevent="showConversation(conversation)"
                    :class="getClasses(conversation)" class="list-group-item list-group-item-action" :key="conversation.key">
                    <img :src="characterImage(conversation.character.name)" v-if="showAvatars"/>
                    <span class="far fa-user-circle conversation-icon" v-else></span>
                    <div class="name">{{conversation.character.name}}</div>
                </a>
                <a v-for="conversation in conversations.channelConversations" href="#" @click.prevent="showConversation(conversation)"
                    :class="getClasses(conversation)" class="list-group-item list-group-item-action" :key="conversation.key">
                    <span class="fas fa-hashtag conversation-icon"></span>
                    <div class="name">{{conversation.name}}</div>
                </a>
            </div>

            <home-screen :activeConversationClicked="currentClicked" :reportDialog="$refs['reportDialog']"></home-screen>
        </div>
        <user-list></user-list>
        <channels ref="channelsDialog"></channels>
        <status-switcher ref="statusDialog"></status-switcher>
        <character-search ref="searchDialog"></character-search>
        <adLauncher ref="adLauncher"></adLauncher>
        <adCenter ref="adCenter"></adCenter>
        <report-dialog ref="reportDialog"></report-dialog>
        <user-menu ref="userMenu" :reportDialog="$refs['reportDialog']"></user-menu>
        <recent-conversations ref="recentDialog"></recent-conversations>
        <dev-tools ref="devTools"></dev-tools>
        <image-preview ref="imagePreview"></image-preview>
        <add-pm-partner ref="addPmPartnerDialog" :switch="this.addPmPartnerSwitch"></add-pm-partner>
        <note-status v-if="coreState.settings.risingShowUnreadOfflineCount"></note-status>
    </div>
</template>

<script lang="ts">
import { Component, Hook, Watch } from '@f-list/vue-ts';

    import Sortable from 'sortablejs';

    import Vue from 'vue';
    import {Keys} from '../keys';
    import ChannelList from './ChannelList.vue';
    import CharacterSearch from './CharacterSearch.vue';
    import { getKey, profileLink } from './common';
    import HomeScreen from './UniversalHome.vue';
    import core from './core';
    import {Character, Connection, Conversation} from './interfaces';
    import l from './localize';
    import PmPartnerAdder from './PmPartnerAdder.vue';
    import RecentConversations from './RecentConversations.vue';
    import ReportDialog from './ReportDialog.vue';
    import Sidebar from './Sidebar.vue';
    import StatusSwitcher from './StatusSwitcher.vue';
    import {getStatusIcon} from './UserView.vue';
    import UserList from './UserList.vue';
    import UserMenu from './UserMenu.vue';
    import ImagePreview from './preview/ContentPreview.vue';
    import PrivateConversation = Conversation.PrivateConversation;
    import NoteStatus from '../site/NoteStatus.vue';
    import { Dialog } from '../helpers/dialog';
    import AdCenterDialog from './ads/AdCenter.vue';
    import AdLauncherDialog from './ads/AdLauncher.vue';
    import Modal from '../components/Modal.vue';

    const unreadClasses = {
        [Conversation.UnreadState.None]: '',
        [Conversation.UnreadState.Mention]: 'list-group-item-warning',
        [Conversation.UnreadState.Unread]: 'list-group-item-danger'
    };

    @Component({
        components: {
            'user-list': UserList, channels: ChannelList, 'status-switcher': StatusSwitcher, 'character-search': CharacterSearch,
            'home-screen': HomeScreen,
            'report-dialog': ReportDialog,
            sidebar: Sidebar,
            'user-menu': UserMenu, 'recent-conversations': RecentConversations,
            'image-preview': ImagePreview,
            'add-pm-partner': PmPartnerAdder,
            'note-status': NoteStatus,
            adCenter: AdCenterDialog,
            adLauncher: AdLauncherDialog,
            modal: Modal,
            ...(process.env.NODE_ENV === 'development' ? { 'dev-tools': () => import('../devtools/command_center.vue') } : {})
        }
    })
    export default class ChatView extends Vue {
        l = l;
        env = process.env.NODE_ENV;
        sidebarExpanded = false;
        characterImage = (c: string) => core.characters.getImage(c);
        conversations = core.conversations;
        getStatusIcon = getStatusIcon;
        coreState = core.state;
        keydownListener!: (e: KeyboardEvent) => void;
        focusListener!: () => void;
        blurListener!: () => void;

        channelConversations = core.conversations.channelConversations
        privateConversations = core.conversations.privateConversations

        privateCanGlow = !this.channelConversations?.length;
        channelCanGlow = !this.privateConversations?.length;

        get homeConversation(): Conversation {
            return core.state.generalSettings.defaultToHome
                ? core.conversations.activityTab
                : core.conversations.consoleTab;

        }

        @Watch('conversations.channelConversations')
        channelConversationsChange() {
          if (this.conversations.channelConversations?.length) {
            this.channelCanGlow = false;
          }
        }

        @Watch('conversations.privateConversations')
        privateConversationsChange() {
          if (this.conversations.privateConversations?.length) {
            this.privateCanGlow = false;
          }
        }

        @Hook('mounted')
        mounted(): void {
            this.keydownListener = (e: KeyboardEvent) => this.onKeyDown(e);
            window.addEventListener('keydown', this.keydownListener);
            this.setFontSize(core.state.settings.fontSize);
            Sortable.create(<HTMLElement>this.$refs['privateConversations'], {
                animation: 50,
                fallbackTolerance: 5,
                onEnd: async(e) => {
                    if(e.oldIndex === e.newIndex) return;
                    return core.conversations.privateConversations[e.oldIndex!].sort(e.newIndex!);
                }
            });
            Sortable.create(<HTMLElement>this.$refs['channelConversations'], {
                animation: 50,
                fallbackTolerance: 5,
                onEnd: async(e) => {
                    if(e.oldIndex === e.newIndex) return;
                    return core.conversations.channelConversations[e.oldIndex!].sort(e.newIndex!);
                }
            });
            const ownCharacter = core.characters.ownCharacter;
            let idleTimer: number | undefined, idleStatus: Connection.ClientCommands['STA'] | undefined, lastUpdate = 0;
            window.addEventListener('focus', this.focusListener = () => {
                core.notifications.isInBackground = false;
                if(idleTimer !== undefined) {
                    clearTimeout(idleTimer);
                    idleTimer = undefined;
                }
                if(idleStatus !== undefined) {
                    const status = idleStatus;
                    window.setTimeout(() => core.connection.send('STA', status),
                        Math.max(lastUpdate + core.connection.vars.sta_flood * 1000 + 1000 - Date.now(), 0));
                    idleStatus = undefined;
                }
            });
            window.addEventListener('blur', this.blurListener = () => {
                core.notifications.isInBackground = true;
                if(idleTimer !== undefined) clearTimeout(idleTimer);
                if(core.state.settings.idleTimer > 0 && core.characters.ownCharacter.status !== 'dnd')
                    idleTimer = window.setTimeout(() => {
                        lastUpdate = Date.now();
                        idleStatus = {status: ownCharacter.status, statusmsg: ownCharacter.statusText};
                        core.connection.send('STA', {status: 'idle', statusmsg: ownCharacter.statusText});
                    }, core.state.settings.idleTimer * 60000);
            });
            core.connection.onEvent('closed', () => {
                if(idleTimer !== undefined) {
                    window.clearTimeout(idleTimer);
                    idleTimer = undefined;
                }
            });
            core.watch<number>(function(): number {
                return this.state.settings.fontSize;
            }, (value) => {
                this.setFontSize(value);
            });

            void core.adCenter.load();
        }

        @Hook('destroyed')
        destroyed(): void {
            window.removeEventListener('keydown', this.keydownListener);
            window.removeEventListener('focus', this.focusListener);
            window.removeEventListener('blur', this.blurListener);
        }

        needsReply(conversation: Conversation): boolean {
            if(!core.state.settings.showNeedsReply) return false;
            for(let i = conversation.messages.length - 1; i >= 0; --i) {
                const sender = (<Partial<Conversation.ChatMessage>>conversation.messages[i]).sender;

                // noinspection TypeScriptValidateTypes
                if(sender !== undefined)
                    return sender !== core.characters.ownCharacter;
            }
            return false;
        }

        onKeyDown(e: KeyboardEvent): void {
            const selected = this.conversations.selectedConversation;
            const pms = this.conversations.privateConversations;
            const channels = this.conversations.channelConversations;
            const console = this.conversations.consoleTab;
            const activity = this.conversations.activityTab;
            if(getKey(e) === Keys.ArrowUp && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey)
                if(selected === console || selected === activity) { //tslint:disable-line:curly
                    if(channels.length > 0) channels[channels.length - 1].show();
                    else if(pms.length > 0) pms[pms.length - 1].show();
                } else if(Conversation.isPrivate(selected)) {
                    const index = pms.indexOf(selected);
                    if(index === 0) this.goHome();
                    else pms[index - 1].show();
                } else {
                    const index = channels.indexOf(<Conversation.ChannelConversation>selected);
                    if(index === 0)
                        if(pms.length > 0) pms[pms.length - 1].show();
                        else this.goHome();
                    else channels[index - 1].show();
                }
            else if(getKey(e) === Keys.ArrowDown && e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey)
                if(selected === console || selected === activity) { //tslint:disable-line:curly - false positive
                    if(pms.length > 0) pms[0].show();
                    else if(channels.length > 0) channels[0].show();
                } else if(Conversation.isPrivate(selected)) {
                    const index = pms.indexOf(selected);
                    if(index === pms.length - 1) {
                        if(channels.length > 0) channels[0].show();
                        else this.goHome();
                    } else pms[index + 1].show();
                } else {
                    const index = channels.indexOf(<Conversation.ChannelConversation>selected);
                    if(index < channels.length - 1) channels[index + 1].show();
                    else this.goHome();
                }
        }

        setFontSize(fontSize: number): void {
            let overrideEl = <HTMLStyleElement | null>document.getElementById('overrideFontSize');
            if(overrideEl !== null)
                document.body.removeChild(overrideEl);
            overrideEl = document.createElement('style');
            overrideEl.id = 'overrideFontSize';
            document.body.appendChild(overrideEl);
            const sheet = <CSSStyleSheet>overrideEl.sheet;
            sheet.insertRule(`#chatView, .btn, .form-control, .custom-select { font-size: ${fontSize}px; }`, sheet.cssRules.length);
            sheet.insertRule(`.form-control, select.form-control { line-height: 1.428571429 }`, sheet.cssRules.length);
        }

        getOnlineStatusIconClasses(conversation: PrivateConversation): Record<string, any> {
            const status = conversation.character.status;

            if ((conversation.typingStatus === 'typing') || (conversation.typingStatus === 'paused')) {
                return {
                    fas: true,
                    'fa-comment-dots': (conversation.typingStatus === 'typing'),
                    'fa-comment': (conversation.typingStatus === 'paused')
                };
            }

            const styling = {
                crown:   { color: 'online',  icon: ['fas', 'fa-crown'] },
                online:  { color: 'online',  icon: ['fas', 'fa-circle'] },
                looking: { color: 'online',  icon: ['fa',  'fa-eye'] },
                offline: { color: 'offline', icon: ['fa',  'fa-ban'] },
                busy:    { color: 'away',    icon: ['fa',  'fa-cog'] },
                idle:    { color: 'away',    icon: ['far', 'fa-clock'] },
                dnd:     { color: 'dnd',     icon: ['fa',  'fa-minus-circle'] },
                away:    { color: 'away',    icon: ['far', 'fa-circle'] }
            };

            const cls = { [styling[status].color]: true };

            styling[status].icon.forEach(name => cls[name] = true);

            return cls;
        }

        logOut(): void {
            if(Dialog.confirmDialog(l('chat.confirmLeave'))) core.connection.close();
        }

        showSearch(): void {
            (<CharacterSearch>this.$refs['searchDialog']).show();
        }

        showRecent(): void {
            (<RecentConversations>this.$refs['recentDialog']).show();
        }

        showChannels(): void {
            (<ChannelList>this.$refs['channelsDialog']).show();
        }

        showStatus(): void {
            (<StatusSwitcher>this.$refs['statusDialog']).show();
        }

        showAdCenter(): void {
          (<AdCenterDialog>this.$refs['adCenter']).show();
        }

        showAdLauncher(): void {
          (<AdLauncherDialog>this.$refs['adLauncher']).show();
        }

        currentClicked = true;
        goHome(): void {
            if (this.conversations.selectedConversation === this.conversations.activityTab
            ||  this.conversations.selectedConversation === this.conversations.consoleTab) {
                this.currentClicked = !this.currentClicked;
            }

            this.homeConversation.show();
        }

        showConversation(c: Conversation.Conversation) {
            if (this.conversations.selectedConversation === c) {
                this.currentClicked = !this.currentClicked;
            }
            else {
                c.show(); // Set the conversation, Home will update from watcher.
            }
        }

        showDevTools(): void {
            if (this.env === 'development') {
                (this.$refs.devTools as any).show();
            }
        }

        addPmPartnerSwitch: boolean = false;
        showAddPmPartner(): void {
            this.addPmPartnerSwitch = !this.addPmPartnerSwitch;
            (<PmPartnerAdder>this.$refs['addPmPartnerDialog']).show();
        }

        userMenuHandle(e: MouseEvent | TouchEvent): void {
            (<UserMenu>this.$refs['userMenu']).handleEvent(e);
        }

        get showAvatars(): boolean {
            return core.state.settings.showAvatars;
        }

        get ownCharacter(): Character {
            return core.characters.ownCharacter;
        }

        get ownCharacterLink(): string {
            return profileLink(core.characters.ownCharacter.name);
        }

        getClasses(conversation: Conversation): string {
            return conversation === core.conversations.selectedConversation
                ? ' active'
                : unreadClasses[conversation.unread];
        }

        getHomeClasses(): string {
            const s = core.conversations.selectedConversation;

            return core.conversations.activityTab === s
                || core.conversations.consoleTab  === s
                    ? 'active'
                    : unreadClasses[this.homeConversation.unread];
        }

        isColorblindModeActive(): boolean {
          return core.state.settings.risingColorblindMode;
        }

        getImagePreview(): ImagePreview | undefined {
          return this.$refs['imagePreview'] as ImagePreview;
        }

        adsAreRunning(): boolean {
          return core.adCenter.adsAreRunning();
        }

        stopAllAds(): void {
          core.adCenter.stopAllAds();
        }
    }
</script>

<style lang="scss">
    @import "~bootstrap/scss/functions";
    @import "~bootstrap/scss/variables";
    @import "~bootstrap/scss/mixins/breakpoints";

    body {
        user-select: none;
    }

    .bbcode, .message, .profile-viewer {
        user-select: text;
    }

    .character-header {
        display: flex;
        justify-content: flex-start;
        align-items: flex-start;

        margin-right: 3px;

        .image-block {
            display: flex;

            min-width: 50px;
            max-width: 105px;
        }

        .character-info {
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            flex-shrink: 0;

            min-width: 92px;
            max-width: 138px;

            > a {
                display:block;
            }

            .character-name {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        }
    }

    .nav-group-container {
        margin-bottom: 10px;
    }

    .list-group.conversation-nav {
        .fas.active {
          color: #02a002;
        }

        .list-group-item {
            padding: 5px;
            display: flex;
            align-items: center;
            border-right: 0;
            border-top-right-radius:    0;
            border-bottom-right-radius: 0;
            .name {
                flex: 1;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .icon-bed {
                line-height: 0;
                display: flex;
                align-items: center;
                padding-bottom: 2px;
            }

            .fas {
                font-size: 16px;
                padding: 0 3px;
                &:last-child {
                    padding-left: 0.375em;
                    padding-right: 0;
                }
            }

            &.item-private {
                padding-left: 0;
                padding-top: 0;
                padding-bottom: 0;

                .online-status {
                    padding-left: 1px;
                    font-size: 85%;
                }

                /*.offline,*/
                /*.online,*/
                /*.away {*/
                /*    font-size: 80%;*/
                /*}*/

                .offline {
                    color: #5c5c84;
                }

                .online {
                    color: #02a002;
                }

                .away {
                    color: #c7894f;
                }

                .dnd {
                    color: #ce2d4f;
                }

                .fa-comment,
                .fa-comment-dots {
                    color: #cbcbe5;
                }

                /*.fa-eye {*/
                /*    // margin-right: 3px;*/
                /*}*/
            }
            img {
                height: 40px;
                width: 40px;
                margin: -1px 5px -1px -1px;
            }
            &:first-child img {
                border-top-left-radius: 4px;
            }
            &:last-child img {
                border-bottom-left-radius: 4px;
            }
        }

        .list-group-item-danger:not(.active) {
            color: inherit;
        }
    }

    #quick-switcher {
        margin: 0 45px 5px;
        overflow: auto;
        display: none;
        align-items: stretch;
        flex-direction: row;

        @media (max-width: breakpoint-max(sm)) {
            display: flex;
        }

        a {
            width: 40px;
            text-align: center;
            line-height: 1;
            padding: 5px 5px 0;
            overflow: hidden;
            flex-shrink: 0;
            &:first-child {
                border-radius: 4px 0 0 4px;
                &:last-child {
                    border-radius: 4px;
                }
            }
            &:last-child {
                border-radius: 0 4px 4px 0;
            }
        }

        img {
            width: 30px;
        }

        .name {
            overflow: hidden;
            white-space: nowrap;
        }

        .conversation-icon {
            font-size: 2em;
            height: 30px;
        }

        .list-group-item-danger:not(.active) {
            color: inherit;
        }
    }

    #sidebar {
        .body a.btn {
            padding: 2px 0;
            text-align: left;
        }

        @media (min-width: breakpoint-min(md)) {
            .sidebar {
                position: static;
                margin: 0;
                padding: 0;
                height: 100%;
            }

            .body {
                display: block;
                // overflow-x: hidden; // Possible solution to username ellipses overflowing.
            }

            .expander {
                display: none;
            }
        }

        .adControls {
          float: right;
          margin-right: 0.25rem;
          margin-top: 3px;

          span {
            color: var(--danger);
            cursor: pointer;

            &:hover {
              color: var(--red);
            }
          }
        }

        .recent-conversation, .join-channel {
          font-size: 90%;
          margin-left: 0.2em;
          margin-top: 0.25em;
        }

        .glowing {
          padding: 3px;
          margin-right: 0.5em;
          animation: noticeme 2.5s alternate;
          animation-iteration-count: 10;
          animation-timing-function: ease-in-out;
        }

        .join-channel.glowing {
          animation-delay: 0.3s !important;
        }

        @keyframes noticeme {
          0% {
            // box-shadow: 0 0 10px -10px #aef4af;
            color: var(--gray-dark)
          }
          80% {
            // box-shadow: 0 0 10px -10px #aef4af;
            color: var(--gray-dark)
          }
          100% {
            // box-shadow: 0 0 10px 10px #aef4af;
            color: var(--yellow)
          }
        }
    }
</style>
