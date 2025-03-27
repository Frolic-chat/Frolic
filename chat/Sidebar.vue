<template>
    <div class="sidebar-wrapper" :class="{open: expanded}">
        <div :class="'sidebar sidebar-' + (right ? 'right' : 'left')">
            <button @click="expanded = !expanded" class="btn btn-secondary btn-xs expander" :aria-label="label">
                <span v-if="right" class="fa fa-fw fa-rotate-270" :class="icon"></span>
                <span
                    v-if="right" v-show="!expanded"
                    class="fa fa-rotate-270"
                    :class="{
                        'fa-fw fa-mail-bulk':    note &&  msg,
                        'fa-fw fa-sticky-note': !note &&  msg,
                        'fa-fw fa-envelope':     note && !msg,
                    }"
                ></span>
                <span
                    class="fa fa-fw"
                    :class="{
                        'fa-chevron-down': !expanded,
                        'fa-chevron-up':    expanded
                    }"
                ></span>
                <span v-if="!right" class="fa fa-fw fa-rotate-90" :class="icon"></span>
            </button>
            <div class="body">
                <slot></slot>
            </div>
        </div>
        <div class="modal-backdrop show" @click="expanded = false"></div>
    </div>
</template>

<script lang="ts">
    import {Component, Prop, Watch, Hook} from '@f-list/vue-ts';
    import Vue from 'vue';
    import core from './core';
    import { EventBus } from './preview/event-bus';

    @Component
    export default class Sidebar extends Vue {
        @Prop
        readonly right?: true;
        @Prop
        readonly label?: string;
        @Prop({required: true})
        readonly icon!: string;
        @Prop({default: false})
        readonly open!: boolean;
        expanded = this.open;

        @Watch('open')
        watchOpen(): void {
            this.expanded = this.open;
        }

        note: boolean = false;
        msg:  boolean = false;

        updateNoteDisplay(): void {
            const counts = core.siteSession.interfaces.notes.getCounts();

            this.note = counts.unreadNotes    > 0;
            this.msg  = counts.unreadMessages > 0;
        };

        @Hook('mounted')
        mounted(): void {
            this.updateNoteDisplay();

            EventBus.$on('note-counts-update', this.updateNoteDisplay);
        }
    }
</script>

<style lang="scss">
    .sidebar {
        button:focus {
            box-shadow: none;
        }

        .fa-mail-bulk, .fa-sticky-note, .fa-envelope {
            color: var(--warning);
        }
    }
</style>
