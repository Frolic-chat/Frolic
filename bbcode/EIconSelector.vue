<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<modal ref="dialog" :action="l('eicon.select')" :buttons="false" dialogClass="eicon-selector big" @close="disengage()">
  <div class="eicon-selector-ui">
    <div>
      <div v-if="isReady" class="search-bar">
        <div data-balloon-length="fit" :aria-label="l('eicon.favTooltip')" data-balloon-pos="down" data-balloon-nofocus>
          <input id="search" ref="search" v-model="search" type="text" class="form-control search" :placeholder="l('eicon.search')" tabindex="0" @input="searchUpdateDebounce()" />
        </div>
        <!-- @click.prevent.stop="setFocus()" @mousedown.prevent.stop @mouseup.prevent.stop -->
        <div class="btn-group search-buttons">
          <div class="btn expressions" :title="l('eicon.favorites')" role="button" tabindex="0" @click.prevent.stop="searchWithString(favesSearchString)">
            <i class="fas fa-thumbtack"></i>
          </div>

          <div class="btn expressions" :title="l('eicon.expressions')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:expressions')">
            <i class="fas fa-theater-masks"></i>
          </div>

          <div class="btn soft" :title="l('eicon.soft')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:soft')">
            <i class="fas fa-spa"></i>
          </div>

          <div class="btn sexual" :title="l('eicon.sexual')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:sexual')">
            <i class="fas fa-heart"></i>
          </div>

          <div class="btn bubbles" :title="l('eicon.speech')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:bubbles')">
            <i class="fas fa-comment"></i>
          </div>

          <div class="btn actions" :title="l('eicon.symbols')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:symbols')">
            <i class="fas fa-icons"></i>
          </div>

          <div class="btn memes" :title="l('eicon.memes')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:memes')">
            <i class="fas fa-poo"></i>
          </div>

          <div class="btn random" :title="l('eicon.random')" role="button" tabindex="0" @click.prevent.stop="searchWithString('category:random')">
            <i class="fas fa-random"></i>
          </div>

          <div class="btn refresh" :title="l('eicon.refresh')" role="button" tabindex="0" @click.prevent.stop="refreshIcons">
            <i class="fas fa-sync"></i>
          </div>
        </div>
      </div>

      <div v-if="devtools" class="devtools">
        <div class="btn-group">
          {{ status }}
          <!-- eslint-disable vue/no-multi-spaces -->
          <div title="Status: Ready"         role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'ready'">R</div>
          <div title="Status: Unverified"    role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'unverified'">U</div>
          <div title="Status: Cached"        role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'cached'">C</div>
          <div title="Status: Loading"       role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'loading'">L</div>
          <div title="Status: Uninitialized" role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'uninitialized'">U</div>
          <div title="Status: Error"         role="button" tabindex="0" class="btn" @click.prevent.stop="() => status = 'error'">E</div>
          <!-- eslint-enable vue/no-multi-spaces -->
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

      <div v-if="status === 'error'" class="d-flex flex-column align-items-center m-4">
        <strong>{{ l('eicon.errorWillRefresh') }}</strong>
      </div>
      <div v-else-if="!isReady" class="d-flex flex-column align-items-center m-4">
        <strong>{{ l('eicon.notready') }}</strong>
        <br>
        <div class="spinner-border" role="status" aria-hidden="true"></div>
      </div>
      <div v-else class="carousel slide w-100 results">
        <div class="carousel-inner w-100" role="listbox">
          <template v-if="refreshing">
            <strong>{{ l('eicon.loading') }}</strong>
            <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>
          </template>
          <!-- Test -->
          <div v-for="eicon in results" v-else :key="eicon" class="carousel-item" role="img" :aria-label="eicon" :eicon.prop="eicon" tabindex="0">
            <img v-if="results.includes(eicon)" class="eicon" :alt="eicon" :src="'https://static.f-list.net/images/eicon/' + eicon + '.gif'" :title="eicon" loading="lazy" role="button" :aria-label="eicon" @click.prevent.stop="selectIcon(eicon, $event)">

            <div v-if="results.includes(eicon)" class="btn favorite-toggle" :class="{ favorited: isFavorite(eicon) }" role="button" :aria-label="isFavorite(eicon) ? l('eicon.favRemove') : l('eicon.favAdd')" @click.prevent.stop="toggleFavorite(eicon)">
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
import { Component, Hook } from '@frolic/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';

import * as Electron from 'electron';
import core from '../chat/core';
import l from '../chat/localize';
import * as Utils from '../helpers/utils';

