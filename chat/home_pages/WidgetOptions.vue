<template>
<modal :action="title" ref="dialog" :buttons="false">
    <div class="d-flex flex-column">
        <div class="text-center">{{ defaultHome }}</div>
        <div class="btn-group btn-group-toggle" role="group" aria-label="Default to home toggle">
            <label class="btn btn-secondary" :class="{ 'active': settings.defaultToHome }">
                <input type="radio" v-model="settings.defaultToHome" :value="true">
                {{ home }}
            </label>

            <label class="btn btn-secondary" :class="{ 'active': !settings.defaultToHome }">
                <input type="radio" v-model="settings.defaultToHome" :value="false">
                {{ console }}
            </label>
        </div>
    </div>

    <div class="form-group"><hr></div>

    <div class="form-group">
        {{  desc }}
        <template v-for="(_, k) in widgets">
            <checkbox :obj="widgets" prefix="widgets" :setting="k"></checkbox>
        </template>
    </div>

</modal>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';

import GenericCheckbox from './settings/GenericCheckbox.vue';

import modal from '../../components/Modal.vue';
import CustomDialog from '../../components/custom_dialog';

import core from '../core';
import l from '../localize';

@Component({
    components: {
        modal,
        checkbox: GenericCheckbox,
    },
})
export default class WidgetOptions extends CustomDialog {
    settings = core.state.generalSettings
    widgets  = core.state.generalSettings.widgets;

    title = l('home.widgetOptions.title');

    defaultHome = l('home.widgetOptions.defaultHome');
    home        = l('home');
    console     = l('chat.consoleTab');

    desc        = l('home.widgetOptions.desc');
}
</script>

<style lang="scss">
</style>
