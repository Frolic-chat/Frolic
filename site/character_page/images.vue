<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <div>
        <div v-show="!images" class="alert alert-info">Loading images...</div>
        <div class="character-images" :class="forcedColumnCount()">
            <div v-if="images && !images.length" class="alert alert-info">No images.</div>
            <template v-if="images && images.length">
                <div v-for="image in images" :key="image.id" class="character-image-wrapper">
                    <!-- @vue-expect-error e is `MouseEvent` but the old TS version doesn't allow types in templates -->
                    <a :href="imageUrl(image)" @click="e => handleImageClick(e, image)" target="_blank">
                        <img :src="imageUrl(image)" class="character-image">
                    </a>
                    <div class="image-description" v-if="image.description">
                        {{ image.description }}
                    </div>
                </div>
            </template>
            <div class="image-preview" v-show="previewImage" @click="previewImage = ''">
                <img :src="previewImage"/>
                <div class="modal-backdrop show"></div>
            </div>
        </div>
        <div v-if="error" class="alert alert-info">{{ error }}</div>
    </div>
</template>

<script lang="ts">
    import {Component, Prop} from '@f-list/vue-ts';
    import Vue from 'vue';
    import {CharacterImage} from '../../interfaces';
    //import * as Utils from '../utils';
    import {methods} from './data_store';
    //import {Character} from './interfaces';
    //import core from '../../chat/core';

    import Logger from 'electron-log/renderer';
    const log = Logger.scope('character_page/images');

    @Component
    export default class ImagesView extends Vue {
        @Prop({ default: null })
        readonly images: CharacterImage[] | null = null;

        previewImage = '';
        error = '';

        imageUrl = (image: CharacterImage) => methods.imageUrl(image);
        thumbUrl = (image: CharacterImage) => methods.imageThumbUrl(image);

        handleImageClick(e: MouseEvent, image: CharacterImage): void {
            if (e.button === 0) {
                this.previewImage = methods.imageUrl(image);
                e.preventDefault();
            }
            else if (e.button !== 0) {
                // This never fires for some reason. Something to do with the way the click is consumed.
                log.debug('handleImageClick', { button: e.button });
            }
        }

        /**
         * You are explicity forbidden from relying on this. It's poorly implemented and will interfere with future designs. Rewrite or destroy it as you see necessary and can account for.
         *
         * 5 is the awkward one; it's "too many" for two columns but frequently results in an empty column with three columns. (The height of the area is used first, so a long sidebar means we have tall columns.)
         */
        forcedColumnCount(): string {
            if (!this.images)
                return '';

            if (this.images.length <= 5) {
                return 'two-image-columns';
            }
            else if (this.images.length <= 8) {
                return 'three-image-columns';
            }
            else if (this.images.length <= 12) {
                return 'four-image-columns';
            }
            else {
                return ''
            }
        }
    }
</script>
