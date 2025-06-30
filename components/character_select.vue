<template>
    <select :value="value" @change="emit">
        <option v-for="character in characters" :value="character.id">{{character.name}}</option>
        <slot></slot>
    </select>
</template>

<script lang="ts">
    import { Vue, Component, Prop } from 'vue-facing-decorator';
    import {SimpleCharacter} from '../interfaces';
    import * as Utils from '../site/utils';

    @Component
    export default class CharacterSelect extends Vue {
        @Prop({required: true})
        readonly value!: number;

        get characters(): SimpleCharacter[] {
            return Utils.characters;
        }

        emit(evt: Event): void {
            this.$emit('input', parseInt((<HTMLSelectElement>evt.target).value, 10));
        }
    }
</script>
