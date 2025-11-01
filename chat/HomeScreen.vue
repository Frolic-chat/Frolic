<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="home-screen" class="chat-panel">
    <!-- header of some kind... -->
    <tabs class="conversation-tabs" v-model="tab">
        <span class="channel-title">
            <span class="fa-solid fa-house-user"></span>
            <span class="tab-text">{{ tabNames[0] }}</span>
        </span>
        <span>
            <span class="fa-solid fa-terminal"></span>
            <span class="tab-text">{{ tabNames[1] }}</span>
        </span>
        <span>
            <span class="fa-solid fa-star"></span>
            <span class="tab-text">{{ tabNames[2] }}</span>
        </span>
        <span>
            <span class="fa-solid fa-screwdriver-wrench"></span>
            <span class="tab-text">{{ tabNames[3] }}</span>
        </span>
        <span>
            <span class="fa-solid fa-file-contract"></span>
            <span class="tab-text">{{ tabNames[4] }}</span>
        </span>
    </tabs>

    <!-- home page -->
    <home v-show="tab === '0'" role="tabpanel" ref="tab0" class="page" id="home"></home>
    <!-- Changelog and update alert -->
    <!-- Logs? -->
    <!-- Dev settings/info -->
    <!-- License -->

    <!-- Notes -->

    <!-- console -->
    <console v-show="tab === '1'" role="tabpanel" ref="tab1" class="page" id="console" :reportDialog="reportDialog">
    </console>

    <!-- Personality -->
    <div v-show="tab === '2'" role="tabpanel" ref="tab2" class="page" id="personalize"></div>
    <!-- parts of personality: -->
        <!-- Profile helper/suggestions -->
        <!-- Eidol builder -->
        <!-- Saved status editor -->
        <!-- Saved ads editor -->
        <!-- Eicon favoriter -->
        <!-- Friends/BM Manager -->

    <!-- Settings -->
    <settings v-show="tab === '3'" role="tabpanel" ref="tab3" class="page" id="settings"></settings>

    <!-- Drafts & Channel Settings -->
    <div v-show="tab === '4'" role="tabpanel" ref="tab3" class="page" id="personal-data"></div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';
import core from './core';
import l from './localize';


import Tabs from '../components/tabs';
import Home from './home_pages/Home.vue';
import ConversationView from './ConversationView.vue';
import Settings from './home_pages/Settings.vue';

import ReportDialog from './ReportDialog.vue';
import { Conversation } from './interfaces';

@Component({
    components: {
        tabs:    Tabs,
        home:    Home,
        console: ConversationView,
        settings: Settings,
        /*
        customize:
        settings:
        data:
        */
    }
})
export default class HomeScreen extends Vue {
    /**
     * The console conversation.
     * The ConversationView uses the global state to get the current conversation, so it will be the console whether we pass it through or not.
     */
    // @Prop({ required: true })
    // conversation!: Conversation.Conversation;

    /**
     * Use the global report dialog; exclusively here to pass to the console.
     */
    @Prop({ required: true })
    readonly reportDialog!: ReportDialog;

    @Prop({ default: 'conversation' })
    readonly tabSuggestion!: Conversation.TabType;

    /**
     * Index of the current tab; a string rep of a number. Keep `tab` and `tabNum` in sync.
     */
    tab = '0';
    /**
     * Pure numerical rep of current tab; keep `tab` and `tabNum` in sync.
     */
    tabNum = 0;

    readonly tabNames = [
        l('home'),
        core.conversations.consoleTab.name,
        core.connection.character,
        l('settings'),
        'Data',
    ] as const;

    home!: Home;
    console!: ConversationView;

    @Hook('created')
    created() {}

    @Hook('mounted')
    mounted() {
        window.addEventListener('keydown', this.onKey);

        this.home    = <Home>this.$refs['tab0'];
        this.console = <ConversationView>this.$refs['tab1'];
    }

    /**
     * Watches for alt+left, alt+right hotkeys to switch between tabs.
     * The 'tabNum watcher is invoked
     */
    onKey = (e: KeyboardEvent) => {
        if (core.conversations.selectedConversation !== core.conversations.consoleTab && core.conversations.selectedConversation !== null) {
            return;
        }

        if (e.repeat)
            return;

        if (e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
            if (e.key === "ArrowRight" && this.tabNum < 4)
                this.tab = (this.tabNum + 1).toString();
            else if (e.key === "ArrowLeft" && this.tabNum > 0)
                this.tab = (this.tabNum - 1).toString();
        }
    };

    @Watch('tab')
    onTabChanged() {
        this.tabNum = Number(this.tab);

        // Webpack complains `show` and `id` are "never", so fix that to "sometimes".
        const target = <{ show?: () => void, id?: string }>this.$refs[`tab${this.tab}`];
        if (!target)
            return;

        if ('show' in target && typeof target.show === 'function')
            target.show();

        // Also the input box seems scuff with two lines of text?
        if ('id' in target && target.id === 'console') {
            this.$nextTick(() => this.console.textBox.focus());
            core.conversations.consoleTab.show();
        }

        // desc = recon;
        const tabname = this.tabNames[this.tabNum];

        if (tabname === core.connection.character) {
            if (this.tabSuggestion !== 'description')
                this.$emit('tab-changed', 'description');
        }
        else if (tabname === l('settings') || tabname === 'Data') {
            if (this.tabSuggestion !== 'settings')
                this.$emit('tab-changed', 'settings');
        }
        else if (this.tabSuggestion !== 'conversation') { // if (tabname === l('home') || tabname === core.conversations.consoleTab.name)
            this.$emit('tab-changed', 'conversation');
        }
    }

    /** This doesn't always exist? Because the home screen is destroyed? */
    show() {
        if (this.tabSuggestion === 'settings')
            this.tab = this.tabNames.indexOf(l('settings')).toString();
        else if (this.tabSuggestion === 'description')
            this.tab = this.tabNames.indexOf(core.connection.character).toString();
        // Maybe all this rest can be redone now that we have conversations.activityTab
        else if (core.state.generalSettings.defaultToHome)
            this.tab = this.tabNames.indexOf(l('home')).toString();
        else
            this.tab = this.tabNames.indexOf(core.conversations.consoleTab.name).toString();

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
}

.conversation-tabs .nav-link {
    height: calc(100% + 1px);
    line-height: 1;

    padding-top:    0.25rem;
    padding-bottom: 0.25rem;

    align-content: end;

    &:has(.hidden-tab) {
        display: none;
    }
}

.conversation-tabs .channel-title {
    font-size: 1.25rem;
    font-weight: 500;
}

.conversation-tabs img {
    /* It really doesn't look that good, though. */
    height: 0.778em;
}

.conversation-tabs .tab-text {
    margin-left: 5px;
}
/** end Tab customization */

.chat-panel .page {
    /* normal margins for a conversation */
    margin: 0px 5px;
    display: flex;
    flex-direction: column;
    flex: 1 1 0%;
}
</style>
