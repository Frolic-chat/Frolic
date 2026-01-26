<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group form-check">
    <input type="checkbox" class="form-check-input" :id="`${prefix}-${setting}`" v-model="obj[setting]" :disabled="disabled" :aria-describedby="`${prefix}-${setting}Help`"/>
    <label class="form-check-label" :for="`${prefix}-${setting}`">{{ title }}</label>
    <small v-if="help" :id="`${prefix}-${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

import l from '../../localize';

@Component({})
export default class GenericCheckbox extends Vue {
    /**
     * Being a generic, we cannot narrow down the given object any further than recognizing the key may be valid.
     */
    @Prop({ required: true })
    readonly obj!: { [key: string]: any };

    /**
     * Custom prefix for UI elements; typically the object you're toggling members of.
     */
    @Prop({ default: '' })
    readonly prefix!: string;

    /**
     * In case you want to replace `settings.` with something else in the localization strings.
     */
    @Prop({ default: 'settings' })
    readonly localizationPrefix!: string;

    /**
     * Primary title of the element; also used for all localization.
     */
    @Prop({ required: true })
    readonly setting!: string;

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

    get title() {
        return l(`${this.localizationPrefix}.${this.prefix}.${this.setting}`,      ...(this.localArgs.title ?? []));
    }
    get help()  {
        return l(`${this.localizationPrefix}.${this.prefix}.${this.setting}.help`, ...(this.localArgs.help  ?? []));
    }
}
</script>
