<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<h5 class="row settings-section-header settings-search-result-marker">
  <div class="col-auto">{{ title }}</div>
  <div class="col align-content-center">
    <div class="hr w-100"></div>
  </div>
</h5>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

@Component({})
export default class HorizontalRule extends Vue {
    @Prop({ required: true })
    title!: string;
}
</script>

<style lang="css">
.settings-section-header:not(:first-child) {
    margin-top: 1.5rem;
}
.settings-section-header .hr {
    height: 1px;
    border-top: 1px solid transparent;
    border-image: linear-gradient(to left, var(--secondary) 90%, transparent 100%);
    border-image-slice: 1;
}
</style>
