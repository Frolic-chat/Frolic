<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="home-screen" class="chat-panel">
    <tabs class="conversation-tabs flex-shrink-0" v-model="tab">
        <span class="channel-title"><!-- Chat -->
            <span :class="{
                'fa-solid fa-house-user':  isHome,
                'fa       fa-star':        isOfficialChannel,
                'fa       fa-chart-gannt': isChannel && !isOfficialChannel,
                'fa-solid fa-user':        isPrivate,
            }"></span>
            <span class="tab-text d-none d-sm-inline">{{ tab0Name }}</span>
        </span>
        <span :class="{ 'hidden-tab': !secondaryConversation }"><!-- Linked conversation -->
            <span v-if="isHome" class="fa-solid fa-terminal"></span>
            <span v-else class="fa-solid fa-link"></span>
            <span class="tab-text d-none d-sm-inline">{{ tab1Name }}</span>
        </span>
        <span><!-- Personalize/Description/Recon -->
            <span :class="{
                'fa-solid fa-user-pen':       isHome,
                'fa-solid fa-align-left':     isChannel,
                'fa-solid fa-satellite-dish': isPrivate,
            }"></span>
            <span class="tab-text d-none d-sm-inline">{{ tab2Name }}</span>
        </span>
        <span><!-- Settings -->
            <span class="fa-solid fa-screwdriver-wrench"></span>
            <span class="tab-text d-none d-sm-inline">{{ tab3Name }}</span>
        </span>
        <span><!-- Data -->
            <span class="fa-solid fa-file-contract"></span>
            <span class="tab-text d-none d-sm-inline">{{ tab4Name }}</span>
        </span>
    </tabs>

    <!-- Pseudo-teleport -->
    <convo v-show="tab === '0'" ref="primaryView" :conversation="primaryConversation"
        :logs="logs" :reportDialog="reportDialog" :commandHelp="commandHelp"
        :class="isHome ? '' : 'page'"
           :id="isHome ? '' : 'home'"
         :role="isHome ? '' : 'tabpanel'"
    ></convo>

    <!-- home page -->
    <home v-if="isHome" v-show="tab === '0'" role="tabpanel" class="page" id="home" @navigate="handleNavigation">
        <template v-slot:chat>
            <div ref="primaryContainer" id="primary-container-in-home" style="display: contents;"></div>
        </template>
        <!-- Logs? -->
        <!-- License -->
        <!-- Notes -->
        <!-- Drafts -->
    </home>

    <div v-else ref="primaryContainer" id="primary-container-full-screen" style="display: contents;"></div>

    <!-- console -->
    <convo v-if="secondaryConversation" v-show="tab === '1'" class="page" id="linked-conversation" ref="secondaryView" :conversation="secondaryConversation" :logs="logs" :reportDialog="reportDialog" :commandHelp="commandHelp" role="tabpanel"></convo>

    <page v-else v-show="tab === '1'" role="tabpanel" class="page" id="linked-conversation"></page>

    <keep-alive>
    <!-- Personality -->
    <personality v-if="isHome" v-show="tab === '2'" role="tabpanel" class="page" id="recon"></personality>

    <!-- Channel description -->
    <page v-else-if="isChannel" v-show="tab === '2'">
        <template v-if="primaryDescription">
            <bbcode :text="primaryDescription"></bbcode>
        </template>

        <hr v-if="primaryDescription && secondaryDescription">

        <template v-if="secondaryDescription">
            {{ secondaryConversation ? secondaryConversation.name : '' }}
            <bbcode :text="secondaryDescription"></bbcode>
        </template>
    </page>

    <!-- Recon -->
    <page v-else-if="isPrivate" v-show="tab === '2'">
        This is where recon goes. :)
        - Last spoken to (last message?)
        - Last note exchange. Write new note? Memo writer.
        -
    </page>
    </keep-alive>

    <!-- Settings -->
    <char-settings v-if="isHome" v-show="tab === '3'" role="tabpanel" class="page" id="settings"></char-settings>

    <page v-else v-show="tab === '3'" role="tabpanel" class="page" id="settings">
        <!-- header -->
        <convo-settings :conversation="primaryConversation"></convo-settings>
        <template v-if="secondaryConversation">
            <hr>
            <convo-settings :conversation="secondaryConversation"></convo-settings>
        </template>
    </page>

    <data-page v-show="tab === '4'" role="tabpanel" class="page" id="personal-data" :conversation="conversation">
        <template v-slot:title>
            Data for {{ isHome ? 'Frolic' : conversation.name }}
        </template>
    </data-page>

    <!-- Modals for the conversation: -->
    <logs ref="logsDialog" :conversation="conversation"></logs>
    <command-help ref="commandHelpDialog"></command-help>
    <!-- + reportDialog -->
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';

