<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse>
<template v-slot:header>
    {{ title }}
</template>
<template v-slot:button>
    <span v-if="youHaveHqp">
        <span class="text-success fa-solid fa-circle-check"></span>
    </span>
    <span v-else>
        <span class="fa-solid fa-face-grin-stars"></span>
        <span class="ml-2 d-none d-sm-inline">Create</span>
    </span>
</template>
<template v-slot:default>
    <p v-if="!hqpEnabled" class="lead text-warning">{{ disabled }}</p>
    <div>{{ desc1 }}</div>

    <div class="warning" style="margin-top: 10px">
        <h5>{{ alert }}</h5>
        <div>{{ desc2 }}</div>
    </div>

    <div>
        {{ allowedDomains }}
        <ul>
            <li>static.f-list.net {{ flist }}</li>
            <li>freeimage.host</li>
            <li>iili.io</li>
            <li>e621.net</li>
            <li>redgifs</li>
        </ul>
    </div>

    <!--
        more information with external link
        steal external link framing from license
    -->

    <div class="form-group">
        <textarea class="hqp-input form-control" v-model="normalLink" @keydown.enter.prevent.stop="" rows="1" :placeholder="inputPh"></textarea>
        <div class="form-label">{{ copy }}</div>
        <div v-if="hqpError">
            {{ error }}
            <div class="hqp-error">{{ hqpErrorMsg }}</div>
        </div>
        <textarea class="hqp-input form-control" @click="selectAllIfValid" :value="hqpLink" rows="1" :placeholder="outputPh" readonly="true"></textarea>
    </div>
</template>
</collapse>
</template>

<script lang="ts">
import { Component, Watch } from '@frolic/vue-ts';
import Vue from 'vue';

import Collapse from '../../../components/collapse.vue';

import core from '../../core';
import l from '../../localize';
import { ProfileCache } from '../../../learn/profile-cache';

type hqpErrorString = 'settings.hqp.errorUrl'
                    | 'settings.hqp.errorDomain'
                    | 'settings.hqp.errorBrace'
                    | '';

@Component({
    components: {
        collapse: Collapse,
    }
})
export default class HQPCreator extends Vue {
    title = l('settings.hqp.title');
    desc1 = l('settings.hqp.desc1');
    alert = l('settings.hqp.alert');
    desc2 = l('settings.hqp.desc2');
    disabled = l('settings.hqp.disabled');
    allowedDomains = l('settings.hqp.allowedDomains');
    flist = l('settings.hqp.flist');
    inputPh = l('settings.hqp.input.ph');
    copy = l('settings.hqp.copy');
    error = l('settings.hqp.error');
    outputPh = l('settings.hqp.output.ph');

    get hqpErrorMsg() { return l(this.hqpError) }

    get hqpEnabled() { return core.state.settings.risingShowHighQualityPortraits }
    get youHaveHqp() { return !!core.characters.ownCharacter.overrides.avatarUrl }

    normalLink = '';
    get hqpLink() {
        return this.normalLink
            ? '[i=' + this.normalLink.replace(/^https:\/\//, 'hqp://') + '][/i]'
            : '';
    };

    selectAllIfValid(e: MouseEvent) {
        if (this.hqpError)
            return;
        else if (e.target instanceof HTMLTextAreaElement)
            e.target.select();
    }

    get hqpError() {
        if (!this.normalLink)
            return '' as hqpErrorString;

        if (!this.normalLink.startsWith('https://'))
            return 'settings.hqp.errorUrl' as hqpErrorString;

        if (this.normalLink.includes(']'))
            return 'settings.hqp.errorBrace' as hqpErrorString;

        if (!ProfileCache.isSafePortraitURL(this.normalLink))
            return 'settings.hqp.errorDomain' as hqpErrorString;

        return '' as hqpErrorString;
    }

    you = core.characters.ownCharacter.overrides;
    @Watch('you', { immediate: true })
    onYouUpdate() {
        if (this.you.avatarUrl && !this.normalLink)
            this.normalLink = this.you.avatarUrl;
    }
}
</script>
