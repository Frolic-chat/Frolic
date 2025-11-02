<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="home-screen" class="chat-panel">
    <tabs class="conversation-tabs" v-model="tab">
        <span class="channel-title"><!-- Chat -->
            <span :class="{
                'fa-solid fa-house-user':  isHome,
                'fa       fa-star':        isOfficialChannel,
                'fa       fa-chart-gannt': isChannel && !isOfficialChannel,
                'fa-solid fa-user':        isPrivate,
            }"></span>
            <span class="tab-text">{{ tab0Name }}</span>
        </span>
        <span :class="{ 'hidden-tab': !secondaryConversation }"><!-- Linked conversation -->
            <span class="fa-solid fa-terminal"></span>
            <span class="tab-text">{{ tab1Name }}</span>
        </span>
        <span><!-- Personalize/Description/Recon -->
            <span :class="{
                'fa user-pen':                isHome,
                'fa-solid fa-align-left':     isChannel,
                'fa-solid fa-satellite-dish': isPrivate,
            }"></span>
            <span class="tab-text">{{ tab2Name }}</span>
        </span>
        <span><!-- Settings -->
            <span class="fa-solid fa-screwdriver-wrench"></span>
            <span class="tab-text">{{ tab3Name }}</span>
        </span>
        <span><!-- Data -->
            <span class="fa-solid fa-file-contract"></span>
            <span class="tab-text">{{ tab4Name }}</span>
        </span>
    </tabs>

    <!-- home page -->
    <keep-alive>
    <home v-if="isHome" v-show="tab === '0'" role="tabpanel" class="page" id="home">
        <template v-slot:chat>
            <convo ref="primaryView" :conversation="activityTab" :reportDialog="reportDialog" style="max-width: 50%;"></convo>
        </template>
        <!-- Logs? -->
        <!-- License -->
        <!-- Notes -->
        <!-- Drafts -->
    </home>
    <convo v-else v-show="tab === '0'" role="tabpanel" class="page" id="home" ref="primaryView" :conversation="primaryConversation" :reportDialog="reportDialog"></convo>
    </keep-alive>

    <!-- console -->
    <convo v-if="secondaryConversation" v-show="tab === '1'" role="tabpanel" class="page" id="linked-conversation" :conversation="secondaryConversation" :reportDialog="reportDialog" ref="secondaryView"></convo>
    <page v-else v-show="tab === '1'" role="tabpanel" class="page" id="linked-conversation"></page>

    <!-- Personality -->
    <page v-show="tab === '2'" role="tabpanel" class="page" id="recon">
        <div v-if="isHome">
            This is where your personality helper goes.
        </div>

        <div v-else-if="isChannel">
            <template v-if="primaryDescription">
                {{ primaryConversation.name }}
                <bbcode :text="primaryDescription"></bbcode>
            </template>

            <hr v-if="primaryDescription && secondaryDescription">

            <template v-if="secondaryDescription">
                {{ secondaryConversation ? secondaryConversation.name : '' }}
                <bbcode :text="secondaryDescription"></bbcode>
            </template>
        </div>

        <div v-else-if="isPrivate">
            This is where recon goes. :)
        </div>

        <!-- parts of personality: -->
        <!-- Profile helper/suggestions -->
        <!-- Eidol builder -->
        <!-- Saved status editor -->
        <!-- Saved ads editor -->
        <!-- Eicon favoriter -->
        <!-- Friends/BM Manager -->
    </page>

    <!-- Settings -->
     <keep-alive>
        <char-settings v-if="isHome" v-show="tab === '3'" role="tabpanel" class="page" id="settings"></char-settings>
        <page v-else v-show="tab === '3'" role="tabpanel" class="page" id="settings">
            <!-- header -->
            <convo-settings :conversation="primaryConversation"  ></convo-settings>
            <template v-if="secondaryConversation">
                <hr>
                <convo-settings :conversation="secondaryConversation"></convo-settings>
            </template>
        </page>
    </keep-alive>

    <page v-show="tab === '4'" role="tabpanel" class="page" id="personal-data">
        <!-- Dev settings/info -->
            <div class="row">
                <div class="col-auto">Logging:</div>
                <div class="col">Y/N, Log directory</div>
            </div>
            <template v-if="isChannel">
                <div class="row">
                    <div class="col-auto">Level:</div>
                    <div class="col">Are you op?</div>
                </div>
                <div class="row">
                    <div class="col-auto">Chat modes:</div>
                    <div class="col">Ads/Chat/Both?</div>
                </div>
            </template>
    </page>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';

