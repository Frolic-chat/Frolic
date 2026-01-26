<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group">
    <label class="form-label" :for="`${prefix}-${setting}`">{{ title }}</label>
    <select class="form-control" :id="`${prefix}-${setting}`" v-model="obj[setting]" :disabled="disabled" :aria-describedby="`${prefix}-${setting}Help`">
        <slot>
            <option v-if="blank || !options"></option>
            <template v-if="options">
                <option v-for="entry in options" :key="`${prefix}-${setting}${entry[1]}`" :value="entry[0]">
                    {{ entry[1] }}
                </option>
            </template>
        </slot>
    </select>
    <small v-if="help" :id="`${prefix}-${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

import l from '../../localize';

@Component({})
export default class Dropdown extends Vue {
    /**
     * Being a generic, we cannot narrow down the given object any further than recognizing the key may be valid.
     */
    @Prop({ required: true })
    readonly obj!: { [key: string]: any };

    /**
     * Custom prefix; typically the object you're toggling members of.
     */
    @Prop({ default: '' })
    readonly prefix!: string;

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

    get title() { return l(`settings.${this.prefix}.${this.setting}`,      ...(this.localArgs.title ?? [])) }
    get help()  { return l(`settings.${this.prefix}.${this.setting}.help`, ...(this.localArgs.help  ?? [])) }

    /**
     * Allow an extra blank entry.
     */
    @Prop({ default: false })
    readonly blank!: boolean;

    /**
     * Options are used if the dropdown's slot isn't filled.
     *
     * `options` is a list of pairs - the first is the value that will be assigned to the setting, the second is the string to be displayed to the user.
     *
     * Example:
     * ```ts
     * const options = [
     *      [ 0, "Red"    ]
     *      [ 1, "Orange" ]
     *      [ 2, "Yellow" ]
     *      [ 3, "Green"  ]
     *      [ 4, "Blue"   ]
     *      [ 5, "Indigo" ]
     *      [ 6, "Violet" ]
     * ]
     * ```
     */
    @Prop({ default: undefined })
    readonly options!: Array<[number | string, string]> | ReadonlyArray<[number | string, string]> | undefined;

    /**
     * If this entry depends on another entry, you can disable it.
     */
    @Prop({ default: false })
    readonly disabled!: boolean;
}
</script>
