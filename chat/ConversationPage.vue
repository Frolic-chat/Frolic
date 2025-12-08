<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page ref="pageLayout"
    :body-classes="'conversation'"
    :prescroll-classes="'header d-flex flex-column'"
    :scrollcage-classes="[ 'messages ', getMessageWrapperClasses() ]"
    :postscroll-classes="'input'"
>
    <template v-slot:prescroll>
        <!-- Header -->
        <template v-if="!isActivity">
            <div class="info d-flex align-items-center">
                <span v-if="isPrivate(conversation)" class="mr-auto"><!-- left side: userview -->
                    <img v-if="settings.showAvatars" class="d-none d-sm-block flex-shrink-0 h-100" :src="characterImage" />
                    <span class="d-flex flex-column align-self-start">
                        <user :character="conversation.character"
                            classes="text-truncate" style="height: 1.5em;"
                            :match="false" :reusable="true" :showStatus="true" :immediate="true"
                        ></user>
                        <div class="text-truncate" style="height: 1.5em;">
                            <template v-if="conversation.character.status !== 'online'">
                                {{ userStatusWord }}
                            </template>
                            <template v-else-if="userMemo">
                                <b class="fa-solid fa-square-pen"></b>
                                {{ userMemo.split('\n')[0] }}
                            </template>
                            <template v-else>
                                {{ userStatusWord }}
                            </template>
                        </div>
                    </span>
                </span>
                <span v-else class="mr-auto"><!-- left side: channel name -->
                    <h5 class="text-truncate mb-0">
                        {{ conversation.name }}
                    </h5>
                </span>

                <span class="ml-auto flex-shrink-0"><!-- right side -->
                    <span v-if="isChannelMod">
                        <a href="#" @click.prevent="showManage()" class="btn btn-outline-secondary">
                            <span class="fa fa-edit"></span>
                            <!-- <span class="btn-text d-none d-lg-inline">{{l('manageChannel.open')}}</span> -->
                        </a>
                    </span>
                    <dropdown v-if="isChannel(conversation)" v-show="(conversation.channel.mode == 'both' || conversation.channel.mode == 'ads')"
                        title=""
                        :keep-open="false"
                        text-class="d-none d-lg-inline"
                        :icon-class="{
                            fas: true,
                            'fa-comments': conversation.mode === 'chat',
                            'fa-ad':       conversation.mode === 'ads',
                            'fa-asterisk': conversation.mode === 'both',
                        }"
                        wrap-class="btn-group views"
                        link-class="btn btn-outline-secondary dropdown-toggle"
                    >
                        <button v-for="mode in modes" class="dropdown-item" :class="{ selected: conversation.mode == mode }" type="button" @click="setMode(mode)" v-show="conversation.channel.mode == 'both'">
                            {{l('channel.mode.' + mode)}}
                        </button>
                        <div class="dropdown-divider" v-show="conversation.channel.mode == 'both'"></div>
                        <button type="button" class="dropdown-item" :class="{ selected: showNonMatchingAds }" @click="toggleNonMatchingAds()">
                            {{l('channel.ads.incompatible')}}
                        </button>
                        <template v-if="conversation.settings.adSettings.ads.length">
                            <div class="dropdown-divider"></div>
                            <button type="button" class="dropdown-item" @click="showChannelAds()">
                                {{ l('channel.ads.edit') }}
                            </button>
                        </template>
                    </dropdown>
                    <template v-if="isChannel(conversation) || isPrivate(conversation)">
                        <a href="#" @click.prevent="showLogs()" class="btn btn-outline-secondary">
                            <span class="fa fa-file-alt"></span>
                            <!-- <span class="btn-text d-none d-lg-inline">{{ l('logs.title') }}</span> -->
                        </a>
                        <a href="#" @click.prevent="report()" class="btn btn-outline-secondary">
                            <span class="fa fa-exclamation-triangle"></span>
                            <!-- <span class="btn-text d-none d-lg-inline">{{ l('chat.report') }}</span> -->
                        </a>
                    </template>

                    <slot name="title-end"></slot>
                </span>
            </div>

            <!-- Message filter/search bar -->
            <div class="search input-group mt-2" v-show="showSearch">
                <div class="input-group-prepend">
                    <div class="input-group-text btn">
                        <span class="fa-fw fas fa-search"></span>
                    </div>
                </div>
                <input v-model="searchInput" @keydown.esc="hideSearch()" @keypress="lastSearchInput = Date.now()"
                    :placeholder="l('chat.search')" ref="searchField" class="form-control"/>
                <div class="input-group-append">
                    <a class="input-group-text btn btn-sm btn-light" @click="hideSearch">
                        <i class="fa-fw fas fa-times"></i>
                    </a>
                </div>
            </div>

            <!-- Ad posting display - Legacy? -->
            <div class="auto-ads" v-show="isAutopostingAds()">
                <h4>{{l('admgr.activeHeader')}}</h4>
                <div class="update">{{adAutoPostUpdate}}</div>

                <div v-show="adAutoPostNextAd" class="next">
                    <h5>
                        {{l('admgr.comingNext')}} <a @click="skipAd()">
                            <i class='adAction fas fa-arrow-right'></i>
                        </a>
                    </h5>
                    <div>
                        {{(adAutoPostNextAd ? adAutoPostNextAd.substring(0, 100) : '')}}{{l('general.ellipses')}}
                    </div>
                </div>

                <a class="btn btn-sm btn-outline-primary renew-autoposts" @click="renewAutoPosting()" v-if="!adsRequireSetup">
                    {{l('admgr.renew')}}
                </a>
                <a class="btn btn-sm btn-outline-primary renew-autoposts" @click="showChannelAds()" v-if="adsRequireSetup">
                    {{l('admgr.setup')}}
                </a>
            </div>
        </template>
    </template>

    <!-- Message box -->
    <template v-slot:default>
        <template v-for="message in messages">
            <message-view :message="message" :channel="isChannel(conversation) ? conversation.channel : undefined" :key="message.id" @expand="messageViewExpanded" :classes="message == conversation.lastRead ? 'last-read' : ''">
            </message-view>
            <span v-if="hasSFC(message) && message.sfc.action === 'report'" :key="'r' + message.id">
                <a :href="'https://www.f-list.net/fchat/getLog.php?log=' + message.sfc.logid"
                    v-if="message.sfc.logid" target="_blank">
                    {{l('events.report.viewLog')}}
                </a>
                <span v-else>{{l('events.report.noLog')}}</span>
                <span v-show="!message.sfc.confirmed">
                    | <a href="#" @click.prevent="message.sfc.action === 'report' && acceptReport(message.sfc)">
                        {{l('events.report.confirm')}}
                    </a>
                </span>
            </span>
        </template>
    </template>

    <template v-slot:postscroll>
        <!-- Input box -->
        <div v-show="isConsole || isPrivate(conversation) || isChannel(conversation)" style="display: contents;">
            <bbcode-editor v-model="conversation.enteredText" ref="mainInput" style="position:relative;margin-top:5px" @keydown="onKeyDown"
                :extras="extraButtons" @input="keepScroll"
                :classes="'form-control chat-text-box ' + waitingForSecondEnterClass + (isChannel(conversation) && conversation.isSendingAds ? ' ads-text-box' : '')"
                :hasToolbar="settings.bbCodeBar"
                :maxlength="isChannel(conversation) || isPrivate(conversation) ? conversation.maxMessageLength : undefined"
                :characterName="ownName"
                :type="'big'"
            >
                <template v-slot:default>
                    <span v-if="isPrivate(conversation) && conversation.typingStatus !== 'clear'" class="chat-info-text">
                        <user :character="conversation.character" :match="false" :bookmark="false"></user>
                        &nbsp;{{l('chat.typing.' + conversation.typingStatus, '').trim()}}
                    </span>
                    <div v-show="conversation.infoText" class="chat-info-text">
                        <span class="fa fa-times" style="cursor:pointer" @click.stop="conversation.infoText = ''"></span>
                        <span style="flex:1;margin-left:5px">
                            {{conversation.infoText}}
                        </span>
                    </div>
                    <div v-show="conversation.errorText" class="chat-info-text">
                        <span class="fa fa-times" style="cursor:pointer" @click.stop="conversation.errorText = ''"></span>
                        <span class="redText" style="flex:1;margin-left:5px">
                            {{conversation.errorText}}
                        </span>
                    </div>
                </template>
                <template v-slot:toolbar-end>
                    <div v-if="!settings.enterSend" class="btn btn-sm btn-primary ml-1" @click="sendButton">
                        {{l('chat.send')}}
                    </div>
                </template>
            </bbcode-editor>

            <!-- footer -->
            <div class="footer d-flex flex-nowrap justify-content-between align-items-center">
                <span class="channel-key text-left"><!-- typing indicator here -->
                    {{ isChannel(conversation) ? conversation.key : '' }}
                </span>
                <div class="send-ads-switcher btn-group btn-group-sm">
                    <template v-if="isChannel(conversation)">
                        <a v-show="conversation.channel.mode === 'both' || conversation.channel.mode === 'chat'"
                            class="btn" :class="{
                                'btn-secondary': !conversation.isSendingAds,
                                'btn-outline-secondary': conversation.isSendingAds,
                                disabled: conversation.channel.mode != 'both' || conversation.adManager.isActive(),
                            }"
                            @click.prevent="setSendingAds(false)" href="#"
                        >
                            {{ l('channel.mode.chat') }}
                        </a>
                        <a v-show="conversation.channel.mode === 'both' || conversation.channel.mode === 'ads'"
                            class="btn" :class="{
                                'btn-secondary': conversation.isSendingAds,
                                'btn-outline-secondary': !conversation.isSendingAds,
                                disabled: conversation.channel.mode != 'both' || conversation.adManager.isActive(),
                            }"
                            @click.prevent="setSendingAds(true)" href="#"
                        >
                            {{ adsMode }}
                        </a>
                    </template>
                </div>
                <span class="message-length text-right">
                    <template v-if="isChannel(conversation) || isPrivate(conversation)">
                        {{ messageLength }}<span class="d-none d-sm-inline"> / {{ conversation.maxMessageLength }}</span>
                    </template>
                </span>
            </div>
        </div>

        <!-- Modals -->

        <channelAdSettings ref="channelAdSettingsDialog" :conversation="conversation"></channelAdSettings>
        <manage-channel ref="manageDialog" v-if="isChannel(conversation)" :channel="conversation.channel"></manage-channel>
    </template>
