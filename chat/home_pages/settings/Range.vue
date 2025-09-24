<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group">
    <label class="form-label" :for="setting">{{ title }}</label>
    <div class="range range-primary">
        <output>{{ display }}</output>
        <input type="range" class="form-control-range" :id="setting" :value="display" @change="set" @input="display = $event.target.value" :disabled="disabled" :min="min" :max="max" :aria-describedby="`${setting}Help`" :list="`${setting}Marker`"/>
    </div>
    <small v-if="help" :id="`${setting}Help`" class="help form-text text-muted">{{ help }}</small>
    <template v-if="nits.length">
        <datalist :id="`${setting}Marker`">
            <option v-for="nit in nits" :key="`${setting}${nit}`" :value="nit"></option>
        </datalist>
    </template>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@f-list/vue-ts';

import { Settings } from '../../interfaces';
import core from '../../core';
import l from '../../localize';

import NewLogger from '../../../helpers/log';
const log = NewLogger('SettingsRange', () => process.env.NODE_ENV === 'development');

@Component({})
export default class Range extends Vue {
    settings = core.state.settings;

    /**
     * Primary title of the element; also used for all localization.
     */
    @Prop({ required: true })
    readonly setting!: { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings];

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

    // Purely for display, so cast is okay.
    display: string | number = core.state.settings[this.setting];

    /**
     * The first mark and the last mark will become `min` and `max` respectively.
     */
    @Prop({ default: () => [0, 100] }) readonly marks!: number[];
    get min() { return this.marks[0]                     }
    get max() { return this.marks[this.marks.length - 1] }
    // Nits do not display currently.
    get nits() { return this.marks.slice(1, -1) }
    get fallback() { return this.min }

    get title() { return l(`settings.${this.setting}`,      ...(this.localArgs.title ?? [ this.settings[this.setting] ])) }
    get help()  { return l(`settings.${this.setting}.help`, ...(this.localArgs.help ?? []))  }

    // If there's no min or max then we're in range.
    inRange(x: number) {
        return (this.min ? x >= this.min : true)
            && (this.max ? x <= this.max : true);
    }

    getValid(input: any): number {
        if (input === null || input === undefined || input === '')
            return this.fallback;

        const n = parseInt(input, 10);

        // log.warn({ n, nan: Number.isNaN(n), finite: Number.isFinite(n), range: this.inRange(n) });

        return !Number.isNaN(n) && Number.isFinite(n) && this.inRange(n) ? n : this.fallback;
    }

    set() {
        //const val = this.getValid((e.target as HTMLInputElement).value);
        const val = this.getValid(this.display);
        log.warn('set:', { disp: this.display, val, orig: this.settings[this.setting], key: this.setting });

        // Bad cast, please fix.
        this.settings[this.setting] = val;
    }
}
</script>