import type { AxiosProgressEvent } from 'axios';

import NewLogger from '../helpers/log';
const log = NewLogger('eicons', () => core.state.generalSettings.argv.includes('--debug-eicons'));

@Component({ components: { modal: Modal } })
export default class EIconSelector extends CustomDialog {
    private onSelect?: (eicon: string, shift: boolean) => void;

    l = l;

    results: string[] = [];
    search = '';
    refreshing = true;
    status: 'ready'   | 'unverified'    | 'cached'
          | 'loading' | 'uninitialized' | 'error' = 'uninitialized';
    loadingPercent = 100;

    /**
     * Sent from main; extra toolbar to provoke situations for development testing.
     */
    devtools = false;

    readonly favesSearchString = 'f:';

    get isReady() {
        return this.status !== 'loading' && this.status !== 'uninitialized' && this.status !== 'error';
    };

    readonly searchUpdateDebounce = Utils.debounce(async () => this.results = await this.runSearch(), { wait: 350 });

    /**
     * The eicon needs to "do" things with the selected eicon(s). That's outside of our domain, so the logical thing is to pass in the "do things" function. If we wanted to override custom dialog `.show()` we could, but that would give the eicon `.show()` a different invocation and might cause confusion.
     * @param onSelect the function to run when an eicon is selected. `shift` is a boolean for alternative functionality; standard behavior should be "don't close eicon dialog if shift is held."
     */
    engage(onSelect?: (eicon: string, shift: boolean) => void) {
        this.onSelect = onSelect;

        if (!this.isReady)
            void this.pollStatus();

        this.show();
    }

    disengage() {
        this.onSelect = undefined;
    }

    @Hook('created')
    created() {
        Electron.ipcRenderer.on('eicon-progress', (_, e: AxiosProgressEvent) =>
            this.loadingPercent = (e.progress || 100)
        );

        // register eicon error.
        Electron.ipcRenderer.on('eicon-error', () => {});

        void this.pollStatus();
    }

    /**
     * All the work for connecting to main should be in here.
     */
    async pollStatus() {
        this.status = 'loading';
        this.refreshing = true;

        const r = await Utils.invoke('eicon-status').catch(() => undefined);
        if (!r) {
            log.verbose('selector.pollStatus.noResponse');
            return;
        }

        log.debug('selector.pollStatus', r);

        this.devtools = r.devtools ?? false;

        if (r.amount) { // Shortcut success if we have any.
            if (r.status === 'ready' || r.status === 'unverified')
                this.status = r.status;
            else
                this.status = 'cached';

            this.refreshing = false;
        }
        if (r.status) {
            if (r.status === 'ready')
                this.status = 'ready';
            else if (r.amount)
                this.status = 'cached';
            else
                this.status = r.status;

            this.refreshing = false;

            log.debug('selector.pollStatus.ready', this.status);

            void this.searchWithString(this.search || this.favesSearchString);
        }
        else { // Broken response?
            log.debug('selector.pollStatus.queuerepoll');

            window.setTimeout(() => void this.pollStatus(), 1000);
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
    async runSearch(): Promise<string[]> {
        this.refreshing = true;

        let r: string[] | undefined;

        if (this.search) {
            const s = this.search === this.favesSearchString
                ? `${this.favesSearchString}${core.characters.ownCharacter.name}`
                : this.search;

            r = await Utils.invoke('eicon-search', s).catch(() => undefined);
        }
        else {
            r = await this.getPage();
        }

        log.debug('selector.runSearch.results', r?.length);

        this.refreshing = false;

        return Array.isArray(r) ? r : [];
    }

    selectIcon(eicon: string, event: MouseEvent): void {
        const shift = event.shiftKey;

        this.onSelect?.(eicon, shift);

        // else if this.engagedTextBox ... so on.
    }

    /**
     * Return a specific number of entries. Default is one full page.
     */
    async getPage(count: number = 0): Promise<string[]> {
        const r = await Utils.invoke('eicon-page', count).catch(() => undefined);

        log.debug('selector.runSearch.results', r?.length);

        return Array.isArray(r) ? r : [];
    }

    async refreshIcons(payload: MouseEvent) {
        this.refreshing = true;

        await Utils.invoke('eicon-refresh', payload.shiftKey).catch(() => {});

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
        if (eicon in core.state.favoriteEIcons) {
            // Legacy code
            /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete */
            delete core.state.favoriteEIcons[eicon];
        }
        else {
            core.state.favoriteEIcons[eicon] = true;
        }

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
