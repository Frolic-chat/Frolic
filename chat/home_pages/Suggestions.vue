<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page scrollcageClasses="pt-3">
    <profile-analysis ref="profileHelper" class="mb-4"></profile-analysis>


    <collapse class="mb-4">
        <template v-slot:header> Hello! Test Title!        </template>
        <template v-slot:button> BTN                       </template>
        <template v-slot:default>We vibin'. Chillin', even.</template>
    </collapse>

    <hr>

    <div class="accordion" id="accordionExample">
        <div v-for="(item, index) in suggestions" :key="index" class="card">
            <div class="card-header" :id="`heading-${item.name}`">
                <h2 class="mb-0">
                    <button class="btn btn-link btn-block text-left" type="button" @click="toggle(index)"
                        :class="{ collapsed: activeIndex !== index }"
                        data-toggle="collapse" :data-target="`#collapse-${item.name}`"
                        :aria-expanded="activeIndex === index" :aria-controls="`collapse-${item.name}`"
                    >
                        {{ item.title }}
                    </button>
                </h2>
            </div>

            <div :id="`collapse-${item.name}`" class="collapse" :class="{ show: activeIndex === index }"
                    data-parent="#accordionExample"
                    :aria-labelledby="`heading-${item.name}`"
            >
                <div class="card-body">
                    {{ item.content }}
                </div>
            </div>
        </div>
    </div>

    <!-- Testing -->
    <slot></slot>

    <pre style="color:inherit;">
        This is where your personality helper goes.

        Here's some potential uses:
        + Per-character theme/styling
        + Profile helper
        + Review what your profile looks like to the matcher
        + Let you know if there's features you could be using (hqp? custom gender/orientation?)
        + Saved ads editor
        + Saved status editor
        + Eicon favoriter
        + Friends/BM management
        + IC/OOC chat distinction

        // TOOLS section
    </pre>

    <!-- parts of personality: -->
    <!-- Profile helper/suggestions -->
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
import ProfileAnalysis from '../../learn/recommend/ProfileAnalysis.vue';

import Collapse from '../../components/collapse.vue';

@Component({
    components: {
        page: HomePageLayout,
        collapse: Collapse,

        'profile-analysis': ProfileAnalysis,
    }
})
export default class Suggestions extends Vue {
    // import any necessary information via props, probably

    suggestions!: [
        { [key: string]: any },
    ];

    activeIndex: number | null = null;

    toggle(i: number) { // Close current is re-clicked.
        this.activeIndex = this.activeIndex === i ? null : i;
    }
}
</script>

<style lang="scss">
.suggestion-container .form-control {
    height: auto;
}
</style>
