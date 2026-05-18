<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="form-group form-check settings-search-result-marker">
  <label v-if="body" class="form-check-label">
    <slot name="title">{{ body }}</slot>
  </label>
  <small v-if="sub" class="help form-text text-muted">
    <slot name="help">{{ sub }}</slot>
  </small>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from '@frolic/vue-ts';

@Component({})
export default class Checkbox extends Vue {
    @Prop({ default: '' })
    body!: string;

    @Prop({ default: '' })
    sub!: string;
}
</script>
