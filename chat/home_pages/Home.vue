<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page>
    <template v-slot:prescroll>
        <div class="d-flex justify-content-between">
            <span class="align-self-center">Welcome Home!</span>
            <span><!-- This span causes the button to expand to full height; not sure why its needed - flex maybe? -->
                <button type="button" class="btn btn-outline-secondary" @click.prevent="openWidgetOptions()">
                    <span class="fa-solid fa-screwdriver-wrench"></span>
                </button>
            </span>
        </div>
    </template>

    <template v-slot:default>
        <div class="d-flex flex-column flex-nowrap">
            <div class="d-flex flex-row"><!-- Top row -->
                <!-- Changelog and update alert -->
                <!-- Logs? -->
            </div>

            <div class="d-flex flex-row"><!-- Second row -->
                <slot name="chat"></slot>
            </div>

            <widget-options ref="widgetOptionsModal"></widget-options>
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
import { Component } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import WidgetOptions from './WidgetOptions.vue';

import core from '../core';

@Component({
    components: {
        'page': HomePageLayout,
        'widget-options': WidgetOptions,
    },
})
export default class Home extends Vue {
    widgets = core.state.generalSettings.widgets;

    openWidgetOptions() {
         (<WidgetOptions>this.$refs['widgetOptionsModal']).show();
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
</style>
