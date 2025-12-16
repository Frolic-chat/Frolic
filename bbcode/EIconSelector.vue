<template>
  <modal :action="l('eicon.select')" ref="dialog" :buttons="false" dialogClass="eicon-selector big">
    <div class="eicon-selector-ui">
      <div v-if="!isReady" class="d-flex align-items-center loading">
        <strong>{{ l('eicon.notready') }}</strong>
        <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>
      </div>
      <div v-else>
        <div class="search-bar">
        <input type="text" class="form-control search" id="search" v-model="search" ref="search" :placeholder="l('eicon.search')" @input="searchUpdateDebounce()" tabindex="0" @click.prevent.stop="setFocus()" @mousedown.prevent.stop @mouseup.prevent.stop />
        <div class="btn-group search-buttons">
            <div class="btn expressions" @click.prevent.stop="searchWithString('category:favorites')" :title="l('eicon.favorites')" role="button" tabindex="0">
            <i class="fas fa-thumbtack"></i>
            </div>

            <div class="btn expressions" @click.prevent.stop="searchWithString('category:expressions')" :title="l('eicon.expressions')" role="button" tabindex="0">
            <i class="fas fa-theater-masks"></i>
            </div>

            <div class="btn soft" @click.prevent.stop="searchWithString('category:soft')" :title="l('eicon.soft')" role="button" tabindex="0">
            <i class="fas fa-spa"></i>
            </div>

            <div class="btn sexual" @click.prevent.stop="searchWithString('category:sexual')" :title="l('eicon.sexual')" role="button" tabindex="0">
            <i class="fas fa-heart"></i>
            </div>

            <div class="btn bubbles" @click.prevent.stop="searchWithString('category:bubbles')" :title="l('eicon.speech')" role="button" tabindex="0">
            <i class="fas fa-comment"></i>
            </div>

            <div class="btn actions" @click.prevent.stop="searchWithString('category:symbols')" :title="l('eicon.symbols')" role="button" tabindex="0">
            <i class="fas fa-icons"></i>
            </div>

            <div class="btn memes" @click.prevent.stop="searchWithString('category:memes')" :title="l('eicon.memes')" role="button" tabindex="0">
            <i class="fas fa-poo"></i>
            </div>

            <div class="btn random" @click.prevent.stop="searchWithString('category:random')" :title="l('eicon.random')" role="button" tabindex="0">
            <i class="fas fa-random"></i>
            </div>

            <div class="btn refresh" @click.prevent.stop="refreshIcons" :title="l('eicon.refresh')" role="button" tabindex="0">
            <i class="fas fa-sync"></i>
            </div>
        </div>
        </div>

        <!-- Footer -->
        <div class="courtesy">
          {{ l('eicon.thanks') }}<a href="https://xariah.net/eicons">xariah.net</a>
        </div>

        <div class="upload">
          <a href="https://www.f-list.net/icons.php">{{ l('eicon.upload') }}</a>
        </div>
        <!-- /Footer -->

        <div class="carousel slide w-100 results">
          <div class="carousel-inner w-100" role="listbox">
            <template v-if="refreshing">
                <strong>{{ l('eicon.loading') }}</strong>
                <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>
            </template>
            <div v-else class="carousel-item" v-for="eicon in results" :key="eicon" role="img" :aria-label="eicon" tabindex="0">
              <img class="eicon" v-if="results.includes(eicon)" :alt="eicon" :src="'https://static.f-list.net/images/eicon/' + eicon + '.gif'" :title="eicon" loading="lazy" role="button" :aria-label="eicon" @click.prevent.stop="selectIcon(eicon, $event)">

              <div class="btn favorite-toggle" v-if="results.includes(eicon)" :class="{ favorited: isFavorite(eicon) }" @click.prevent.stop="toggleFavorite(eicon)" role="button" :aria-label="isFavorite(eicon) ? l('eicon.favRemove') : l('eicon.favAdd')">
                <i class="fas fa-thumbtack"></i>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </modal>
</template>

<script lang="ts">
import { Component, Hook, Prop } from '@f-list/vue-ts';
import CustomDialog from '../components/custom_dialog';
import modal from '../components/Modal.vue';

import * as Electron from 'electron';
import core from '../chat/core';
import l from '../chat/localize';
import * as Utils from '../helpers/utils';

import { debounce } from '../helpers/utils';
import { AxiosProgressEvent } from 'axios';

import NewLogger from '../helpers/log';
const log = NewLogger('eicons');

@Component({ components: { modal } })
export default class EIconSelector extends CustomDialog {
    @Prop
    readonly onSelect?: (eicon: string, shift: boolean) => void;

    l = l;

    results: string[] = [];
    search = '';
    refreshing = true;
    status: 'ready'   | 'unverified'
          | 'loading' | 'uninitialized' | 'error' = 'uninitialized';
    loadingPercent = 100;

    get isReady() { return this.status !== 'loading' && this.status !== 'uninitialized' && this.status !== 'error' };

    searchUpdateDebounce = debounce(async () => this.results = await this.runSearch(), { wait: 350 });

    @Hook('created')
    created() {
        Electron.ipcRenderer.on('eicon-progress', (_, e: AxiosProgressEvent) =>
            this.loadingPercent = (e.progress || 100)
        );

        // register eicon error.
        Electron.ipcRenderer.on('eicon-error', () => {});

        void this.pollStatus();
    }

