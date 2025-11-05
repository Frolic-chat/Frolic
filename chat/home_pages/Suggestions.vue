<template>
<page>
    <div class="suggestion-container">
        <!-- v-if="!profileHelper.analyzing && !profileHelper.recommendations" -->
        <div v-if="profileHelper" class="input-group d-flex align-items-stretch flex-nowrap">
            <div class="form-control d-flex flex-column flex-grow-1">
                <span class="d-none d-md-inline">
                    Need advice on your profile?
                    {{ profileHelperHook }}
                </span>
                <span v-if="profileHelper.lastRun">
                    Last run: {{ profileHelper.lastRun }}
                </span>
            </div>
            <div class="input-group-append flex-shrink-0">
                <a href="#" @click.prevent="profileHelper.analyze()" class="input-group-text btn">
                    <span class="fas fa-user-md"></span>
                    <span class="ml-1 d-none d-md-inline" style="white-space: normal;">{{ profileHelperTitle }}</span>
                    <span class="ml-2 d-inline d-md-none" style="white-space: normal;">{{ profileHelperTitle }}</span>
                </a>
            </div>
        </div>
    </div>

    <profile-analysis ref="profileHelper"></profile-analysis>

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
    <p>
        Here's some potential uses:
        + Per-character theme/styling
        + Profile helper
        + Review what your profile looks like to the matcher
        + Saved ads editor
        + Saved status editor
        + Eicon favoriter
        + Friends/BM management
    </p>
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
import { Component, Hook } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';
import ProfileAnalysis from '../../learn/recommend/ProfileAnalysis.vue';

import core from '../core';
import l from '../localize';

import NewLogger from '../../helpers/log';
const log = NewLogger('suggestions');

@Component({
    components: {
        page: HomePageLayout,

        'profile-analysis': ProfileAnalysis,
    }
})
export default class Suggestions extends Vue {
    // import any necessary information via props, probably

    suggestions!: [
        { [key: string]: any },
    ];

    activeIndex: number | null = null;

    you!: string;

    profileHelperTitle = l('chat.helper');
    profileHelperHook = l('phelper.hook');
    profileHelper!: ProfileAnalysis;

    @Hook('beforeMount')
    beforeMount() {
        this.you = core.connection.character;
    }

    @Hook('mounted')
    mounted() {
        this.profileHelper = this.$refs['profileHelper'] as ProfileAnalysis;

        log.debug(`Suggestions panel started. You: ${this.you}; profileHelper last run: ${this.profileHelper.lastRun ?? 'never'}`);
    }

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
