<template>
  <div class="tag-picker mt-3 d-flex flex-column">
    <h5>Selected Tags</h5>
    <div class="drop-area selected d-flex flex-wrap align-items-center border p-2"
      :class="{ 'drop-highlight': dragOverArea === 'selected' }"
      @dragenter.prevent="visuals.onAreaEnter('selected')"
      @dragleave.prevent="visuals.onAreaLeave"
      @dragover.prevent
      @drop="onDropToSelected">
      <div v-for="(tag, i) in selectedTags" :key="tag"
        class="grabbable badge badge-primary"
        :draggable="true"
        @click="removeTag(tag)"
        @dragstart="onDragStart(tag, 'selected', i)"
        @dragover.prevent="visuals.onDragOver(i)"
        @drop="onDropAtIndex(i)">
        <span v-if="dragOverIndex === i" class="drop-insert"></span>
        {{ tag }}
      </div>
    </div>
    <div class="drop-area available d-flex flex-wrap align-items-center border p-2"
    :class="{ 'drop-highlight': dragOverArea === 'available' }"
    @dragenter.prevent="visuals.onAreaEnter('available')"
    @dragleave.prevent="visuals.onAreaLeave()"
    @dragover.prevent
    @drop="onDropToAvailable">
      <div v-for="tag in displayedTags" :key="tag"
        class="grabbable badge badge-secondary"
        :draggable="true"
        @click="addTag(tag)"
        @dragstart="onDragStart(tag, 'available')">
        {{ tag }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Watch } from '@f-list/vue-ts';

type DragEventData = {
    tag:    TagPicker['availableTags'][number],
    source: 'available' | 'selected',
    index?: number,
}

@Component({})
export default class TagPicker extends Vue {
    @Prop({ required: true })
    readonly availableTags!: string[];

    get displayedTags() {
        return this.availableTags.filter(s => !this.selectedTags.includes(s));
    }

    @Prop({ default: () => [] })
    readonly value!: string[];

    selectedTags: string[] = [];

    dragData: DragEventData | null = null;

    /**
     * Based on the mechanisms of dragging, we can track drag area to perform visual effects.
     */
    dragOverArea: 'none' | 'available' | 'selected' = 'none';
    //dragCounter = { 'none': 0, 'available': 0, 'selected': 0 };
    dragOverIndex = 0;
    visuals = {
        onAreaEnter: (area: 'available' | 'selected') => {
            this.dragOverArea = area;
        },
        onDragOver: (i: number) => {
            this.dragOverIndex = i;
        },
        onAreaLeave: (/*area: TagPicker['dragOverArea']*/) => {
            this.dragOverArea = 'none';
        },
        onDropOut: (event: DragEvent) => {
            const dropTarget = event.currentTarget as HTMLElement;

            if (!dropTarget.closest('.drop-area.selected')) {
                // Not dropped in selected - remove
                const { tag, source } = this.dragData || {};

                if (tag && source === 'selected')
                    this.removeTag(tag);
            }

            this.dragData = null;
        },
    }

    @Watch('value')
    onValueChanged() {
        this.selectedTags = [ ...this.value ];
    }

    addTag(tag: DragEventData['tag']) {
        if (!this.selectedTags.includes(tag))
            this.selectedTags.push(tag);

        this.$emit('input', this.selectedTags);
    }

    removeTag(tag: DragEventData['tag']) {
        this.selectedTags = this.selectedTags.filter(t => t !== tag);

        this.$emit('input', this.selectedTags);
    }

    onDragStart(tag:    DragEventData['tag'],
                source: DragEventData['source'],
                index:  DragEventData['index'] = undefined
               ) {
        this.dragData = { tag, source, index };
    }

    onDropToSelected() {
        const { tag, source } = this.dragData || {};

        if (tag && source === 'available') // proxy
            this.addTag(tag);

        this.dragOverArea = 'none';
        this.dragData = null;
    }

    onDropToAvailable() {
        const { tag, source } = this.dragData || {};

        if (tag && source === 'selected') // proxy
            this.removeTag(tag);

        this.dragOverArea = 'none';
        this.dragData = null;
    }

    onDropAtIndex(targetIndex: number) {
        const { tag, source, index } = this.dragData || {};

        if (!tag)
            return;

        if (source === 'available' && !this.selectedTags.includes(tag)) {
            this.selectedTags.splice(targetIndex, 0, tag);
        }
        else if (source === 'selected' && typeof index === 'number') {
            // This is a reorder
            const moved = this.selectedTags.splice(index, 1)[0];
            this.selectedTags.splice(targetIndex, 0, moved);
        }

        this.dragData = null;
    }
}
</script>

<style lang="scss">
.grabbable {
    cursor: grab;
    user-select: none;

    // Visuals:
    transition: transform 0.15s ease, opacity 0.15s ease;
}

// Visuals:
.grabbable:active {
    transform: scale(1.07);
    opacity: 0.8;
    cursor: grabbing;
}

.drop-area {
    min-height: 50px;

    // Visuals:
    transition: box-shadow 0.2s ease, background-color 0.2s ease;
}

// Visuals:
.drop-area.drop-highlight {
    // Use bootstrap colors
    background-color: #f0f8ff;
    box-shadow: 0 0 0 3px rgba(100, 149, 237, 0.3);
}

// Visuals:
.drop-insert {
    display: inline-block;
    width: 2px;
    height: 1.5em;
    // Use bootstrap colors
    background-color: rgba(100,149,237,0.5);
    margin: 0 4px;
    border-radius: 1px;
}
</style>
