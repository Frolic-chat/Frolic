<template>
<div class="home-page">
    <div class="prescroll">
        <slot name="prescroll"></slot>
    </div>
    <div class="scroll-cage" ref="scrollCage">
    <header>
        <slot name="header">
            <h4>Header!</h4>
        </slot>
    </header>
    <main>
        <slot>
            Default home-page body.
        </slot>
    </main>
    <footer>
        <slot name="footer">
            Default home-page footer.
        </slot>
    </footer>
    </div><!-- /scroll-cage -->
    <div class="postscroll">
        <slot name="postscroll"></slot>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@f-list/vue-ts';

@Component({})
export default class HomePageLayout extends Vue {
    scrollToTop(): void {
        const cage = (this.$refs['scrollCage'] as HTMLElement);
        this.$nextTick(() => cage.scrollTo(0,0));
    }
}
</script>

<style lang="scss">
.home-page {
    align-items: justify;

    // Inside scroll cage to pad against the scroll bar.
    header, main, footer {
        margin-right: 5px;
    }

    header, footer {
        display: flex;
        justify-content: space-between;
    }

    header {
        margin-top: 5px;
    }

    header > * {
        margin: 0;
        padding: 0;
    }
}
.scroll-cage {
    flex: 1 1 0%;
    overflow: auto;
}
</style>
