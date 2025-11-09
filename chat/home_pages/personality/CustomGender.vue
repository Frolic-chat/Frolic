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
    <p>{{ desc1 }}</p>

    <div class="warning" style="margin-top: 10px">
        <h5>{{ alert }}</h5>
        <p>{{ desc2 }}</p>
    </div>

    <!--
        How to get genders into tabs to select?
    -->
    <div class="form-group">
        <tags v-model="selectedKinks" :availableTags="availableKinks"></tags>
        <p v-if="!selectedKinks.length">
            {{ nokinks }}
        </p>

        <textarea class="form-control" @click="selectAllIfValid" :value="selectedKinkIds" rows="1" :placeholder="outputPh" reaodnly="true"></textarea>
    </div>

    <!-- <div class="form-group">
        <textarea class="hqp-input form-control" v-model="normalLink" @keydown.enter.prevent.stop="" rows="1" :placeholder="inputPh"></textarea>
        <div class="form-label">{{ copy }}</div>
        <div v-if="hqpError">
            {{ error }}
            <div class="hqp-error">{{ hqpErrorMsg }}</div>
        </div>
        <textarea class="hqp-input form-control" @click="selectAllIfValid" :value="hqpLink" rows="1" :placeholder="outputPh" readonly="true"></textarea>
    </div> -->
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

@Component({
    components: {
        collapse: Collapse,
        tags: TagPicker,
    }
})
export default class GenderCreator extends Vue {
    title = l('settings.cg.title');
    desc1 = l('settings.cg.desc1');
    alert = l('settings.cg.alert');
    desc2 = l('settings.cg.desc2');
    copy = l('settings.cg.copy');
    nokinks = l('settings.cg.nokinks');

    // Need to make this one.
    outputPh = l('settings.cg.output.ph');

    kinkMap: Record<string, number> = {
    'Female':        554,
    'Herm-Male':     552,
    'Male':          553,
    'Transgender':   551,
    'Hermaphrodite': 132,
    'Shemale':       356,
    'Cunt-boy':      231,
    'Transwoman':    606,
    'Transman':      607,
    'Nonbinary':     712,
    'Androgynous':   586,
    'Femboy':        531,
    'Tomboy':        532,
    'Feminine':      592,
    };
    get availableKinks() { return Object.keys(this.kinkMap) }
    get selectedKinkIds() { return this.selectedKinks.map(s => this.kinkMap[s]) }
    selectedKinks: string[] = [];

    get youHaveGender() { return core.characters.ownCharacter.overrides.gender }

    // No gender string, malformed output, etc.
    // is malformed output even possible? remove unused parts.
    // sanitize detection in getstufffromdescription().
    get genderError() { return false }

    // Customize this to regex check string.
    selectAllIfValid(e: MouseEvent) {
        if (this.hqpError)
            return;
        else if (e.target instanceof HTMLTextAreaElement)
            e.target.select();
    }

    inputPh = l('settings.hqp.input.ph');
    error = l('settings.hqp.error');

    // get hqpErrorMsg() { return l(this.hqpError) }
}
</script>
