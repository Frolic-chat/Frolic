<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<!-- doesn't seem to impact anything :style="{ 'contain-intrinsic-height': `${totalHeight}px` }" -->
<div ref="scroller" class="virtual-scroller" @scroll="onScroll">
    <div class="scroller-content" :style="{ height: `${totalHeight}px` }">
        <div v-for="(item, index) in visibleItems" :key="item.id || index" class="scroller-item" :style="getItemStyle(index)">
            <slot :item="item"></slot>
            <div v-if="debug" class="debug-index">{{ leadingSpaceIndex + index }}</div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';

import NewLogger from '../helpers/log';
const log = NewLogger('virtual-scroller');

@Component({})
export default class VirtualScroller extends Vue {
    @Prop({ required: true })
    items!: (unknown & { id: number })[];

    @Prop({ default: 50 })
    itemHeight!: number;

    // Not yet implemented.
    @Prop({ default: 100 })
    overdraw!: number;

    @Prop({ default: false })
    debug!: boolean;

    scrollTop = 0;
    visibleItems: (unknown & { id: number })[] = [];
    visibleHeight = 0;
    leadingSpaceIndex = 0;

    ro!: ResizeObserver;

    get totalHeight() {
        return this.itemHeight * this.items.length;
    }

    get itemStyle() {
        return {
            height:        this.itemHeight + 'px',
            'line-height': this.itemHeight + 'px',
        }
    }

    @Hook('mounted')
    mounted() {
        if (!this.items[0].id || this.itemHeight < 0 || this.overdraw < 0)
            throw new Error(`Forbidden act with the virtual scroller:\n + No id property on items in array.\n + Items must have a height\n + Overdraw can be absent, zero, or a positive integer.`);

        this.visibleHeight = (this.$refs['scroller'] as HTMLDivElement).clientHeight;
        this.updateVisibleItems();

        this.ro = new ResizeObserver(() => {
            log.verbose('Resized:', {
                old: this.visibleHeight,
                new: (this.$refs['scroller'] as HTMLDivElement).clientHeight,
            });

            this.visibleHeight = (this.$refs['scroller'] as HTMLDivElement).clientHeight;
        });

        this.ro.observe((this.$refs['scroller'] as HTMLDivElement));
    }

    @Hook('activated')
    activated() {
        this.visibleHeight = (this.$refs['scroller'] as HTMLDivElement).clientHeight;
        this.updateVisibleItems();

        log.verbose('Reactivated - height:', {
            visibleHeight: this.visibleHeight,
            totalHeight: this.totalHeight,
        });
    }

    @Hook('beforeDestroy')
    beforeDestroy() {
        this.ro.disconnect();
    }

    updateVisibleItems() {
        const start_index = Math.max(
            0,
            Math.floor(this.scrollTop / this.itemHeight) - this.overdraw
        );

        const end_index = Math.min(
            this.items.length,
            Math.ceil((this.scrollTop + this.visibleHeight) / this.itemHeight) + this.overdraw
        );

        log.verbose('updateVisibleItems', { old: this.visibleItems, new_start: start_index, new_end: end_index, });

        this.leadingSpaceIndex = start_index;
        this.visibleItems = this.items.slice(start_index, end_index);
    }

    getItemStyle(i: number) {
        return {
            top: `${(this.leadingSpaceIndex + i) * this.itemHeight}px`,
            height: `${this.itemHeight}px`,
        };
    }

    onScroll() {
        this.scrollTop = (this.$refs['scroller'] as HTMLDivElement).scrollTop;
        this.updateVisibleItems();
    }

    @Watch('items')
    onItemsUpdate() {
        this.updateVisibleItems();
    }

    // Potential if we ever desire to make it dynamic:
    // @Watch('itemHeight')
    // onItemHeightChanged() {
    //     this.updateVisibleItems();
    // }
}
</script>

<style lang="scss">
.virtual-scroller {
    overflow-y: auto;
    position: relative;
    contain: content;
    content-visibility: auto;
}

.scroller-content {
    position: relative;
    width: 100%
}

.scroller-item {
    position: absolute;
    width: 100%;
}

.debug-index {
    position: absolute;
    right: 0;
    color: red;
}
</style>
