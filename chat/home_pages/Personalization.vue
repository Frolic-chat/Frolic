<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page scrollcageClasses="pt-3">
    <template v-slot:prescroll>
        <div class="page-header d-flex align-items-center">
            <div class="mr-auto">
                <h5>About You</h5>
            </div>
            <div class="ml-auto flex-shrink-0">
                <slot name="title-end"></slot>
            </div>
        </div>
    </template>

    <profile-analysis class="mb-4"></profile-analysis>

    <hqp class="mb-4"></hqp>

    <gender class="mb-4"></gender>

    <!--
    <pre style="color:inherit;">
        This is where your personality helper goes.

        Here's some potential uses:
        + Per-character theme/styling
        + Review what your profile looks like to the matcher
        + Saved ads editor
        + Saved status editor
        + Eicon favoriter
        + Friends/BM management
        + IC/OOC chat distinction

        // TOOLS section
    </pre>
    -->

    <!-- parts of personality: -->
    <!-- Eidol builder -->
    <!-- Saved status editor -->
    <!-- Saved ads editor -->
    <!-- Eicon favoriter -->
    <!-- Friends/BM Manager -->
</page>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import Collapse from '../../components/collapse.vue';

import ProfileAnalysis from '../../learn/recommend/ProfileAnalysis.vue';
import HQPCreator from './personality/HighQualityPortrait.vue';
import GenderCreator from './personality/CustomGender.vue';

@Component({
    components: {
        page: HomePageLayout,
        collapse: Collapse,

        'profile-analysis': ProfileAnalysis,
        'hqp': HQPCreator,
        'gender': GenderCreator,
    }
})
export default class Personality extends Vue {}
</script>

<style lang="scss">
.page-header {
    height: 3em;
}
</style>
