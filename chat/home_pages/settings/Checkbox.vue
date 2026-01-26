<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group form-check">
    <input type="checkbox" class="form-check-input" :id="setting" :checked="settings[setting]" @change="settings[setting] = $event.target.checked" :disabled="disabled" :aria-describedby="`${setting}Help`"/>
    <label class="form-check-label" :for="setting">{{ title }}</label>
    <small v-if="help" :id="`${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

import { Settings } from '../../interfaces';
import core from '../../core';
import l from '../../localize';

@Component({})
export default class Checkbox extends Vue {
    /**
     * Primary title of the element; also used for all localization.
     */
    @Prop({ required: true })
    readonly setting!: { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

    /**
     * If you need to add extra arguments to the label or the help text localizer, pass them here.
     */
    @Prop({ default: () => ({ title: [], help: [] }) })
    readonly localArgs!: { title?: string[]; help?: string[] };

    /**
     * If this entry depends on another entry, you can disable it.
     */
    @Prop({ default: false })
    readonly disabled!: boolean;

    get title() { return l(`settings.${this.setting}`,      ...(this.localArgs.title ?? [])) }
    get help()  { return l(`settings.${this.setting}.help`, ...(this.localArgs.help  ?? [])) }

    settings = core.state.settings;
}
</script>
