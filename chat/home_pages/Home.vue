<template>
<home-page>
    <template v-slot:header>
        Welcome Home!
        <span class="homepage-selector">
            <span>Default:</span>
            <span style="min-width: 7ch">{{ homeOrConsole }}</span>
            <slider color="info" round="true" v-model="defaultToHome"></slider>
        </span>
    </template>

    <template v-slot:default>
        Body content!
        <!-- Important logins and logouts -->
        <!-- Changelog and update alert -->
        <!-- Logs? -->
        <!-- Dev settings/info -->
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
import { Component, Hook, Watch } from '@f-list/vue-ts';
import core from './../core';
import l from '../localize';

import * as Electron from 'electron';

//import Logger from '../../helpers/log';
//const log = Logger('Home');

import HomePageLayout from './HomePageLayout.vue';
import Slider from '../../components/Slider.vue';

@Component({
    components: {
        'home-page': HomePageLayout,
        slider: Slider,
    }
})
export default class Home extends Vue {
    defaultToHome: boolean = true;

    get homeOrConsole() { return this.defaultToHome ? l('home') : core.conversations.consoleTab.name }

    @Hook('beforeMount')
    mounted() {
        this.defaultToHome = core.state.generalSettings.defaultToHome ?? true;
    }

    @Watch('defaultToHome')
    switch() {
        core.state.generalSettings.defaultToHome = this.defaultToHome;

        Electron.ipcRenderer.send('settings', core.state.generalSettings);
    }
}
</script>

<style>
.homepage-selector {
    display: inline-flex;
    align-items: center;

    > span {
        margin: 0 5px;
    }
}
</style>
