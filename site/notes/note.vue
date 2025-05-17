<template>
    <!-- modal? -->
     <div class="action-bar"></div>
     <div class="header">
        <div class="subject">Subject</div>
        <div class="date">Sent many days ago.</div>
     </div>
     <div class="contact">
        From:
            <img class="avatar" />
            <a class="user">UserName</a>
        To:
            <img class="avatar" />
            <a class="user">You</a>
     </div>
     <div>Body.</div>
</template>

<script lang="ts">
import Vue from 'vue';
import {Component} from '@f-list/vue-ts';

@Component
export class NotePage extends Vue {

}
</script>

<style lang="css">
</style>
