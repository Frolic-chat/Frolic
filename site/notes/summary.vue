<template>
    <div class="action-bar">
        <div class="selection">
            <button class="all"></button>
            <button class="none"></button>
        </div>
        <div class="mod">
            <button>+Star</button>
            <button>-Star</button>

            <button>Read</button>
            <button>Unread</button>
        </div>
        <div class="move">
            <button>Move</button>
            <button>Trash</button>
        </div>
    </div>

    <div class="nav sidebar">
        <button>Inbox</button>
        <button>Outbox</button>
        <button>Trash</button>

        <button>Starred</button>
        <button>Unread</button>
    </div>
    <div class="body"></div>
</template>

<script lang="ts">
import Vue from 'vue';
import {Component} from '@f-list/vue-ts';

@Component
export class NoteSummary extends Vue {

}
</script>

<style lang="css">
</style>
