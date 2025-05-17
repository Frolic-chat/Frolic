<template>
    <div class="action-bar">
        <button>Back</button>
        <div>
            <span>Highlight to quote </span>
            <input type="checkbox">
        </div>
    </div>

    <div>Note History with ???</div>
    <div>For each message, display.</div>
    <div class="load-prompt">
        <button>Load More?</button>
        <div class="loading-spinner"></div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {Component} from '@f-list/vue-ts';

@Component
export class NoteHistory extends Vue {

}
</script>

<style lang="css">
</style>
