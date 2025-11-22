<template>
    <div class="modal-content">
        <div class="modal-header input-group flex-nowrap align-items-stretch border-0 p-0" @click="toggle()" style="cursor:pointer" :class="headerClass">
            <div :style="headerStartStyle" class="form-control d-flex flex-column justify-content-around flex-grow-1 border-0" style="height:auto;">
                <slot name="header">
                    <span class="fas" :class="'fa-chevron-' + (collapsed ? 'down' : 'up')"></span>
                    {{ title }}
                </slot>
            </div>
            <div :style="headerEndStyle" class="input-group-append flex-shrink-0 border-0 header-button-container-container">
                <div :style="headerEndStyle" class="input-group-text btn p-0 border-0 header-button-container"> <!-- keep border-left -->
                    <a href="#" @click.prevent="btnClick" :class="btnClass" class="btn justify-content-around h-100 d-flex flex-column border-0" :style="buttonEndStyle">
                        <slot name="button"></slot>
                    </a>
                </div>
            </div>
        </div>

        <div :style="style" style="overflow:hidden">
            <div :class="bodyClass" class="modal-body" ref="content">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import {Component, Prop} from '@f-list/vue-ts';

    @Component
    export default class Collapse extends Vue {
        @Prop({ default: undefined })
        readonly title?: string;

        @Prop({ default: undefined })
        readonly headerClass?: string;

        @Prop({ default: undefined })
        readonly btnClass?: string;

        @Prop({ default: undefined })
        readonly bodyClass?: string;

        @Prop({ default: () => {} })
        readonly action?: () => void;
        btnClick(e: MouseEvent) {
            if (this.action) {
                e.stopPropagation();
                this.action();
            }
        }

        @Prop({ default: false })
        readonly state!: boolean;

        collapsed = true;
        timeout = 0;
        style = {
            height: <string | undefined>'0',
            transition: 'height .3s',
        };

        get headerStartStyle() { return this.collapsed ? '' : 'border-bottom-left-radius:0;'  }
        get headerEndStyle()   { return this.collapsed ? '' : 'border-bottom-right-radius:0;' }
        get buttonEndStyle()   { return this.collapsed ? '' : 'border-bottom-right-radius:0;' }

        open()  { this.toggle(false) }
        close() { this.toggle(true)  }

        toggle(state?: boolean, emitSignal: boolean = true) {
            clearTimeout(this.timeout);

            this.collapsed = state !== undefined ? state : !this.collapsed;

            if (emitSignal)
                this.$emit(this.collapsed ? 'close' : 'open');

            if (this.collapsed) {
                this.style.transition = 'initial';
                this.style.height = `${(<HTMLElement>this.$refs['content']).scrollHeight}px`;

                setTimeout(() => {
                    this.style.transition = 'height .3s';
                    this.style.height = '0';
                }, 0);
            }
            else {
                this.style.height = `${(<HTMLElement>this.$refs['content']).scrollHeight}px`;

                this.timeout = window.setTimeout(
                    () => this.style.height = undefined,
                    200
                );
            }
        }
    }
</script>

<style lang="scss">
.header-button-container-container:has(.header-button-container:empty) {
    display: none;
}
</style>
