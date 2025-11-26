<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page prescrollClasses="p-2" scrollcageClasses="px-2" postscrollClasses="px-2 py-0">
    <template v-slot:prescroll>
        <div class="d-flex align-items-center" style="gap: 0.5rem;">
            <span class="mr-auto">Welcome Home!</span>
            <span v-if="logs">
                <a href="#" @click.prevent="showLogs()" class="btn btn-outline-secondary">
                    <span class="fa fa-file-alt"></span>
                    <span class="btn-text">{{ logsTitle }}</span>
                </a>
            </span>
            <span><!-- This span causes the button to expand to full height; not sure why its needed - flex maybe? -->
                <button type="button" class="btn btn-outline-secondary" @click.prevent="openWidgetOptions()">
                    <span class="fa-solid fa-screwdriver-wrench"></span>
                </button>

                <widget-options ref="widgetOptionsModal"></widget-options>
            </span>
        </div>
    </template>

    <template v-slot:default>
        <div class="d-flex flex-column flex-nowrap" style="gap: 1em;">
            <div class="home-row flex-row"><!-- Top row -->

            </div>

            <div v-show="widgets.news" class="home-row flex-row">
                <news></news>
            </div>

            <div v-show="widgets.activity" class="home-row flex-row"><!-- Second row -->
                <collapse v-show="shouldShowActivity" class="chat-container" bodyClass="p-0"
                    :initial="yohhlrf" @open="toggle.activity = false" @close="toggle.activity = true"
                >
                    <template v-slot:header>
                        Recent Activity
                    </template>
                    <template v-slot:button></template>
                    <template v-slot:default>
                        <slot name="chat"></slot>
                    </template>
                </collapse>
            </div>
        </div>
    </template>

    <template v-slot:postscroll>
        <div class="d-flex flex-wrap-reverse justify-content-between small border-top">
            <a href="#" @click.prevent="openLicense()" class="ml-auto d-flex flex-column align-items-end text-muted text-right text-decoration-none p-1"><!-- Version & License -->
                <span>Frolic is free software!</span>
                <span><span class="text-primary">Click here</span> to learn what that means.</span>
            </a>
        </div>
    </template>
</page>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import WidgetOptions from './WidgetOptions.vue';

import NewsWidget from './widgets/News.vue'
import Logs from '../Logs.vue';
import Collapse from '../../components/collapse.vue';

import core from '../core';
import l from '../localize';

import NewLogger from '../../helpers/log';
const logC = NewLogger('collapse');
//const logW = NewLogger('widgets');

@Component({
    components: {
        'page': HomePageLayout,
        'widget-options': WidgetOptions,

        'news':     NewsWidget,
        'collapse': Collapse,
    },
})
export default class Home extends Vue {
    widgets = core.state.generalSettings.widgets;

    openWidgetOptions() {
         (<WidgetOptions>this.$refs['widgetOptionsModal']).show();
    }


    @Prop({ default: undefined })
    readonly logs: Logs | undefined;

    logsTitle = l('logs.title');
    showLogs() { this.logs?.show() }


    get shouldShowActivity() { return !!core.conversations.activityTab.messages.length }
    get yohhlrf() { return this.toggle.activity ?? false }
    toggle = core.runtime.userToggles;

    @Hook('beforeMount')
    beforeMount() {
        logC.debug('NewsWidget.beforeCreate', { runtimeToggle: this.toggle.news })

        if (this.toggle.news === undefined) {
            //Vue.set(core.runtime.userToggles, 'news', false);
            this.toggle.news = false;
            logC.debug('NewsWidget.beforeCreate.createToggle', { runtimeToggle: this.toggle.news });
        }
    }


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
.home-row {
    display: flex;
}
</style>
