<template>
    <select :value="value" @change="input">
        <option v-for="character in characters" :value="character.id">{{character.name}}</option>
        <slot></slot>
    </select>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Emit } from 'vue-facing-decorator';
    import {SimpleCharacter} from '../interfaces';
    import * as Utils from '../site/utils';

    @Component
    export default class CharacterSelect extends Vue {
        @Prop({required: true})
        readonly value!: number;

        get characters(): SimpleCharacter[] {
            return Utils.characters;
        }

        @Emit
        input(evt: Event): number {
            return parseInt((<HTMLSelectElement>evt.target).value, 10);
        }
    }
</script>
