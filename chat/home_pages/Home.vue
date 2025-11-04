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
            <div class="d-flex flex-row">
                Body content!
                <!-- Important logins and logouts -->
                <!-- Changelog and update alert -->
                <!-- Logs? -->
                <!-- Dev settings/info -->
            </div>

            <div class="d-flex flex-row">
                <div v-show="widgets.activity" class="chat-container ml-auto">
                    <slot name="chat"></slot>
                </div>
            </div>

            <widget-options ref="widgetOptionsModal"></widget-options>
        </div>
    </template>

    <template v-slot:postscroll>
        <div>
            Footer content!
            <!-- Version --><!-- License -->
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
}
</script>

<style>
</style>
