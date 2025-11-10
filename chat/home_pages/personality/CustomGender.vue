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

    <div class="border-inline-warning rounded-lg p-3 my-2" style="margin-top: 10px">
        <h5>{{ alert }}</h5>
        <div>{{ alert_desc }}</div>
    </div>

    <div class="form-group">
        {{ inputDesc }}
        <input type="text" class="form-control" v-model="inputWord" rows="1" :placeholder="inputPh" maxlength="20"></input>
        <div v-if="inputError">
            {{ inputErrorMsg }}
        </div>
    </div>

    <div class="form-group">
        {{ kinkDesc }}
        <!-- format this!!! -->
        <div>{{ kinkExample }}</div>
        <tags class="mt-4" v-model="selectedKinks" :availableTags="availableKinks"></tags>
        <p v-if="kinkError">
            {{ kinkErrorMsg }}
        </p>
    </div>

    <div class="form-group">
        {{ outputDesc }}
        <input type="text" class="form-control" @click="selectAllIfValid" :value="theFinalGender" rows="1" :placeholder="outputPh" reaodnly="true"></input>
        <!--
        <p v-if="outputerror">
            {{ formatErrorMsg }}
        </p>
        -->
    </div>
</template>
</collapse>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';
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
        tags: TagPicker,
    }
})
export default class GenderCreator extends Vue {
    title = l('settings.cg.title');
    get youHaveGender() { return core.characters.ownCharacter.overrides.gender }
    intro = l('settings.cg.intro');

    alert = l('settings.cg.alert');
    alert_desc = l('settings.cg.experimental');

    inputDesc = l('settings.cg.word');
    inputWord: string = '';
    inputPh = l('settings.cg.exampleGender');
    // No gender string, malformed output, etc.
    // is malformed output even possible? remove unused parts.
    // sanitize detection in getstufffromdescription().
    get inputError(): cgInputErrorString {
        if (!this.inputWord)
            return 'settings.cg.errorEmpty';

        if (this.inputWord.length > 20)
            return 'settings.cg.errorLength';

        if (/[=;\]]/.test(this.inputWord))
            return 'settings.cg.errorCharacters';

        return '';
    }
    inputErrorMsg: string = '';

    kinkDesc = l('settings.cg.kinkDesc');
    kinkExample = l('settings.cg.kinkExample');
    selectedKinks: CustomGender.KinkWords[] = [];
    get availableKinks() { return Object.keys(CustomGender.KinkMap) }
    get kinkError(): cgKinksErrorString {
        if (!this.selectedKinks)
            return 'settings.cg.errorEmptyKinks';
        else
            return '';
    }
    get kinkErrorMsg() { return l(this.kinkError) }

    outputDesc = l('settings.cg.copy');
    get selectedKinkIds() {
        return this.selectedKinks
            .map(s => CustomGender.KinkMap[s]).join(',');
    }
    selectAllIfValid(e: MouseEvent) {
        if (this.inputError)
            return;
        else if (e.target instanceof HTMLTextAreaElement)
            e.target.select();
    }
    get theFinalGender() {
        // [i=fcg://display=The Wind;match=554;mismatch=;v=1]
        return '[i=fcg://'
            + (this.inputWord ? 'display=' + this.inputWord + ';' : '')
            + (this.selectedKinkIds ? 'match=' + this.selectedKinkIds + ';' : '')
            + 'v=1][/i]';
    }
    outputPh = l('settings.cg.exampleOutput');
}
</script>

<style lang="scss">
.border-inline-warning {
    border-inline: 2px solid var(--warning);
}
</style>
