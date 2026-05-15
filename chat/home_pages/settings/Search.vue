<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="input-group">
  <input id="search" ref="search" v-model="search" type="text" class="form-control search" :class="{ 'query-too-short': queryIsErrorLength }" :placeholder="ph" tabindex="0" @input="searchUpdateDebounce()">
  <div class="input-group-append">
    <a class="input-group-text btn btn-sm btn-light" @click="clearSearch">
      <i class="fa-fw fas fa-times"></i>
    </a>
  </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Prop } from '@frolic/vue-ts';
import * as Utils from '../../../helpers/utils';
import core from '../../core';
import l from '../../localize';

@Component({})
export default class Search<T> extends Vue {
    @Prop({ default: () => [] })
    readonly onSearch!: (query: string, tooShort: boolean, results: Array<T>) => Array<T>;

    readonly ph = l('settings.search.ph');
    readonly minSearchLength = 3;

    private runtime = core.runtime; // Preserve the input even if the user moves away from the page.
    get search() { return this.runtime.settingsSearchInput; }
    set search(value: string) { this.runtime.settingsSearchInput = value; }

    private results: Array<T> = [];

    private runSearch = () => this.results = this.onSearch(this.search, this.queryIsErrorLength, this.results);
    readonly searchUpdateDebounce = Utils.debounce(() => this.runSearch(), { wait: 433 });

    get queryIsErrorLength() {
        const l = this.search.length;
        return l > 0 && l < this.minSearchLength;
    }

    @Hook('mounted')
    mounted() {
        this.runSearch();
    }

    clearSearch(): void {
        this.search = '';
        this.runSearch();
    }
}
</script>
<style lang="css">
#search.query-too-short {
    box-shadow: inset 0 0 10px 1px var(--danger);
    border-top-left-radius:    8px;
    border-bottom-left-radius: 8px;
}
</style>
