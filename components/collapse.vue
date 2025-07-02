<template>
    <div class="card bg-light">
        <div class="card-header" @click="toggle()" style="cursor:pointer" :class="headerClass">
            <h4>{{title}} <span class="fas" :class="'fa-chevron-' + (collapsed ? 'down' : 'up')"></span></h4>
        </div>
        <div :style="style" style="overflow:hidden">
            <div class="card-body" ref="content">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
    import { Vue, Component, Prop, Ref, Emit } from 'vue-facing-decorator';

    @Component
    export default class Collapse extends Vue {
        @Prop({required: true})
        readonly title!: string;
        @Prop({ default: '' })
        readonly headerClass!: string;

        @Ref
        content!: HTMLDivElement;

        collapsed = true;
        timeout = 0;
        style = {height: <string | undefined>'0', transition: 'height .2s'};

        @Emit
        open(): void {};

        @Emit
        close(): void {};

        toggle(state?: boolean) {
            clearTimeout(this.timeout);
            this.collapsed = state !== undefined ? state : !this.collapsed;
            if(this.collapsed) {
                this.close();
                this.style.transition = 'initial';
                this.style.height = `${this.content.scrollHeight}px`;
                setTimeout(() => {
                    this.style.transition = 'height .2s';
                    this.style.height = '0';
                }, 0);
            } else {
                this.open();
                this.style.height = `${this.content.scrollHeight}px`;
                this.timeout = window.setTimeout(() => this.style.height = undefined, 200);
            }
        }
    }
</script>
