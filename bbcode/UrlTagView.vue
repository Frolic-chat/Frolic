<template>
    <span ref="root">
        <i class="fa fa-link"></i>
        <!-- No prevent for @click on purpose -->
        <a
            :href="url"
            rel="nofollow noreferrer noopener"
            target="_blank"
            class="user-link"
            @click="handleClick"
            @mouseover.prevent="show()"
            @mouseenter.prevent="show()"
            @mouseleave.prevent="dismiss()"
            @click.middle.prevent.stop="toggleStickyness()"
        >{{text}}</a>
        <span
            class="link-domain bbcode-pseudo"
        > [{{domain}}]</span>
    </span>
</template>

<script lang="ts">
    import { Vue, Component, Hook, Prop, Ref } from 'vue-facing-decorator';
    import {EventBus} from '../chat/preview/event-bus';
    // import core from './core';

    @Component
    export default class UrlTagView extends Vue {
        @Prop({required: true})
        readonly url!: string;

        @Prop({required: true})
        readonly text!: string;

        @Prop({required: true})
        readonly domain!: string;

        @Ref
        root!: HTMLSpanElement;

        readonly type!: 'UrlTagView';

        @Hook('beforeUnmount')
        beforeDestroy(): void {
            this.dismiss();
        }

        @Hook('mounted')
        mounted(): void {
        //   (this.$el as any).bbcodeTag = 'url';
        //   (this.$el as any).bbcodeParam = this.url;
          (this.root as any).bbcodeTag = 'url';
          (this.root as any).bbcodeParam = this.url;
        }

        @Hook('deactivated')
        deactivate(): void {
            this.dismiss();
        }

        dismiss(force: boolean = false): void {
            EventBus.$emit('imagepreview-dismiss', {url: this.url, force});
        }

        show(): void {
            EventBus.$emit('imagepreview-show', {url: this.url});
        }

        toggleStickyness(): void {
            EventBus.$emit('imagepreview-toggle-stickyness', {url: this.url});
        }

        handleClick(e: MouseEvent): void {
            if (e.altKey) {
                this.toggleStickyness();
                e.preventDefault();
            } else {
                this.dismiss(true);
            }
        }
    }
</script>
