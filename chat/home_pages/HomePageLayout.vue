<template>
<div class="home-page">
    <div class="prescroll container-fluid">
        <slot name="prescroll"></slot>
    </div>
    <div class="scroll-cage container-fluid" ref="scrollCage">
    <header>
        <slot name="header"></slot>
    </header>
    <main>
        <slot></slot>
    </main>
    <footer>
        <slot name="footer"></slot>
    </footer>
    </div><!-- /scroll-cage -->
    <div class="postscroll container-fluid">
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

.prescroll {
    padding-top: 10px;
}
.scroll-cage {
    flex: 1 1 0%;
    overflow: auto;
}

.postscroll {
    padding-bottom: 10px;
}
</style>
