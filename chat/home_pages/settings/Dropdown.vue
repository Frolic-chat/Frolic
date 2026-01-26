<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group">
    <label class="form-label" :for="setting">{{ title }}</label>
    <select class="form-control" :id="setting" v-model="settings[setting]" :disabled="disabled" :aria-describedby="`${setting}Help`">
        <slot>
            <option v-if="blank || !options"></option>
            <template v-if="options">
                <option v-for="entry in options" :key="`${setting}${entry[1]}`" :value="entry[0]">
                    {{ entry[1] }}
                </option>
            </template>
        </slot>
    </select>
    <small v-if="help" :id="`${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

import { Relation, Settings } from '../../interfaces';
import core from '../../core';
import l from '../../localize';

@Component({})
export default class Dropdown extends Vue {
    /**
     * Primary title of the element; also used for all localization.
     */
    @Prop({ required: true })
    readonly setting!: { [K in keyof Settings]: Settings[K] extends Relation.Chooser ? K : never }[keyof Settings];
    // TODO: Limit this to types that have k,v pairings. But how?

    /**
     * If you need to add extra arguments to the label or the help text localizer, pass them here.
     */
    @Prop({ default: () => ({ title: [], help: [] }) })
    readonly localArgs!: { title?: string[]; help?: string[] };

    /**
     * Allow an extra blank entry.
     */
    @Prop({ default: false })
    readonly blank!: boolean;

    /**
     * Options are used if the dropdown's slot isn't filled.
     *
     * `options` is a list of pairs - the first is the value used behind-the-scenes, the second is the string to be displayed to the user.
     *
     * Example:
     * ```ts
     * const pairs = [
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

    get title() { return l(`settings.${this.setting}`,      ...(this.localArgs.title ?? [])) }
    get help()  { return l(`settings.${this.setting}.help`, ...(this.localArgs.help  ?? [])) }

    settings = core.state.settings;
}
</script>
