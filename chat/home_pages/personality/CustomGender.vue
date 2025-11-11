<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse>
<template v-slot:header>
    {{ title }}
</template>
<template v-slot:button>
    <span v-if="youHaveGender">
        <span class="text-success fa-solid fa-circle-check"></span>
    </span>
    <span v-else>
        <span class="fa-solid fa-face-grin-stars"></span>
        <span class="ml-2 d-none d-sm-inline">Create</span>
    </span>
</template>
<template v-slot:default>
    <p>{{ intro }}</p>

    <!-- Beta-feature warning -->
    <div class="border-inline-warning rounded-lg p-3 my-4" style="margin-top: 10px">
        <h5>{{ alert }}</h5>
        <div>{{ alert_desc }}</div>
    </div>

    <!-- Identity -->
    <div class="form-group">
        <p class="lead">{{ identityLead }}</p>
        <p class="form-text">{{ identityDesc }}</p>
        <input type="text" class="form-control" v-model="identityPhrase" rows="1" :placeholder="identityPh" maxlength="20" />
        <div v-if="identityError" class="form-text border-left-warning rounded-lg pl-2">
            {{ identityErrorMsg }}
        </div>
    </div>

    <template v-if="!identityError">
    <!-- Kink list  -->
        <div class="form-group">
            <p class="lead">{{ kinkLead }}</p>
            <p class="form-text">{{ kinkDesc }}</p>
            <p class="text-small form-text">{{ kinkExample }}</p>
            <tags class="mt-4" v-model="selectedKinks" :availableTags="availableKinks"></tags>
            <p v-if="kinkError" class="form-text border-left-warning rounded-lg pl-2">
                {{ kinkErrorMsg }}
            </p>
        </div>

        <!-- Final -->
        <div class="form-group">
            <p class="lead">{{ outputLead }}</p>
            <p class="form-text">{{ outputDesc }}</p>
            <input type="text" class="form-control" @click="selectAllIfValid" :value="theFinalGender" rows="1" :placeholder="outputPh" readonly="true" />
            <!--
            <p v-if="outputerror">
                {{ formatErrorMsg }}
            </p>
            -->
        </div>
    </template>
</template>
</collapse>
</template>

<script lang="ts">
import { Component, Watch } from '@f-list/vue-ts';
import Vue from 'vue';

import Collapse from '../../../components/collapse.vue';
import TagPicker from '../../../components/TagPicker.vue';

import core from '../../core';
import l from '../../localize';
import { CustomGender } from '../../../learn/matcher-types';

type cgInputErrorString = 'settings.cg.errorLength'
                        | 'settings.cg.errorEmpty'
                        | 'settings.cg.errorCharacters'
                        | '';
type cgKinksErrorString = 'settings.cg.errorEmptyKinks'
                        | '';

@Component({
    components: {
        collapse: Collapse,
        tags:     TagPicker,
    }
})
export default class GenderCreator extends Vue {
    title = l('settings.cg.title');
    get youHaveGender() { return core.characters.ownCharacter.overrides.gender }
    intro = l('settings.cg.intro');

    alert      = l('settings.cg.alert');
    alert_desc = l('settings.cg.experimental');

    identityLead = l('settings.cg.identity.lead');
    identityDesc = l('settings.cg.identity.desc');
    identityPhrase: string = '';
    identityPh   = l('settings.cg.identity.example');
    // No gender string, malformed output, etc.
    // is malformed output even possible? remove unused parts.
    // sanitize detection in getstufffromdescription().
    get identityError(): cgInputErrorString {
        if (!this.identityPhrase)
            return 'settings.cg.errorEmpty';

        if (/[=;\]]/.test(this.identityPhrase))
            return 'settings.cg.errorCharacters';

        if (this.identityPhrase.length >= 20)
            return 'settings.cg.errorLength';

        return '';
    }
    get identityErrorMsg() { return l(this.identityError) };

    kinkLead    = l('settings.cg.kink.lead')
    kinkDesc    = l('settings.cg.kink.desc');
    kinkExample = l('settings.cg.kink.example');
    selectedKinks: CustomGender.KinkWords[] = [];
    availableKinks = Object.keys(CustomGender.KinkMap);
    get kinkError(): cgKinksErrorString {
        if (!this.selectedKinks.length)
            return 'settings.cg.errorEmptyKinks';
        else
            return '';
    }
    get kinkErrorMsg() { return l(this.kinkError) }

    outputLead = l('settings.cg.output.lead');
    outputDesc = l('settings.cg.output.desc');
    get selectedKinkIds() {
        return this.selectedKinks
            .map(s => CustomGender.KinkMap[s]).join(',');
    }
    get theFinalGender() {
        // [i=fcg://display=The Wind;match=554;mismatch=;v=1]
        return '[i=fcg://'
            + (this.identityPhrase ? 'display=' + this.identityPhrase + ';' : '')
            + (this.selectedKinkIds ? 'match=' + this.selectedKinkIds + ';' : '')
            + 'v=1][/i]';
    }
    outputPh = l('settings.cg.exampleOutput');

    selectAllIfValid(e: MouseEvent) {
        if (this.identityError) {
            if (e.target instanceof HTMLInputElement)
                e.target.blur();
        }
        else if (e.target instanceof HTMLInputElement) {
            e.target.select();
        }
    }

    you = core.characters.ownCharacter.overrides;

    @Watch('you', { immediate: true })
    onYouUpdate() {
        if (!this.you.gender || this.selectedKinks.length)
            return;

        const rm: Record<number, string> = {};
        Object.entries(CustomGender.KinkMap)
            .forEach(([k, v]) => {
                rm[v] = k;
            });

        this.identityPhrase = this.you.gender.string;
        this.selectedKinks = this.you.gender.match.map(id => rm[id] as CustomGender.KinkWords);
    }
}
</script>

<style lang="scss">
.border-inline-warning {
    border-inline: 2px solid var(--warning);
}
.border-left-warning {
    border-left: 2px solid var(--warning);
}
</style>
