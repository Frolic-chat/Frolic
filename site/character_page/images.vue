<template>
    <div>
        <div v-show="loading" class="alert alert-info">Loading images...</div>
        <div class="character-images" :class="forcedColumnCount()">
            <div v-if="!loading && !images.length" class="alert alert-info">No images.</div>
            <template v-if="images.length" v-for="image in images">
                <div :key="image.id" class="character-image-wrapper">
                    <!-- @vue-expect-error e is `MouseEvent` but the old TS version doesn't allow types in templates -->
                    <a :href="imageUrl(image)" @click="e => handleImageClick(e, image)" target="_blank">
                        <img :src="imageUrl(image)" class="character-image">
                    </a>
                    <div class="image-description" v-if="!!image.description">{{image.description}}</div>
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
    import * as Utils from '../utils';
    import {methods} from './data_store';
    import {Character} from './interfaces';
    import core from '../../chat/core';
    import _ from 'lodash';

    import Logger from 'electron-log/renderer';
    const log = Logger.scope('character_page/images');


    @Component
    export default class ImagesView extends Vue {
        @Prop({required: true})
        private readonly character!: Character;
        @Prop({ default: false })
        private readonly usePreview: boolean = false;
        @Prop
        private readonly injectedImages?: CharacterImage[] | null;

        private shown = false;
        previewImage = '';
        images: CharacterImage[] = [];
        loading = true;
        error = '';

        imageUrl = (image: CharacterImage) => methods.imageUrl(image);
        thumbUrl = (image: CharacterImage) => methods.imageThumbUrl(image);


        show(): void {
            log.debug('profile.images.show', { shown: this.shown, loading: this.loading });

            if (this.shown)
                return;

            this.images = this.resolveImages();

            // this promise is intentionally not part of a chain
            this.showAsync().catch(err => log.error('profile.images.error', { err }));
        }


        async showAsync(): Promise<void> {
            log.debug('profile.images.show.async', { shown: this.shown, loading: this.loading });

            if (this.shown)
                return;

            try {
                this.error = '';
                this.shown = true;
                this.loading = true;

                this.images = await this.resolveImagesAsync();
            }
            catch (err) {
                this.shown = false;

                if (Utils.isJSONError(err))
                    this.error = <string>err.response.data.error;

                Utils.ajaxError(err, 'Unable to refresh images.');
                log.error('profile.images.show.async.error', { err });
            }

            this.loading = false;
        }

        async resolveImagesAsync(): Promise<CharacterImage[]> {
            log.debug('profile.images.async.injected', {
                count: this.injectedImages?.length,
                desc: this.injectedImages && this.injectedImages.map(i => i.description),
            });

            if (this.injectedImages?.length)
                return this.injectedImages;

            const c = await core.cache.profileCache.get(this.character.character.name);

            log.debug('profile.images.async.cache', {
                count: c?.meta?.images?.length,
                desc: c?.meta?.images && c.meta.images.map(i => i.description),
            });

            if (c?.meta?.images)
                return c.meta.images;

            const images = await methods.imagesGet(this.character.character.id);

            log.debug('profile.images.async.api', {
                count: images.length,
                desc: images && images.map(i => i.description),
            });

            return images;
        }


        resolveImages(): CharacterImage[] {
            log.debug('profile.images.sync.injected', {
                count: this.injectedImages?.length,
                desc: this.injectedImages && this.injectedImages.map(i => i.description),
            });

            if (this.injectedImages?.length)
                return this.injectedImages;

            const c = core.cache.profileCache.getSync(this.character.character.name);

            log.debug('profile.images.sync.cache', {
                count: c?.meta?.images?.length,
                desc: c?.meta?.images && c.meta.images.map(i => i.description),
            });

            return c?.meta?.images ?? [];
        }


        handleImageClick(e: MouseEvent, image: CharacterImage): void {
            if (e.button === 0 && this.usePreview) {
                this.previewImage = methods.imageUrl(image);
                e.preventDefault();
            }
            else if (e.button !== 0) {
                // This never fires for some reason. Something to do with the way the click is consumed.
                log.debug('handleImageClick', { button: e.button });
            }
        }

        /**
         * You are explicity forbidden from relying on this. It's poorly implemented and
         * will interfere with future designs. Rewrite or destroy it as you see necessary
         * and can account for.
         */
        forcedColumnCount(): string {
            if (this.images.length <= 5) {
                return 'two-image-columns';
            }
            else if (this.images.length <= 7) {
                return 'three-image-columns';
            }
            else if (this.images.length <= 9) {
                return 'four-image-columns';
            }
            else {
                return ''
            }
        }
    }
</script>
