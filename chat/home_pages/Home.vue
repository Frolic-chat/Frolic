<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page scrollcageClasses="px-2" postscrollClasses="px-2 py-0">
    <template v-slot:prescroll>
        <div class="page-header d-flex align-items-center">
            <span class="mr-auto">
                <h5 class="text-truncate mb-0">
                    Welcome Home!
                </h5>
            </span>
            <span class="ml-auto flex-shrink-0">
                <slot name="title-end"></slot>
            </span>
        </div>
    </template>

    <template v-slot:default>
        <div class="d-flex flex-column flex-nowrap" style="gap: 1em;">
            <div v-show="widgets.news" :style="newsStyle" class="home-row flex-row">
                <news @update="handleNewsUpdate"></news>
            </div>

            <div v-show="widgets.activity && shouldShowActivity" class="home-row flex-row">
                <recent-activity></recent-activity>
            </div>

            <div v-show="widgets.scratchpad" class="home-row flex-row">
                <scratchpad></scratchpad>
            </div>

            <div v-show="widgets.inbox" class="home-row flex-row">
                <note-status></note-status>
            </div>

        </div>
    </template>

    <template v-slot:postscroll>
        <div class="d-flex flex-wrap-reverse justify-content-between small border-top">
            <span class="mr-auto d-flex align-items-center"><!-- This span causes the button to expand to full height; not sure why its needed - flex maybe? -->
            </span>

            <span class="ml-auto d-flex align-items-center">
                <a href="#" @click.prevent="openLicense()" class="d-flex flex-column align-items-end text-muted text-right text-decoration-none p-1"><!-- Version & License -->
                    <span>Frolic is free software!</span>
                    <span>
                        <span class="text-primary">Click here</span> to learn what that means.
                    </span>
                </a>
            </span>
        </div>
    </template>
</page>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@frolic/vue-ts';

import HomePageLayout from './HomePageLayout.vue';

import RecentActivity from './widgets/Activity.vue';
import NewsWidget from './widgets/News.vue';
import Scratchpad from './widgets/Scratchpad.vue';
import NoteStatus from '../../site/NoteStatus.vue';
import Collapse from '../../components/collapse.vue';

import core from '../core';

// import NewLogger from '../../helpers/log';
// const logC = NewLogger('collapse');
//const logW = NewLogger('widgets');

@Component({
    components: {
        'page': HomePageLayout,

        'collapse': Collapse,

        'recent-activity': RecentActivity,
        'news':            NewsWidget,
        'scratchpad':      Scratchpad,
        'note-status':     NoteStatus,
    },
})
export default class Home extends Vue {
    widgets = core.state.generalSettings.widgets;
    /**
     * Temporarily needed for the rising setting control. At some point, that can be moved into the widget settings in general settings.
     */
    settings = core.state.settings;


    newsStyle = '';
    handleNewsUpdate(hasNews: boolean) {
        if (hasNews) this.newsStyle = '';
        else         this.newsStyle = 'order: 999;';
    }


    get shouldShowActivity() { return !!core.conversations.activityTab.members.length }

    openLicense() {
        this.$emit("navigate", {
            conversation: null, // set selectedConversation to this.
            tab: 4,             // set tab to this.
            section: 'frolic-licenses', // try to find id named this in the page and scroll to it.
        });
    }
}
</script>

<style lang="scss">
.page-header {
    > .ml-auto, > .mr-auto {
        display: flex;
        align-items: center;
        height: 3em;
        gap: 0.5rem;
    }
}

.home-row {
    display: flex;
}
</style>
