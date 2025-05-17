<template>
    <div>Title <input type="text"></div>
    <div>Send to: <input type="text"></div>
    <div>Send as: <select>
            <option>Char Name1</option>
            <option>Char Name2</option>
            <option>Char Name3</option>
        </select>
    </div>
    <div class="bbcode-bar"></div>
    <input type="text">
    <button>Send!</button>
</template>

<script lang="ts">
import Vue from 'vue';
import {Component} from '@f-list/vue-ts';

@Component
export class NoteWriter extends Vue {

}
</script>

<style lang="css">
</style>