import Tabs from '../components/tabs';
import Home from './home_pages/Home.vue';
import HomePageLayout from './home_pages/HomePageLayout.vue';
import ConversationView from './ConversationPage.vue';
import Settings from './home_pages/Settings.vue';
import ConversationSettings from './ConversationSettings.vue';

import { Conversation } from './interfaces';
import ReportDialog from './ReportDialog.vue';

import core from './core';
import l from './localize';

import NewLogger from '../helpers/log';
const l_h = core.state.generalSettings.argv.includes('--debug-home');
const log = NewLogger('Home', () => l_h);

@Component({
    components: {
        tabs:    Tabs,

        home:             Home,
        page:             HomePageLayout,

        'convo':          ConversationView,
        'char-settings':  Settings,
        'convo-settings': ConversationSettings,
        /*
        customize:
        data:
        */
    }
})
export default class HomeScreen extends Vue {
    get conversation() { return core.conversations.selectedConversation }

    /**
     * Use the global report dialog; exclusively here to pass to the conversation.
     */
    @Prop({ required: true })
    readonly reportDialog!: ReportDialog;

    /**
     * Used to externally broadcast the current tab. This can go away when tab numbers are synchronized across all chat windows; tab 1 = tab 1 (or tab 2?); tab 3 is always desc/customize/recon, etc.
     */
    @Prop({ default: 'conversation' })
    readonly tabSuggestion!: Conversation.TabType;

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

    get primaryView()   { return this.$refs['primaryView']   as ConversationView             }
    get secondaryView() { return this.$refs['secondaryView'] as ConversationView | undefined }

    @Hook('created')
    created() {}

    @Hook('mounted')       mounted() { window.addEventListener('keydown', this.onKey)    }
    @Hook('beforeDestroy') destroy() { window.removeEventListener('keydown', this.onKey) }

    /**
     * Watches for alt+left, alt+right hotkeys to switch between tabs.
     * The 'tabNum watcher is invoked
     */
    onKey = (e: KeyboardEvent) => {
        if (e.repeat)
            return;

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
     * detect selectedConversation changes; always use new_convo.show() as that calls old_convo.onHide() automatically.
     *
     * Tab doesn't change on selecting a conversation. This is deliberate; clear messages only if proper tab is selected.
     */
    @Watch('conversation')
    onConversationChanged(n: Conversation, _o: Conversation) {
        log.debug('Watch(conversation):', this.conversation.name, {
            isPrimary:   this.conversation === this.primaryConversation,
            isSecondary: this.conversation === this.secondaryConversation,
            secondary: this.secondaryConversation !== undefined,
            tab: this.tab,
        });

        if (this.tab === '0') {
            if (n === this.primaryConversation) { // I don't think this can fail.
                n.clearUnread();
            }
        }
        if (this.tab === '1') {
            if (this.secondaryConversation && n === this.secondaryConversation) {
                n.clearUnread();
            }
            else { // So we're on tab 1 but no conversation on that tab...
                this.tab = '0';
            }
        }
        // Not on tab 0 or 1:
        //     don't clear unread messages.
    }

    /**
     * Tab change events don't happen automatically. Either the player changed the tab on the current conversation (can trigger a conversation change)
     * If tab-change event takes us to a channel tab, clear that channel's unread messages.
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
                if (this.primaryConversation !== this.activityTab)
                        this.primaryView.textBox.focus();
            });

            if (this.conversation === this.primaryConversation)
                this.conversation.clearUnread();
            else
                this.primaryConversation.show();
        }
        else if (this.tab === '1') {
            this.$nextTick(() => this.secondaryView?.textBox.focus());

            if (this.conversation === this.secondaryConversation)
                this.conversation.clearUnread();
            else {
                if (this.secondaryConversation)
                    this.secondaryConversation.show();
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

            // ... and second, the conents.
            if (this.tabNum === 0) {
                if (this.isHome) {
                    if (this.conversation !== this.primaryConversation)
                        this.primaryConversation.show();
                }
                else {
                    if (this.primaryConversation !== this.activityTab)
                        this.primaryView.textBox.focus();
                }
            }
            else if (this.tabNum === 1) {
                if (this.isHome) {
                    if (this.secondaryConversation && this.conversation !== this.secondaryConversation)
                        this.secondaryConversation.show();
                }

                this.secondaryView?.textBox.focus();
            }

        });
    }
}
</script>

<style lang="scss">
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