</page>
</template>

<script lang="ts">
    import { Component, Hook, Prop, Watch } from '@f-list/vue-ts';
    import Vue from 'vue';

    import HomePageLayout from './home_pages/HomePageLayout.vue';
    import Tabs from '../components/tabs';
    import Dropdown from '../components/Dropdown.vue';

    import MessageView from './message_view';
    import UserView from './UserView.vue';
    import { BBCodeView } from '../bbcode/view';
    import { Editor } from './bbcode';
    import { EditorButton, EditorSelection } from '../bbcode/editor';


    import Modal, { isShowing as anyDialogsShown } from '../components/Modal.vue';

    import type Logs         from './Logs.vue';
    import type ReportDialog from './ReportDialog.vue';
    import type CommandHelp  from './CommandHelp.vue';

    import ManageChannel from './ManageChannel.vue';
    import ConversationAdSettings from './ads/ConversationAdSettings.vue';

    // Recon buttons, can go away.
    // import CharacterAdView from './character/CharacterAdView.vue';
    //import CharacterChannelList from './character/CharacterChannelList.vue';
    import { MemoManager } from './character/memo';

    import core from './core';
    import l from './localize';
    import { Keys } from '../keys'; // Even needed?
    import { errorToString, getByteLength, getKey } from './common';
    import { isCommand } from './slash_commands';
    import { EventBus, MemoEvent } from './preview/event-bus';
    import { Channel, channelModes, Character, Conversation, Settings } from './interfaces';

    import NewLogger from '../helpers/log';
    const log = NewLogger('conversation');

    @Component({
        components: {
            tabs: Tabs,
            page: HomePageLayout,

            user: UserView,
            dropdown: Dropdown,
            channelAdSettings: ConversationAdSettings,
            'manage-channel': ManageChannel,

            'message-view': MessageView,
            bbcode: BBCodeView(core.bbCodeParser),
            'bbcode-editor': Editor,

            modal: Modal,

            // TODO: Combine into recon
            // 'ad-view': CharacterAdView,
            //'channel-list': CharacterChannelList,
        }
    })
    export default class ConversationView extends Vue {
        @Prop({ required: true })
        readonly conversation!: Conversation;

        @Prop({ required: true })
        readonly logs!: Logs;

        @Prop({ required: true })
        readonly reportDialog!: ReportDialog;

        @Prop({ required: true })
        readonly commandHelp!: CommandHelp;

        get isActivity() { return this.conversation === core.conversations.activityTab }
        get isConsole()  { return this.conversation === core.conversations.consoleTab  }

        modes = channelModes;
        descriptionExpanded = false;
        l = l;
        extraButtons: EditorButton[] = [];
        tabOptions: string[] | undefined;
        tabOptionsIndex!: number;
        tabOptionSelection!: EditorSelection;
        showSearch = false;
        searchInput = '';
        search = '';
        lastSearchInput = 0;
        messageCount = 0;
        searchTimer = 0;
        Layout!: HomePageLayout;
        messageBlock!: HTMLElement;
        textBox!: Editor;

        resizeHandler!:   { (e: UIEvent):       any };
        keydownHandler!:  { (e: KeyboardEvent): any };
        keypressHandler!: { (e: KeyboardEvent): any };
        scrollHandler!:   { (e: Event):         any };

        /**
         * True if the user is scrolled to the bottom of the page.
         * But how does this interact with this.scrolledUp?
         */
        scrolledDown = true;

        /**
         * Set when you are scrolled up enough to load more messages.
         */
        scrolledUp = false;

        /**
         * Used to prevent the automatic scroll handler from reacting to your deliberate scroll.
         * Toggle it on, and it will toggle it off when it "eats" the scroll event you caused.
         */
        ignoreScroll = false;

        adCountdown = 0;
        adsMode = l('channel.mode.ads');
        autoPostingUpdater = 0;
        adAutoPostUpdate: string | null = null;
        adAutoPostNextAd: string | null = null;
        adsRequireSetup = false;
        showNonMatchingAds = true;

        isChannel = Conversation.isChannel;
        isPrivate = Conversation.isPrivate;

        /**
         * Group of info for the settings option "Require a second Enter to send your messages"
         */
        waitingForSecondEnter = false;
        waitingForSecondEnterClass: 'second-enter-send-allowed' | '' = '';
        waitingForSecondEnterTimeout?: ReturnType<typeof setTimeout>;

        userMemo: string | null = null;
        editorMemo: string = '';
        memoManager?: MemoManager;

        ownName?: string;

        get messageLength() { return getByteLength(this.conversation.enteredText) }
        get memoLength()    { return getByteLength(this.editorMemo)               }

        @Hook('created')
        created() {
            log.debug(`Created -> ${this.isActivity ? 'Activity' : 'Console'}`);
        }

        @Hook('beforeMount')
        async onBeforeMount(): Promise<void> {
            log.debug(`beforeMount -> ${this.isActivity ? 'Activity' : 'Console'}`);

            this.updateOwnName();

            this.showNonMatchingAds = !await core.settingsStore.get('hideNonMatchingAds');
        }

        @Hook('mounted')
        mounted(): void {
            this.updateOwnName();

            log.debug(`Mounted -> ${this.isActivity ? 'Activity' : 'Console'}`);

            this.textBox      = <Editor>this.$refs['mainInput'];
            this.Layout       = <HomePageLayout>this.$refs['pageLayout'];
            this.messageBlock = this.Layout.scrollCage;

            this.messageBlock.addEventListener('scroll', this.scrollHandler = () => this.onMessagesScroll());
            log.debug(`Event listener added for scroll on ${this.conversation.name}`);

            this.extraButtons = [{
                title: 'Help\n\nClick this button for a quick overview of slash commands.',
                tag: '?',
                icon: 'fa-question',
                handler: () => this.commandHelp.show()
            }];
            window.addEventListener('resize', this.resizeHandler = () => this.keepScroll());
            window.addEventListener('keypress', this.keypressHandler = () => {
                const selection = document.getSelection();
                if((selection === null || selection.isCollapsed) && !anyDialogsShown &&
                    (document.activeElement === document.body || document.activeElement === null || document.activeElement.tagName === 'A'))
                    this.textBox.focus();
            });
            window.addEventListener('keydown', this.keydownHandler = ((e: KeyboardEvent) => {
                if(getKey(e) === Keys.KeyF && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                    if (core.runtime.dialogStack.length)
                        return;

                    this.showSearch = true;
                    this.$nextTick(() => (<HTMLElement>this.$refs['searchField']).focus());
                }
            }));

            log.debug(`Registered resize, keypress, and keydown events for ${this.conversation.name}`);

            this.searchTimer = window.setInterval(() => {
                if(Date.now() - this.lastSearchInput > 500 && this.search !== this.searchInput)
                    this.search = this.searchInput;
            }, 500);
            this.$watch('conversation.nextAd', (value: number) => {
                const setAdCountdown = () => {
                    const diff = ((<Conversation.ChannelConversation>this.conversation).nextAd - Date.now()) / 1000;
                    if(diff <= 0) {
                        if(this.adCountdown !== 0) window.clearInterval(this.adCountdown);
                        this.adCountdown = 0;
                        this.adsMode = l('channel.mode.ads');
                    } else this.adsMode = l('channel.mode.ads.countdown', Math.floor(diff / 60), Math.floor(diff % 60));
                };
                if(Date.now() < value && this.adCountdown === 0)
                    this.adCountdown = window.setInterval(setAdCountdown, 1000);
                setAdCountdown();
            });

            this.$watch(() => this.conversation.adManager.isActive(), () => (this.refreshAutoPostingTimer()));
            this.refreshAutoPostingTimer();

            EventBus.$on('configuration-update', this.configUpdateHook);
            EventBus.$on('character-memo', this.memoUpdateHook);
        }

        protected configUpdateHook = () => this.updateOwnName();
        protected memoUpdateHook = (e: MemoEvent) => this.refreshMemo(e);

        @Hook('destroyed')
        destroyed(): void {
            window.removeEventListener('resize', this.resizeHandler);
            window.removeEventListener('keydown', this.keydownHandler);
            window.removeEventListener('keypress', this.keypressHandler);
            clearInterval(this.searchTimer);
            clearInterval(this.autoPostingUpdater);
            clearInterval(this.adCountdown);

            EventBus.$off('configuration-update', this.configUpdateHook);
            EventBus.$off('character-memo', this.memoUpdateHook);
        }

        hideSearch(): void {
            this.showSearch = false;
            this.searchInput = '';
            this.scrollMessageView();
        }

        updateOwnName(): void {
            this.ownName = core.state.settings.risingShowPortraitNearInput ? core.characters.ownCharacter?.name : undefined;
        }

        get messages(): ReadonlyArray<Conversation.Message | Conversation.SFCMessage> {
            if(this.search === '') return this.conversation.messages;
            const filter = new RegExp(this.search.replace(/[^\w]/gi, '\\$&'), 'i');
            return this.conversation.messages
                .filter(x => filter.test(x.text) || filter.test('sender' in x ? x.sender.name : ''));
                // When will typescript just let me use x.sender?.name......
        }

        async sendButton(): Promise<void> {
            return this.conversation.send();
        }

        @Watch('conversation')
        async conversationChanged(): Promise<void> {
            this.updateOwnName();

            if (!anyDialogsShown)
                this.textBox.focus();

            this.$nextTick(() => setTimeout(() =>
                this.messageBlock.scrollTop = this.messageBlock.scrollHeight
            ));

            this.scrolledDown = true;

            this.refreshAutoPostingTimer();

            this.userMemo = null;

            if (this.isPrivate(this.conversation)) {
                const c = await core.cache.profileCache.get(this.conversation.name);
                this.userMemo = c?.character?.memo?.memo ?? null;
            }
        }

        @Watch('conversation.messages')
        messageAdded(newValue: Conversation.Message[]): void {
            this.keepScroll();

            if (!this.scrolledDown && newValue.length === this.messageCount)
                this.messageBlock.scrollTop -= (this.messageBlock.firstElementChild!).clientHeight;

            this.messageCount = newValue.length;
        }

        /**
         * Keeps the current scroll level when elements might cause it to change. For example:
         * Resizing the window; the text input box growing larger; other player's typing indicator being shown or hidden; an error or info message appearing or hiding; receiving a new message.
         */
        keepScroll(): void {
            if (this.scrolledDown) {
                this.ignoreScroll = true;
                this.$nextTick(() => setTimeout(() => {
                    this.ignoreScroll = true;
                    this.messageBlock.scrollTop = this.messageBlock.scrollHeight;
                }));
            }
        }

        scrollMessageView(e?: KeyboardEvent) {
            this.ignoreScroll = true;

            this.$nextTick(() => setTimeout(() => {
                this.ignoreScroll = true;
                this.messageBlock.scrollTop = this.messageBlock.scrollHeight;
                this.scrolledDown = true;
            }));

            if (e && !anyDialogsShown)
                this.textBox.focus();
        }

        /**
         * Tracks when the user scrolls. Because this triggers off of any scroll event, it will "correct" your own attempts to set the scroll distance. You should set `ignoreScroll` before attempting to modify the scroll. This function will `eat` the ignore, so set it every time you want to avoid the auto-correct.
         *
         * This will set `scrolledUp` if it detected you at the top of chat history - it also tries to load more messages. It will also set `scrolledDown` if your scrolled-by content is within 15 px of the loaded chat history. (It is possible that both are set at the same time.)
         */
        onMessagesScroll(): void {
            if (this.ignoreScroll) {
                this.ignoreScroll = false;
                return;
            }
            if (this.messageBlock.scrollTop < 20) {
                if (!this.scrolledUp) {
                    const firstMessage = this.messageBlock.firstElementChild;

                    if (this.conversation.loadMore() && firstMessage) {
                        this.messageBlock.style.overflow = 'hidden';

                        this.$nextTick(() => {
                            this.messageBlock.scrollTop = (<HTMLElement>firstMessage).offsetTop;
                            this.messageBlock.style.overflow = 'auto';
                        });
                    }
                }

                this.scrolledUp = true;
            }
            else {
                this.scrolledUp = false;
            }

            this.scrolledDown = this.messageBlock.scrollTop + this.messageBlock.offsetHeight >= this.messageBlock.scrollHeight - 15;
        }

        @Watch('conversation.errorText')
        @Watch('conversation.infoText')
        textChanged(newValue: string, oldValue: string): void {
            if (oldValue.length === 0 && newValue.length > 0)
                this.keepScroll();
        }

        @Watch('conversation.typingStatus')
        typingStatusChanged(_str: string, oldValue: string): void {
            if (oldValue === 'clear')
                this.keepScroll();
        }

        async onKeyDown(e: KeyboardEvent): Promise<void> {
            if(getKey(e) === Keys.Tab) {
                if(e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                if(this.conversation.enteredText.length === 0 || this.isConsoleTab) return;
                if(this.tabOptions === undefined) {
                    const selection = this.textBox.getSelection();
                    if(selection.text.length === 0) {
                        const match = /\b[\w]+$/.exec(this.textBox.text.substring(0, selection.end));
                        if(match === null) return;
                        selection.start = match.index < 0 ? 0 : match.index;
                        selection.text = this.textBox.text.substring(selection.start, selection.end);
                        if(selection.text.length === 0) return;
                    }
                    const search = new RegExp(`^${selection.text.replace(/[^\w]/gi, '\\$&')}`, 'i');
                    const c = (<Conversation.PrivateConversation>this.conversation);
                    let options: ReadonlyArray<{character: Character}>;
                    options = Conversation.isChannel(this.conversation) ? this.conversation.channel.sortedMembers :
                        [{character: c.character}, {character: core.characters.ownCharacter}];
                    this.tabOptions = options.filter((x) => search.test(x.character.name)).map((x) => x.character.name);
                    this.tabOptionsIndex = 0;
                    this.tabOptionSelection = selection;
                }
                if(this.tabOptions.length > 0) {
                    const selection = this.textBox.getSelection();
                    if(selection.end !== this.tabOptionSelection.end) return;
                    if(this.tabOptionsIndex >= this.tabOptions.length) this.tabOptionsIndex = 0;
                    const name = this.tabOptions[this.tabOptionsIndex];
                    const userName = (isCommand(this.conversation.enteredText) ? name : `[user]${name}[/user]`);
                    this.tabOptionSelection.end = this.tabOptionSelection.start + userName.length;
                    this.conversation.enteredText = this.conversation.enteredText.substring(0, this.tabOptionSelection.start) + userName +
                        this.conversation.enteredText.substring(selection.end);
                    ++this.tabOptionsIndex;
                }
            }
            else {
                if (this.tabOptions) this.tabOptions = undefined;

                if (getKey(e) === Keys.ArrowUp && !this.conversation.enteredText.trim()
                    && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
                    this.conversation.loadLastSent();
                }
                else if (getKey(e) === Keys.Escape) {
                    this.scrollMessageView();
                }
                else if (getKey(e) === Keys.Enter) {
                    // Handles the situations where you insert a newline:
                    // - Shift+Enter when "enter to send" is enabled
                    // - solo Enter when "enter to send" is disabled
                    if (e.shiftKey === this.settings.enterSend)
                        return;

                    e.preventDefault();

                    // Block sending when no real content;
                    // Stops double-enter visual feedback and potential chat spam.
                    if (!this.conversation.enteredText.trim())
                        return;

                    // Handles Shift+Enter when "enter to send" is disabled.
                    // Handles solo Enter when "enter to send" is enabled.
                    if (!this.settings.enterSend || !this.settings.secondEnterSend) {
                        await this.conversation.send();
                        return;
                    }
                    // Below here is only solo Enter with "enter to send" + "second enter" enabled.

                    // Welcome to the "I flub a lot of messages so I require confirmation before sending one" zone.
                    if (this.waitingForSecondEnter) {
                        await this.conversation.send();
                        this.waitingForSecondEnter = false;
                        this.waitingForSecondEnterClass = '';

                        if (this.waitingForSecondEnterTimeout) {
                            clearTimeout(this.waitingForSecondEnterTimeout);
                            this.waitingForSecondEnterTimeout = undefined;
                        }
                    }
                    else {
                        this.waitingForSecondEnter = true;
                        this.waitingForSecondEnterClass = 'second-enter-send-allowed';
                        this.waitingForSecondEnterTimeout = setTimeout(() => {
                            this.waitingForSecondEnter = false;
                            this.waitingForSecondEnterClass = '';
                            this.waitingForSecondEnterTimeout = undefined;
                        }, 3000);
                    }
                }
            }
        }

        setMode(mode: Channel.Mode): void {
            const conv = (<Conversation.ChannelConversation>this.conversation);

            if (conv.channel.mode === 'both')
                conv.mode = mode;
        }


        async toggleNonMatchingAds(): Promise<void> {
            this.showNonMatchingAds = !this.showNonMatchingAds;

            await core.settingsStore.set('hideNonMatchingAds', !this.showNonMatchingAds);
        }

        messageViewExpanded(): void {
            this.scrolledDown = false;
        }

        getMessageWrapperClasses() {
            const filter = core.state.settings.risingFilter;
            const classes: { [key: string]: boolean } = {};

            if (this.isPrivate(this.conversation)) {
              classes['filter-channel-messages'] = filter.hidePrivateMessages;
              return classes;
            }

            if (!this.isChannel(this.conversation))
                return {};

            const conv = <Conversation.ChannelConversation>this.conversation;

            classes['messages-' + conv.mode] = true;
            classes['hide-non-matching'] = !this.showNonMatchingAds;

            classes['filter-ads'] = filter.hideAds;
            classes['filter-channel-messages'] = conv.channel.owner !== ''
                ? filter.hidePrivateChannelMessages
                : filter.hidePublicChannelMessages;

            return classes;
        }

        acceptReport(sfc: {callid: number}): void {
            core.connection.send('SFC', { action: 'confirm', callid: sfc.callid });
        }

        setSendingAds(is: boolean): void {
            const conv = (<Conversation.ChannelConversation>this.conversation);

            if (conv.channel.mode === 'both') {
                conv.isSendingAds = is;
                this.textBox.focus();
            }
        }

        showLogs(): void       { this.logs.show() }
        report(): void         { this.reportDialog.report() }
        showChannelAds(): void { (<ConversationAdSettings>this.$refs['channelAdSettingsDialog']).show() }
        showManage(): void     { (<ManageChannel>this.$refs['manageDialog']).show() }
        // showAds(): void        { (<CharacterAdView>this.$refs['adViewer']).show() }
        //showChannels(): void   { (<CharacterChannelList>this.$refs['channelList']).show() }

        isAutopostingAds(): boolean {
            return this.conversation.adManager.isActive();
        }

        skipAd(): void {
          this.conversation.adManager.skipAd();
          this.updateAutoPostingState();
        }

        stopAutoPostAds(): void {
            this.conversation.adManager.stop();
        }

        renewAutoPosting(): void {
            this.conversation.adManager.renew();

            this.refreshAutoPostingTimer();
        }

        toggleAutoPostAds(): void {
            if(this.isAutopostingAds())
                this.stopAutoPostAds();
            else
                this.conversation.adManager.start();

            this.refreshAutoPostingTimer();
        }

        updateAutoPostingState() {
            const adManager = this.conversation.adManager;

            this.adAutoPostNextAd = adManager.getNextAd() || null;

            if(this.adAutoPostNextAd) {
                const diff = ((adManager.getNextPostDue() || new Date()).getTime() - Date.now()) / 1000;
                const expDiff = ((adManager.getExpireDue() || new Date()).getTime() - Date.now()) / 1000;

                const diffMins = Math.floor(diff / 60);
                const diffSecs = Math.floor(diff % 60);
                const expDiffMins = Math.floor(expDiff / 60);
                const expDiffSecs = Math.floor(expDiff % 60);

                this.adAutoPostUpdate = l(
                    ((adManager.getNextPostDue()) && (!adManager.getFirstPost())) ? 'admgr.postingBegins' : 'admgr.nextPostDue',
                    diffMins,
                    diffSecs
                ) + l('admgr.expiresIn', expDiffMins, expDiffSecs);

                this.adsRequireSetup = false;
            } else {
                this.adAutoPostNextAd = null;

                this.adAutoPostUpdate = l('admgr.noAds');
                this.adsRequireSetup = true;
            }
        };

        refreshAutoPostingTimer(): void {
            if (this.autoPostingUpdater)
                window.clearInterval(this.autoPostingUpdater);

            if (!this.isAutopostingAds()) {
                this.adAutoPostUpdate = null;
                this.adAutoPostNextAd = null;
                return;
            }

            this.autoPostingUpdater = window.setInterval(() => this.updateAutoPostingState(), 1000);
            this.updateAutoPostingState();
        }


        hasSFC(message: Conversation.Message): message is Conversation.SFCMessage {
            // noinspection TypeScriptValidateTypes
            return (<Partial<Conversation.SFCMessage>>message).sfc !== undefined;
        }

        updateMemo(): void {
          this.memoManager?.set(this.editorMemo || null).catch((e: object) => alert(errorToString(e)))
          this.userMemo = this.editorMemo ?? null;
        }

        refreshMemo(e: MemoEvent): void {
          this.userMemo = e.memo.memo;
        }

        async showMemo(): Promise<void> {
          if (this.isPrivate(this.conversation)) {
            const c = this.conversation.character;

            this.editorMemo = '';

            (<Modal>this.$refs['userMemoEditor']).show();

            try {
              this.memoManager = new MemoManager(c.name);
              await this.memoManager.load();

              this.userMemo = this.memoManager.get().memo;
              this.editorMemo = this.userMemo ?? '';
            } catch(e) {
                alert(errorToString(e));
            }
          }
        }

        get characterImage(): string {
            return core.characters.getImage(this.conversation.name);
        }

        get settings(): Settings {
            return core.state.settings;
        }

        get isConsoleTab(): boolean {
            return this.conversation === core.conversations.consoleTab;
        }

        get isChannelMod(): boolean {
            if (core.characters.ownCharacter.isChatOp)
                return true;

            if (!this.isChannel(this.conversation))
                return false;

            const member = this.conversation.channel.members[core.connection.character];
            return member !== undefined && member.rank > Channel.Rank.Member;
        }

        get userStatusWord(): string | undefined {
            if (!this.isPrivate(this.conversation))
                return undefined;

            const s = this.conversation.character.status;
            return s.charAt(0).toUpperCase() + s.slice(1);
        }
    }
</script>

<style lang="scss">
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins/breakpoints";

.conversation .header {
    border-bottom: solid 1px rgba(248, 248, 242, 0.125);
    /* padding-block: 10px; */
}

.conversation .header .info {
    > .ml-auto, > .mr-auto {
        display: flex;
        align-items: center;
        height: 3em;
        gap: 0.5rem;
    }

    h1, h2, h3, h4, h5, h6 {
        margin: 0;
    }

    .bbcode {
        /* Remake of text-truncate :) */
        overflow:      hidden;
        text-overflow: ellipsis;
        white-space:   nowrap;
    }

    .dropdown-item.selected::before {
        content: '✓';
    }
}

.conversation .messages {
    padding-inline: 0;

    &:focus {
        outline: initial;
    }
}

.conversation .input {
    padding-inline: 0;
    padding-bottom: 0;
}

.conversation .message-length,
.conversation .channel-key {
    min-width: 13ch;
}

.send-ads-switcher.btn-group {
    > .btn {
        padding-block: 0.2rem;
        line-height: 1.25;
    }
}

/*
 * Below this point, css rules may be unreveiwed.
 */
.conversation {
    .toggle-autopost {
        margin-left: 1px;
    }

    .auto-ads {
        background-color: rgb(220, 113, 31);
        padding-left: 10px;
        padding-right: 10px;
        padding-top: 5px;
        padding-bottom: 5px;
        margin: 0;
        position: relative;
        margin-top: 5px;

        .adAction {
            &:hover {
            color: rgba(255, 255, 255, 0.8);
            }

            &:active {
            color: rgba(255, 255, 255, 0.6);
            }
        }

        .renew-autoposts {
            display: block;
            float: right;
            /* margin-top: auto; */
            /* margin-bottom: auto; */
            position: absolute;
            /* bottom: 1px; */
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            border-color: rgba(255, 255, 255, 0.5);
            color: rgba(255, 255, 255, 0.9);

            &:hover {
                background-color: rgba(255, 255, 255, 0.3);
            }

            &:active {
                background-color: rgba(255, 255, 255, 0.6);
            }
        }

        h4 {
            font-size: 1.1rem;
            margin: 0;
            line-height: 100%;
        }

        .update {
            color: rgba(255, 255, 255, 0.6);
            font-size: 13px;
            width: 75%;
        }

        .next {
            margin-top: 0.5rem;
            color: rgba(255, 255, 255, 0.4);
            font-size: 11px;

            h5 {
                font-size: 0.8rem;
                margin: 0;
                line-height: 100%;
            }
        }

    }
}

.footer > :first-child, .footer > :last-child {
    flex-grow: 1;
    flex-basis: 0;
}

.chat-info-text {
    display: flex;
    align-items: center;
    flex: 1 51%;
    @media (max-width: breakpoint-max(xs)) {
        flex-basis: 100%;
    }
}

.message-time,
.message .message-time,
.ad-viewer .message-time {
    background-color: var(--messageTimeBgColor);
    color: var(--messageTimeFgColor);
    border-radius: 3px;
    padding-left: 3px;
    padding-right: 3px;
    padding-bottom: 2px;
    padding-top: 1px;
    margin-right: 3px;
    font-size: 80%;
}

.ad-viewer {
    display: block;

    h3 {
        font-size: 12pt;

        .message-time {
            padding-bottom: 1px;
        }
    }

    .border-bottom {
        margin-bottom: 15px;
        border-width: 1px;
    }
}

.user-view {
    .user-rank {
        font-size: 80%;
        margin-right: 2px;
    }

    .match-found {
        margin-left: 3px;
        padding-left: 2px;
        padding-right: 2px;
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.8);
        font-size: 75%;
        text-align: center;
        display: inline-block;
        text-transform: uppercase;
        line-height: 100%;
        padding-top: 2px;
        padding-bottom: 2px;

        &.unicorn {
            background-color: var(--scoreUnicornMatchBg);
            border: 1px solid var(--scoreUnicornMatchFg);
            box-shadow: 0 0 5px 0 rgba(255, 255, 255, 0.5);

            &::before {
                content: '🦄';
                padding-right:3px
            }
        }

        &.match {
            background-color: var(--scoreMatchBg);
            border: solid 1px var(--scoreMatchFg);
        }

        &.weak-match {
            background-color: var(--scoreWeakMatchBg);
            border: 1px solid var(--scoreWeakMatchFg);
        }

        &.weak-mismatch {
            background-color: var(--scoreWeakMismatchBg);
            border: 1px solid var(--scoreWeakMismatchFg);
        }

        &.mismatch {
            background-color: var(--scoreMismatchBg);
            border: 1px solid var(--scoreMismatchFg);
        }
    }
}