import Tabs from '../components/tabs';
import HomePageLayout from './home_pages/HomePageLayout.vue';

import Home from './home_pages/Home.vue';
import Data from './home_pages/Data.vue';
import ConversationView from './ConversationPage.vue';
import Personality from './home_pages/Personalization.vue';
import Settings from './home_pages/Settings.vue';
import ConversationSettings from './ConversationSettings.vue';

import type ReportDialog from './ReportDialog.vue';
import      CommandHelp  from './CommandHelp.vue';
import      Logs         from '../chat/Logs.vue';

import { Conversation } from './interfaces';
import { getAsNumber } from '../helpers/utils';
import core from './core';
import l from './localize';

import NewLogger from '../helpers/log';
const log = NewLogger('Home');
const logC = NewLogger('conversation');

@Component({
    components: {
        tabs: Tabs,

        home: Home,
        page: HomePageLayout,
        'data-page': Data,

        'convo':          ConversationView,
        'personality':    Personality,
        'char-settings':  Settings,
        'convo-settings': ConversationSettings,
        /*
        customize:
        data:
        */

        // Modals:
        logs: Logs,
        'command-help': CommandHelp,
    }
})
export default class HomeScreen extends Vue {
    get conversation() { return core.conversations.selectedConversation }

    @Prop({ default: false })
    readonly activeConversationClicked: boolean = false;

    /**
     * Use the global report dialog; exclusively here to pass to the conversation.
     */
    @Prop({ required: true })
    readonly reportDialog!: ReportDialog;

    commandHelp!: CommandHelp;
    logs!: Logs;

    activityTab = core.conversations.activityTab;
    consoleTab  = core.conversations.consoleTab;

    /**
     * Link two channels together to have them display in the same chat window.
     * Useful for linking IC + OOC rooms into a cohesive unit.
     */
    linkedChannel = undefined; // Unused; useful for linking IC + OOC channels.

    /**
     * Index of the current tab; a string rep of a number. Keep `tab` and `tabNum` in sync.
     */
    tab = '0';
    /**
     * Pure numerical rep of current tab; keep `tab` and `tabNum` in sync.
     */
    tabNum = 0;

    get isHome()    { return this.conversation === this.activityTab
                          || this.conversation === this.consoleTab     }
    get isPrivate() { return Conversation.isPrivate(this.conversation) }
    get isChannel() { return Conversation.isChannel(this.conversation) }

    get isOfficialChannel() {
        if (Conversation.isChannel(this.conversation)) {
            return this.conversation.channel.id.substring(0,4) !== 'adh-'
                ? true
                : false;
        }
        else {
            return false;
        }
    }

    get primaryConversation()   { return this.isHome ? this.activityTab : this.conversation  }
    get secondaryConversation() { return this.isHome ? this.consoleTab  : this.linkedChannel }

    get primaryDescription() {
        return Conversation.isChannel(this.primaryConversation)
            ? this.primaryConversation.channel.description
            : undefined;
    }

    get secondaryDescription() {
        return this.secondaryConversation && Conversation.isChannel(this.secondaryConversation)
            ? this.secondaryConversation.channel.description
            : undefined;
    }

    get tab0Name() {
        if (this.isHome)    return l('home.tab.home');
        if (this.isPrivate) return this.conversation.name;
        if (this.isChannel) return this.conversation.name;
    }

    get tab1Name() {
        if (this.isHome)    return core.conversations.consoleTab.name;
        if (this.isPrivate) return this.secondaryConversation?.name ?? ''; // When could you ever do this?
        if (this.isChannel) return this.secondaryConversation?.name ?? ''; // Linked channel name, probably
    }

    get tab2Name() {
        if (this.isHome)    return core.connection.character;
        if (this.isPrivate) return l('home.tab.recon');
        if (this.isChannel) return l('home.tab.description');
    }

    get tab3Name() { return l('home.tab.settings') }

    get tab4Name() { return l('home.tab.data') }

