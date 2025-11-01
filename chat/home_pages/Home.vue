<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<home-page>
    <template v-slot:header>
        <span class="title">Welcome Home!</span>
        <span><!-- This span causes the button to expand to full height; not sure why its needed - flex maybe? -->
            <button type="button" class="btn btn-outline-secondary" @click.prevent="openWidgetOptions()">
                <span class="fa-solid fa-screwdriver-wrench"></span>
            </button>
        </span>
    </template>

    <template v-slot:default>
        Body content!
        <!-- Important logins and logouts -->
        <!-- Changelog and update alert -->
        <!-- Logs? -->
        <!-- Dev settings/info -->
         <slot name="chat"></slot>
         <widget-options ref="widgetOptionsModal"></widget-options>
    </template>

    <template v-slot:footer>
        <div>
            Footer content!
            <!-- Version --><!-- License -->
        </div>
    </template>
</home-page>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import WidgetOptions from './WidgetOptions.vue';

@Component({
    components: {
        'home-page': HomePageLayout,
        'widget-options': WidgetOptions,
    },
})
export default class Home extends Vue {
    openWidgetOptions() {
         (<WidgetOptions>this.$refs['widgetOptionsModal']).show();
    }
}
</script>

<style>
.home-page header .title {
    align-self: center;
}
</style>
