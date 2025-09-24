<template>
<div class="form-group">
    <label class="form-label" :for="`${prefix}-${setting}`">{{ title }}</label>
    <input type="text" class="form-control" :id="`${prefix}-${setting}`" @change="set" :value="stringifiedSetting" :disabled="disabled" :placeholder="ph" :aria-describedby="`${prefix}-${setting}Help`"/>
    <small v-if="help" :id="`${prefix}-${setting}Help`" class="help form-text text-muted">{{ help }}</small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@f-list/vue-ts';

import l from '../../localize';

import NewLogger from '../../../helpers/log';
const log = NewLogger('SettingsText');

@Component({})
export default class GenericText extends Vue {
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

    get stringifiedSetting() {
        const val = this.obj[this.setting];

        if (Array.isArray(val))
            return val.join(', ');
        else
            return String(val);
    }

    /**
     * If you need to add extra arguments to the label or the help text localizer, pass them here.
     */
    @Prop({ default: () => ({ title: [], help: [], ph: [] }) })
    readonly localArgs!: { title?: string[]; help?: string[], ph?: string[] };

    /**
     * If this entry depends on another entry, you can disable it.
     */
    @Prop({ default: false })
    readonly disabled!: boolean;

    fallback = '';

    get title() { return l(`settings.${this.prefix}.${this.setting}`,      ...(this.localArgs.title ?? [])) }
    get help()  { return l(`settings.${this.prefix}.${this.setting}.help`, ...(this.localArgs.help  ?? [])) }
    get ph()    { return l(`settings.${this.prefix}.${this.setting}.ph`,   ...(this.localArgs.ph    ?? [])) }

    /**
     * Parses the input from the text box. Use this to specify it matches the necessary criteria for your setting.
     */
    @Prop({ default: undefined }) validator?: ((s: string) => boolean);

    /**
     * The transformer is run on validated input; use this to turn the input string into whatever output data you need.
     */
    @Prop({ default: undefined }) transformer?: ((s: string) => any);

    set(e: Event) {
        const input = e.target as HTMLInputElement;
        const val = input.value ?? this.fallback;
        log.warn('set:', { val, orig: this.obj[this.setting], key: this.setting });

        if (!this.validator || this.validator(val)) {
            const tf = this.transformer?.(val) ?? val;
            this.obj[this.setting] = tf;
        }
        else { // REJECT
            input.value = this.stringifiedSetting;
        }
    }
}
</script>
