<template>
  <div class="tag-picker">
    <h3>Available Tags</h3>
    <div class="tag-list available">
      <div
        v-for="tag in availableTags"
        :key="tag"
        class="tag-item"
        :draggable="true"
        @click="addTag(tag)"
        @dragstart="onDragStart(tag, 'available')"
      >
        {{ tag }}
      </div>
    </div>

    <h3>Selected Tags</h3>
    <div
      class="tag-list selected"
      @dragover.prevent
      @drop="onDrop"
    >
      <div
        v-for="(tag, i) in selectedTags"
        :key="tag"
        class="tag-item selected"
        :draggable="true"
        @click="removeTag(tag)"
        @dragstart="onDragStart(tag, 'selected', i)"
        @dragover.prevent="onDragOver(i)"
        @drop="onDropAt(i)"
      >
        {{ tag }}
      </div>
    </div>

    <div class="output">
      <h4>Array Output:</h4>
      <pre>{{ selectedTags }}</pre>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Watch } from '@f-list/vue-ts';
import Vue from 'vue';

type DragEventData = {
    tag:    TagPicker['availableTags'][number],
    source: 'available' | 'selected',
    index?: number,
}

@Component({})
export default class TagPicker extends Vue {
    @Prop({ required: true })
    readonly availableTags!: string[];

    @Prop({ default: () => [] })
    readonly value!: string[];

    selectedTags: string[] = [];

    dragData: DragEventData | null = null;

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


    onDrop() {
        const { tag, source } = this.dragData || {};

        if (tag && source === 'available') // proxy
            this.addTag(tag);

        this.dragData = null;
    }

    onDragOver(_i: number) {
      // Optional visual feedback
    }

    onDropAt(targetIndex: number) {
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
.tag-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border: 1px solid #ccc;
  padding: 0.5rem;
  min-height: 50px;
}
.tag-item {
  padding: 0.25rem 0.75rem;
  background: #f0f0f0;
  border-radius: 1rem;
  cursor: grab;
  user-select: none;
}
.tag-item.selected {
  background: #d1e7ff;
}
.tag-item:hover {
  background: #e0e0e0;
}
.output {
  background: #fafafa;
  padding: 0.5rem;
  border-radius: 0.25rem;
}
</style>
