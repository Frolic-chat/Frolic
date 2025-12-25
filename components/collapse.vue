<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <div class="modal-content">
        <div class="modal-header input-group flex-nowrap align-items-stretch border-0 p-0" @click="toggle()" style="cursor:pointer" :class="headerClass">
            <div :style="headerStartStyle" class="form-control d-flex flex-column justify-content-around flex-grow-1 border-0" style="height:auto;">
                <slot name="header">
                    <span><!-- flex-column fix -->
                        <span class="fas" :class="'fa-chevron-' + (collapsed ? 'down' : 'up')"></span>
                        {{ title }}
                    </span>
                </slot>
            </div>
            <div v-if="$slots.button && $slots.button.length" :style="headerEndStyle" class="input-group-append flex-shrink-0 border-0 header-button-container-container">
                <div :style="headerEndStyle" class="input-group-text btn p-0 border-0 header-button-container"> <!-- keep border-left -->
                    <a href="#" @click.prevent="btnClick" :class="btnClass" class="btn justify-content-around h-100 d-flex flex-column border-0" :style="buttonEndStyle">
                        <slot name="button"></slot>
                    </a>
                </div>
            </div>
        </div>

        <div :style="style" class="collapse-wrapper" style="overflow:hidden"><!-- animation wrapper -->
            <div :class="bodyClass" class="modal-body" ref="content" :style="maxHeight ? `max-height: ${maxHeight}` : ''">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from 'vue';
    import { Component, Prop, Hook } from '@f-list/vue-ts';

    import NewLogger from '../helpers/log';
    const log = NewLogger('collapse');

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

        /**
         * When specifying a maxHeight, please specify units! Em's are better than pixels in some contexts!
         */
        @Prop({ default: undefined })
        readonly maxHeight?: string;

        /**
         * An action for the button to run when pressed. If specified, clicking the button area no longer opens and closes the collapse.
         */
        @Prop({ default: () => {} })
        readonly action?: () => void;
        btnClick(e: MouseEvent) {
            if (this.action) {
                e.stopPropagation();
                this.action();
            }
        }

        /**
         * External collapsed signal
         */
        @Prop({ default: undefined })
        readonly initial?: boolean;

        // Internal copy of state.
        collapsed = true;

        @Hook('created')
        created() {
            log.debug('Collapse.created', {
                initial:   this.initial,
                collapsed: this.collapsed,
            });
            this.collapsed = this.initial ?? true;
            this.setInitialState();
        }

        timeout = 0;
        style = {
            height: <string | undefined>'0',
            transition: 'height .225s',
        };

        get headerStartStyle() { return this.collapsed ? '' : 'border-bottom-left-radius:0;'  }
        get headerEndStyle()   { return this.collapsed ? '' : 'border-bottom-right-radius:0;' }
        get buttonEndStyle()   { return this.collapsed ? '' : 'border-bottom-right-radius:0;' }

        /**
         * Open the collapse, optionally making the open instant. If you are controlling the internal state, make sure to observe @open to document the change triggered by open()
         * @param instant Apply the action instantaneously; test thoroughly for your usage.
         */
        open(instant?: boolean) { this.toggle(false, true, instant) }

        /**
         * Close the collapse, optionally making the close instant. If you are controlling the internal state, make sure to observe @close to document the change triggered by close()
         * @param instant Apply the action instantaneously; test thoroughly for your usage.
         */
        close(instant?: boolean) { this.toggle(true, true, instant) }

        setInitialState() {
            this.style.height = this.collapsed ? '0' : undefined;
        }

        toggle(state?: boolean, emitSignal: boolean = true, instant: boolean = false) {
            window.clearTimeout(this.timeout);

            this.collapsed = state !== undefined ? state : !this.collapsed;

            if (emitSignal)
                this.$emit(this.collapsed ? 'close' : 'open');

            if (instant) {
                this.style.transition = 'initial';

                if (this.collapsed) {
                    this.style.height = '0';
                }
                else {
                    this.style.height = `${(<HTMLElement>this.$refs['content']).clientHeight}px`;
                    window.requestAnimationFrame(() => this.style.height = undefined);
                }
            }
            else if (this.collapsed) {
                this.style.transition = 'initial';
                this.style.height = `${(<HTMLElement>this.$refs['content']).clientHeight}px`;

                window.setTimeout(
                    () => {
                        this.style.transition = 'height .225s';
                        this.style.height = '0';
                    },
                    0
                );
            }
            else { // not collapsed
                this.style.transition = 'height .225s';
                this.style.height = `${(<HTMLElement>this.$refs['content']).clientHeight}px`;

                this.timeout = window.setTimeout(
                    () => this.style.height = undefined,
                    225
                );
            }
        }
    }
</script>

<style lang="scss">
.header-button-container .btn:empty {
    display: none !important;
}

.modal-content > .collapse-wrapper > .modal-body {
    overflow: auto;
}
</style>
