<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group">
    <label class="form-label" :for="setting">{{ title }}</label>
    <!-- We cannot use v-model.lazy because we want the numeric validation. -->
    <input type="number" class="form-control" :id="setting" @blur="set" @keyup.enter="set" :value="settings[setting]" :disabled="disabled" :min="min" :max="max" :placeholder="ph" :aria-describedby="`${setting}Help`" ref="number"/>
    <small v-if="help" :id="`${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@f-list/vue-ts';

import { Settings } from '../../interfaces';
import core from '../../core';
import l from '../../localize';

import NewLogger from '../../../helpers/log';
const log = NewLogger('settings-minor', () => process.env.NODE_ENV === 'development');

@Component({})
export default class NumberInput extends Vue {
    settings = core.state.settings;

    /**
     * Primary title of the element; also used for all localization.
     */
    @Prop({ required: true })
    readonly setting!: { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

    /**
     * If you need to add extra arguments to the label or the help text localizer, pass them here.
     */
    @Prop({ default: () => ({ title: [], help: [], ph: [] }) })
    readonly localArgs!: { title?: string[]; help?: string[], ph?: string[] };

    get title() { return l(`settings.${this.setting}`,      ...(this.localArgs.title ?? [])) }
    get help()  { return l(`settings.${this.setting}.help`, ...(this.localArgs.help  ?? [])) }
    get ph()    { return l(`settings.${this.setting}.ph`,   ...(this.localArgs.ph    ?? [])) }

    /**
     * If this entry depends on another entry, you can disable it.
     */
    @Prop({ default: false })
    readonly disabled!: boolean;

    @Prop({ default: undefined }) readonly min?: number;
    @Prop({ default: undefined }) readonly max?: number;
    get avg() { return (this.min && this.max) ? (this.min + this.max) >> 1 : 0 }

    /**
     * A fallback to use when a user enters an invalid entry. If unspecified, null is allowed.
    */
    @Prop({ default: undefined }) readonly default?: number;
    /**
     * Allow empty? This allows this number input to return null; You need to prepare yourself for that.
     *
     * `default` is checked **first** so you don't have to use this *and* default.
     */
    @Prop({ default: true }) readonly emptyAllowed!: boolean;
    get fallback() { return this.default ?? (this.emptyAllowed ? null : this.avg) }

    // If there's no min or max then we're in range.
    inRange(x: number) {
        return (this.min ? x >= this.min : true)
            && (this.max ? x <= this.max : true);
    }

    getValid(input: any): number | null {
        if (input === null || input === undefined || input === '')
            return this.fallback;

        const n = parseInt(input, 10);

        return !Number.isNaN(n) && Number.isFinite(n) && this.inRange(n) ? n : this.fallback;
    }

    set(e: Event) {
        const val = this.getValid((e.target as HTMLInputElement).value);
        log.warn('set:', { val, orig: this.settings[this.setting], fb: this.fallback, def: this.default, key: this.setting });

        // We've validated this in `getValid`, so we've relieved typescript of type-tracking duty. TS failing at any complicated scenario makes it completely useless, lol.
        this.settings[this.setting] = val as NumberInput['settings'][NumberInput['setting']];
    }
}
</script>