    primaryView!:  ConversationView;
    secondaryView: ConversationView | undefined;

    @Hook('created')
    created() {}

    @Hook('mounted')
    mounted() {
        this.primaryView   = this.$refs['primaryView']   as ConversationView;
        this.secondaryView = this.$refs['secondaryView'] as ConversationView | undefined;

        this.logs        = this.$refs['logsDialog'] as Logs;
        this.commandHelp = this.$refs['commandHelpDialog'] as CommandHelp;
        // reportDialog is passed in as prop.

        window.addEventListener('keydown', this.onKey);

        logC.debug('UniversalHome mounted.', {
            primaryConvo: this.primaryView?.conversation?.name,
            secondConvo:  this.secondaryView?.conversation?.name,
        });

        this.moveConvo();
    }

    @Hook('beforeDestroy')
    destroy() {
        window.removeEventListener('keydown', this.onKey);
    }

    @Watch('activeConversationClicked')
    updateFromOnHigh() {
        if (this.tab === '0') {
            if (this.secondaryConversation)
                this.tab = '1';
        }
        else {
            this.tab = '0';
        }
    }

    /**
     * Watches for alt+left, alt+right hotkeys to switch between tabs.
     * The 'tabNum watcher is invoked
     */
    onKey = (e: KeyboardEvent) => {
        if (e.repeat)
            return;

        if (e.key === 'Escape') {
            if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey)
                return;

            this.scrollConversation();
            this.focusInput();
        }

