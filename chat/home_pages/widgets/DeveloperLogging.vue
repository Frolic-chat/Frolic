<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse :initial="yohhlrf" @open="toggle.devLogging = false" @close="toggle.devLogging = true">
    <template v-slot:header>
        Developer Debugging Tools
    </template>
    <template v-slot:default>
        <div class="d-flex flex-column">
            <div class="text-xl-center text-justify font-italic">This tool allows on-the-fly enabling and disabling of various developer-related messages in the console and developer logs. Enabling any of these will take up hard drive space for probably no benefit.</div>
            <hr class="my-3">
            <logs></logs>
        </div>
    </template>
</collapse>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';
import Vue from 'vue';

import LogViewer from '../../../devtools/LogViewer.vue';
import Collapse from '../../../components/collapse.vue';

import core from '../../core';

// import NewLogger from '../../../helpers/log';
// const log = NewLogger('home');

@Component({
    components: {
        'collapse': Collapse,
        'logs': LogViewer,
    }
})
export default class DeveloperLogging extends Vue {
    get yohhlrf() { return this.toggle.devLogging ?? true }
    toggle = core.runtime.userToggles;
}
</script>