.messages.hide-non-matching .message.message-score {
    &.mismatch {
        display: none;
    }
}

.messages.filter-ads {
    .message.filter-match.message-ad {
    display: none;
    }
}

.messages.filter-channel-messages {
    .message.filter-match.message-message,
    .message.filter-match.message-action {
        display: none;
    }
}

.message {
    .message-pre {
        font-size: 75%;
        padding-right: 2px;
        padding-left: 1px;
        opacity: 0.90;
        display: inline-block;
    }

    &.message-event {
        font-size: 85%;
        background-color: rgba(255, 255, 255, 0.1);
    }

    &.message-score {
        padding-left: 5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);

        &.match {
            border-left: 12px solid var(--scoreStandoutMatchBorderColor);
            background-color: var(--scoreStandoutMatchBgColor);
            // border-left: 12px solid #027b02;
            // background-color: rgba(1, 115, 1, 0.45);
        }

        &.weak-match {
            border-left: 12px solid var(--scoreStandoutWeakMatchBorderColor);
            background-color: var(--scoreStandoutWeakMatchBgColor);

            .bbcode {
                filter: grayscale(0.25);
                opacity: 0.77;
            }
        }

        &.neutral {
            border-left: 12px solid var(--scoreStandoutNeutralBorderColor);

            .bbcode {
                filter: grayscale(0.5);
            }

            .bbcode,
            .user-view,
            .message-time,
            .message-pre,
            .message-post {
                opacity: 0.6;
            }
        };

        &.weak-mismatch {
            border-left: 12px solid var(--scoreStandoutWeakMismatchBorderColor);
            background-color: var(--scoreStandoutWeakMismatchBgColor);

            .bbcode {
                filter: grayscale(0.7);
            }

            .bbcode,
            .user-view,
            .message-time,
            .message-pre,
            .message-post {
                opacity: 0.55;
            }
        }

        &.mismatch {
            border-left: 12px solid var(--scoreStandoutMismatchBorderColor);

            .bbcode {
                filter: grayscale(0.8);
            }

            .bbcode,
            .user-view,
            .message-time,
            .message-pre,
            .message-post {
                opacity: 0.3;
            }
        }
    }
}

.message .user-avatar {
    max-height: 1.2em;
    min-height: 1.2em;
    margin-right: 2px !important;
    margin-top: 0;
    min-width: 1.2em;
    max-width: 1.2em;
}
</style>