        if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
            if (e.key === "ArrowRight" && this.tabNum < 4) {
                this.tab = this.tab === '0' && !this.secondaryConversation
                    ? (this.tabNum + 2).toString()
                    : (this.tabNum + 1).toString();
            }
            else if (e.key === "ArrowLeft" && this.tabNum > 0) {
                this.tab = this.tab === '2' && !this.secondaryConversation
                    ? (this.tabNum - 2).toString()
                    : (this.tabNum - 1).toString();
            }
        }
    };

    /**
     * Home-page navigation expects this structure:
     * ```ts
     * {
     *   // selectedConversation will be set to this
     *   conversation: Conversation,
     *   // change to this tab.
     *   tab: number | string,
     *   // Scroll to this id in the page.
     *   section: string | nullish,
     * }
     * ```
     * @param e
     */
    handleNavigation(e: { tab?: any, conversation?: any, section?: any } | string | number | undefined | null) {
        if (typeof e !== 'object') return;
        if (!e)                    return;

        if (typeof e.tab === 'number' && e.tab <= 4) {
            this.tab = e.tab.toString();
        }
        else if (typeof e.tab === 'string') {
            const n = getAsNumber(e.tab);
            if (n && n <= 4)
                this.tab = e.tab.toString();
        }

        if (e.conversation && typeof e.conversation === 'object') {
            if ('key' in e.conversation || 'channel' in e.conversation || 'character' in e.conversation) {
                const s = e.conversation as Conversation;

                if (Conversation.isPrivate(s) || Conversation.isChannel(s)
                ||  Conversation.isConsole(s) || Conversation.isActivity(s)) {
                    this.$nextTick(() => s.show());
                }
            }
        }

        if (typeof e.section === 'string') {
            const s = e.section;
            this.$nextTick(() => {
                this.$nextTick(() => {
                    const el = document.getElementById(s);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                });
            });
        }
    }

    /**
     * detect selectedConversation changes; always use new_convo.show() as that calls old_convo.onHide() automatically.
     *
     * Tab doesn't change on selecting a conversation. This is deliberate; clear messages only if proper tab is selected.
     */
    @Watch('conversation')
    onConversationChanged(n: Conversation, _o: Conversation) {
        this.secondaryView = this.$refs['secondaryView'] as ConversationView | undefined;

        log.debug('Watch(conversation):', this.conversation.name, {
            isPrimary:   this.conversation === this.primaryConversation,
            isSecondary: this.conversation === this.secondaryConversation,
            secondary: this.secondaryConversation !== undefined,
            tab: this.tab,
        });

        if (this.tab === '0') {
            if (n === this.primaryConversation) {
                n.clearUnread();
            }
            else if (n === this.secondaryConversation) {
                this.tab = '1';
            }
        }
        if (this.tab === '1') {
            if (n === this.secondaryConversation) {
                n.clearUnread();
            }
            else { // So we're on tab 1 but no conversation on that tab...
                this.tab = '0';
            }
        }
        // Not on tab 0 or 1:
        //     don't clear unread messages.
    }

    @Watch('isHome')
    moveConvo() {
        this.$nextTick(() => {
            logC.debug('Conversation mover triggered.', this.primaryView?.conversation?.name);

            if (!this.primaryView || !this.primaryView.$el)
                return;

            const convoEl = this.primaryView.$el;
            const target = (this.$refs['primaryContainer'] as HTMLDivElement | undefined);

            if (target && target !== convoEl.parentNode)
                target.appendChild(convoEl);
        });
    }

    /**
     * Tab change events don't happen automatically. Either the player changed the tab on the current conversation (can trigger a conversation change), or the conversation watcher made it change.
     */
    @Watch('tab')
    onTabChanged() {
        log.debug('Watch(tab):', this.tab, {
            isPrimary:   this.conversation === this.primaryConversation,
            isSecondary: this.conversation === this.secondaryConversation,
            secondary: this.secondaryConversation !== undefined,
            conversation: this.conversation.name,
        });

        this.tabNum = Number(this.tab);

        if (this.tab === '0') {
            this.$nextTick(() => {
                if (this.primaryConversation !== this.activityTab) {
                    this.primaryView.textBox.focus();
                    this.scrollConversation();
                }
            });

            if (this.conversation === this.primaryConversation)
                this.conversation.clearUnread();
            else
                this.primaryConversation.show();
        }
        else if (this.tab === '1') {
            this.$nextTick(() => {
                this.secondaryView?.textBox.focus();
                this.scrollConversation();
            });

            if (this.conversation === this.secondaryConversation) {
                this.conversation.clearUnread();
            }
            else {
                if (this.secondaryConversation) {
                    this.secondaryConversation.show();
                }
                else { // Fallback; shouldn't happen.
                    this.tab = '0';
                    console.warn('tried to swap to tab 1 without secondary conversation, changed tab to 0.');
                }
            }
        }

        // Webpack complains `show` and `id` are "never", so fix that to "sometimes".
        const target = <{ show?: () => void }>this.$refs[`tab${this.tab}`];
        if (!target)
            return;

        // Wait for vue to update the screen so we actually have DOM elements to play with.
        this.$nextTick(() => {
            // If the tab has custom show() functionality...
            if ('show' in target && typeof target.show === 'function')
                target.show();

            // ... and second, the contents.
            // if (this.tabNum === 0) {
            //     if (this.isHome) {
            //         if (this.conversation !== this.primaryConversation)
            //             this.primaryConversation.show();
            //     }
            //     else {
            //         if (this.primaryConversation !== this.activityTab)
            //             this.primaryView.textBox.focus();
            //     }
            // }
            // else if (this.tabNum === 1) {
            //     if (this.isHome) {
            //         if (this.secondaryConversation && this.conversation !== this.secondaryConversation)
            //             this.secondaryConversation.show();
            //     }

            //     this.secondaryView?.textBox.focus();
            // }
        });
    }

    scrollConversation() {
        if (this.tab === '0')
            this.primaryView.scrollMessageView();
        if (this.tab === '1')
            this.secondaryView?.scrollMessageView();
    }

    focusInput() {
        if (this.tab === '0' && this.primaryConversation !== this.activityTab)
            this.primaryView.textBox.focus();
        else if (this.tab === '1')
            this.secondaryView?.textBox.focus();
    }
}
</script>

<style lang="scss">
@import "~bootstrap/scss/functions";
@import "~bootstrap/scss/variables";
@import "~bootstrap/scss/mixins/breakpoints";

.chat-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
}

.conversation-tabs {
    /* Don't overlap the sidebar toggle */
     @media (min-width: breakpoint-min(md)) {
        margin-right: 32px;
    }

    .nav-link {
        height: calc(100% + 1px);
        line-height: 1;

        padding-top:    0.25rem;
        padding-bottom: 0.25rem;

        align-content: end;

        &:has(.hidden-tab) {
            display: none;
        }
    }

    .channel-title {
        font-size: 1.25rem;
        font-weight: 500;
    }

    img {
        /* It really doesn't look that good, though. */
        height: 0.778em;
    }

    .tab-text {
        margin-left: 5px;
    }
}

.chat-panel .page {
    /* normal margins for a conversation */
    margin: 0px 5px;
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
}
</style>