    async pollStatus() {
        this.status = 'loading';
        this.refreshing = true;

        const r = await Utils.invoke('eicon-status').catch();

        log.debug('selector.pollStatus', r);

        if (r?.status) {
            if (r.status === 'ready' || r.status === 'error')
                this.status = r.status;
            else
                this.status = 'unverified';

            this.refreshing = false;

            log.debug('selector.pollStatus.ready', this.status);

            void this.searchWithString(this.search || `category:favorites:${core.characters.ownCharacter.name}`);
        }
        else {
            log.debug('selector.pollStatus.queuerepoll');

            setTimeout(() => this.pollStatus(), 1000);
        }
    }

    /**
     * Search and assign the results into the results storage.
     * @param s
     */
    async searchWithString(s: string) {
        this.search = s;
        this.results = await this.runSearch();
    }

    /**
     * Search and return the results.
     */
    async runSearch() {
        this.refreshing = true;

        const r = this.search
            ? await Utils.invoke('eicon-search', this.search).catch()
            : await this.getPage();

        log.debug('selector.runSearch.results', r.length);

        this.refreshing = false;

        return Array.isArray(r) ? r : [];
    }

    selectIcon(eicon: string, event: MouseEvent): void {
        const shift = event.shiftKey;

        this.onSelect?.(eicon, shift);
    }

    /**
     * Return a specific number of entries. Default is one full page.
     */
    async getPage(n: number = 0) {
        const r = await Utils.invoke('eicon-page', n).catch();

        log.debug('selector.runSearch.results', r.length);

        return Array.isArray(r) ? r : [];
    }

    async refreshIcons(payload: MouseEvent) {
        this.refreshing = true;

        await Utils.invoke('eicon-refresh', payload.shiftKey).catch();

        this.results = await this.runSearch();

        this.refreshing = false;
    }

    /**
     * On focus, we may be in 'loading' mode and there is no search input.
     */
    setFocus(): void {
        const search = (this.$refs['search'] as HTMLInputElement | undefined);

        search?.focus();
        search?.select();
    }

    isFavorite(eicon: string): boolean {
        return eicon in core.state.favoriteEIcons;
    }

    toggleFavorite(eicon: string): void {
        if (eicon in core.state.favoriteEIcons)
            delete core.state.favoriteEIcons[eicon];
        else
            core.state.favoriteEIcons[eicon] = true;

        void core.settingsStore.set('favoriteEIcons', core.state.favoriteEIcons);

        this.$forceUpdate();
    }
}
</script>

<style lang="scss">
.modal-body:has(> .eicon-selector-ui) {
    /* Has to override on-element styling in modal. */
    overflow-x: hidden !important;
}

.eicon-selector.big {
    line-height: 1;
    z-index: 1000;

    min-height: 356px; /* Seemingly arbitrary */
    width: 590px;
    max-width: 590px;
}

.eicon-selector-ui {
    min-width: 555px;

    .search-bar {
        display: flex;

        .search {
            flex: 1;
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
        }

        .search-buttons {
            margin-left: -1px;

            .btn {
                border-bottom: 1px solid var(--secondary);

                .fas {
                    text-align: center;
                    vertical-align: inherit;
                    width: 1em;
                }
            }

            .expressions {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }
        }
    }

    .upload {
        left: 1rem;

        position: absolute;
        bottom: 7px;
        font-size: 9px;
        opacity: 50%;
    }

    .courtesy {
        right: 1rem;

        position: absolute;
        bottom: 7px;
        font-size: 9px;
        opacity: 50%;
    }
}

.carousel.results {
    margin-top: 5px;
    margin-bottom: 0.5rem;

    max-height: unset;
    /* Each icon is 75x75px, wiuth a 1px border.
        However, the border shrinks for some reason,
        so the actual icon div height is 76.56.
        Total height: 76.56 * 7 = 535.92px */
    height: 537px;

    .carousel-inner {
        overflow-x: hidden;
        overflow-y: scroll;
        height: 100%;
    }

    .carousel-item {
        display: inline-block;
        width: initial;
        margin-right: initial;
        border: solid 1px transparent !important;
        position: relative;

        .favorite-toggle {
            position: absolute;
            right: 0;
            top: 0;
            border: none;
            margin: 0;
            padding: 4px;
            border-radius: 0;
            visibility: hidden;

            i {
                color: var(--gray-dark);
                -webkit-text-stroke-width: medium;
                -webkit-text-stroke-color: var(--light);
            }

            &.favorited {
                i {
                    color: var(--green);
                }

                &:hover {
                i {
                    -webkit-text-stroke-color: var(--gray-dark);
                }
            }
            }

            &:hover {
                background: linear-gradient(to bottom left, var(--light), transparent 60%);

                i {
                    -webkit-text-stroke-color: var(--green);
                }
            }
        }

        img.eicon {
            width: 75px;
            height: 75px;
            max-width: 75px;
            max-height: 75px;
        }

        &:hover {
            background-color: var(--secondary) !important;
            border: solid 1px var(--gray-dark) !important;

            .favorite-toggle {
                visibility: visible !important;
            }
        }
    }
}
</style>
