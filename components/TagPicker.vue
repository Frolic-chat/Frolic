<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div class="tag-picker mt-3 d-flex flex-row justify-content-center ">
    <div class="col">
        <h5>Selected Tags</h5>
        <!-- :style="[ selectedStyle, 'min-width:17ch' ]" -->
        <draggable :style="availableStyle" ref="selectedList" class="border d-flex flex-wrap align-items-start p-2" :list="selectedTags" group="genders" @change="updateSelected">
            <div v-for="(tag, i) in selectedTags" :key="tag" class="grabbable badge badge-primary m-1">
                <h5 class="m-0">
                    {{ i + 1 }}. {{ tag }}
                </h5>
            </div>
        </draggable>
    </div>
    <div class="col">
        <h5>Available Tags</h5>
        <!-- :style="[ availableStyle, 'min-width:17ch' ]"  -->
        <draggable :style="availableStyle" ref="availableList" class="border d-flex flex-wrap align-items-start p-2" :list="displayedTags" group="genders">
            <div v-for="tag in displayedTags" :key="tag" class="grabbable badge badge-secondary m-1">
                <h5 class="m-0">
                    {{ tag }}
                </h5>
            </div>
        </draggable>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Watch } from '@f-list/vue-ts';
import draggable from 'vuedraggable';

@Component({
    components: {
        draggable,
    }
})
export default class TagPicker extends Vue {
    @Prop({ required: true })
    readonly availableTags!: string[];

    get displayedTags() {
        return this.availableTags.filter(s => !this.selectedTags.includes(s));
    }

    @Prop({ default: () => [] })
    readonly value!: string[];

    selectedTags: string[] = [];

    updateSelected() {
        this.$emit('input', this.selectedTags);
        this.$nextTick(this.updateAvailableHeight);
        this.$nextTick(this.updatedSelectedHeight);
    }

    @Watch('value')
    onValueChanged() {
        this.selectedTags = [ ...this.value ];
    }

    availableStyle = 'min-height:4.5em';
    selectedStyle  = 'min-height:4.5em';

    updateAvailableHeight() {
        const children = (this.$refs['availableList'] as HTMLDivElement).childElementCount;
        if (!children) {
            this.availableStyle = 'min-height:4.5em';
            return;
        }

        const child_height = (this.$refs['availableList'] as HTMLDivElement).firstElementChild!.scrollHeight;

        this.availableStyle = 'min-height:' +  child_height * (this.displayedTags.length + 2) + 'px;';
    }

    updatedSelectedHeight() {
        const children = (this.$refs['selectedList'] as HTMLDivElement).childElementCount;
        if (!children) {
            this.selectedStyle = 'min-height:4.5em';
            return;
        }

        const child_height = (this.$refs['selectedList'] as HTMLDivElement).firstElementChild!.scrollHeight;

        this.selectedStyle = 'min-height:' +  child_height * (this.selectedTags.length + 2) + 'px;';
    }
}
</script>

<style lang="scss">
.grabbable {
    cursor: grab;
    user-select: none;
}
</style>
