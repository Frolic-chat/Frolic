<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div>
    <div class="row" v-for="t in tasks" :key="t.name">
        <div class="col-auto align-right">
            <span v-if="t.running" class="fas fa-circle-notch fa-spin"></span>
            <span v-else-if="!t.error" class="text-muted fas fa-check"></span>
            <span v-else-if="t.error.fatal" >🛑</span>
            <span v-else-if="!t.error.fatal">⚠</span>
            <span v-else class="fa-solid fa-question"></span>
        </div>
        <div class="col">
            <div class="">
                <span :class="{ 'font-weight-bold': t.error, 'text-muted': !t.error && !t.running }">
                    {{ t.name }}
                </span>
                <span v-if="t.error">
                    {{ ' - ' + (t.error.type || 'unknown source') }}
                </span>
            </div>
            <span v-if="t.running" class="text-muted">Loading...</span>
            <template v-if="t.error">
                <div class="text-primary">{{ t.error.message }}</div>
                <div>{{ t.error.tooltip }}</div>
            </template>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import { Component, Prop } from '@f-list/vue-ts';
import Vue from 'vue';

import { CapturedError } from './error-service';

export interface Task {
    name:     string;
    id:       CapturedError['source'];
    running?: boolean;
    error?:   CapturedError;
}

@Component({})
export default class LoginTasks extends Vue {
    @Prop({ default: [] })
    readonly tasks!: Task[];
}
</script>

<style lang="scss">
.login_error_group {
    text-align: justify;

    border: 2px solid var(--danger);
    border-radius: 4px;

    padding: 1rem;
}

.login_warning_group {
    text-align: justify;

    border: 2px solid var(--warning);
    border-radius: 4px;

    padding: 1rem;
}

/* These bootstrap classes should already be working but aren't... */
.text-primary {
    color: var(--primary);
}

.text-muted {
    color: var(--secondary);
}

.font-weight-bold {
    font-weight: 700;
}

.align-right {
    margin-left: auto;
}
</style>
