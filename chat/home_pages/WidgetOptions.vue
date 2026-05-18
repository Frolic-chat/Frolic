<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<modal ref="dialog" :action="title" :buttons="false">
  <div class="d-flex flex-column">
    <div class="text-center">{{ defaultHome }}</div>
    <div class="btn-group btn-group-toggle" role="group" aria-label="Default to home toggle">
      <label class="btn btn-secondary" :class="{ 'active': settings.defaultToHome }">
        <input v-model="settings.defaultToHome" type="radio" :value="true">
        {{ home }}
      </label>

      <label class="btn btn-secondary" :class="{ 'active': !settings.defaultToHome }">
        <input v-model="settings.defaultToHome" type="radio" :value="false">
        {{ console }}
      </label>
    </div>
    <small>{{ homeSwitchTip }}</small>
  </div>

  <div class="form-group"><hr></div>

  <div class="form-group">
    {{ desc }}
    <template v-for="(_, k) in availableOptions">
      <generic-check :key="k" :obj="widgets" prefix="widgets" :setting="k" class="mb-1"></generic-check>
      <checkbox v-if="k === 'inbox'" :key="`${k}2`" setting="risingShowUnreadOfflineCount" :disabled="!widgets.inbox" class="pl-5"></checkbox>
    </template>
  </div>
</modal>
</template>

<script lang="ts">
import { Component } from '@frolic/vue-ts';

import Checkbox from './settings/Checkbox.vue';
import GenericCheckbox from './settings/GenericCheckbox.vue';

import Modal from '../../components/Modal.vue';
import CustomDialog from '../../components/custom_dialog';

import core from '../core';
import l from '../localize';

@Component({
    components: {
        modal:           Modal,
        checkbox:        Checkbox,
        'generic-check': GenericCheckbox,
    },
})
export default class WidgetOptions extends CustomDialog {
    settings = core.state.generalSettings;
    widgets  = core.state.generalSettings.widgets;

    title       = l('home.widgetOptions.title');

    defaultHome = l('home.widgetOptions.defaultHome');
    homeSwitchTip = l('home.widgetOptions.switchTip');
    home        = l('home');
    console     = l('chat.consoleTab');

    desc        = l('home.widgetOptions.desc');

    reject: Array<keyof WidgetOptions['widgets']> = [ 'events', 'match', 'suggestions' ];

    get availableOptions() {
        return (Object.keys(this.widgets) as Array<keyof WidgetOptions['widgets']>).reduce<Partial<WidgetOptions['widgets']>>(
            (box, widget) => {
                if (!this.reject.includes(widget))
                    Object.assign(box, { [widget]: this.widgets[widget] });

                return box;
            },
            {}
        );
    }
}
</script>

<style lang="scss">
</style>
