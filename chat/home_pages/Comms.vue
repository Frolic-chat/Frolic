<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<page>
    <template v-slot:prescroll>
        <div class="page-header d-flex">
            <div class="mr-auto align-self-center"><slot name="title"></slot></div>
            <div class="ml-auto align-self-center flex-shrink-0"><slot name="title-end"></slot></div>
        </div>
    </template>

    <template v-slot:default>
        <div class="d-flex flex-column flex-nowrap">
            <slot name="before-body"></slot>

            <!-- memo -->
            <div class="form-group">
                <h5><u>Memo</u></h5>
                <span v-if="memoLoading" class="text-center">
                    Loading memo...
                </span>

                <textarea v-else-if="editingMemo" v-model="memoInEdit" id="comms-memo-edit" maxlength="1000" class="form-control"></textarea>

                <p v-else class="form-control" style="user-select: text; height: auto;">{{ memoBody || 'No memo set for this character.' }}</p>

                <div class="d-flex mt-2" style="gap: 1em;">
                    <span class="mr-auto"><span v-if="memoError" class="text-danger fa-solid fa-fw fa-circle-exclamation"></span> {{ memoError }}</span>
                    <button v-if="!memoLoading" class="ml-auto btn" :class="editingMemo ? 'btn-danger' : 'btn-info'" @click="cancelOrRefreshMemo(editingMemo)">
                        {{ editingMemo ? 'Cancel' : 'Refresh' }}
                    </button>
                    <button v-if="!memoLoading" class="btn btn-primary" @click="memoButtonClicked()">
                        {{ editingMemo ? 'Save' : 'Edit' }}
                    </button>
                </div>
            </div>

            <hr>

            <!-- notes -->
            <div class="form-group">
                <div v-if="notesLoading" class="text-center">
                    <span v-if="noteError" class="text-danger fa-solid fa-fw fa-circle-exclamation"></span> {{ noteError ? noteError : 'Loading latest note exchange...' }}
                </div>

                <div v-else>
                    <div class="text-center">
                        <span :class="{ 'text-info': noteCount }">
                            {{ noteCount !== null ? noteCount : '0' }}</span> notes exhanged.
                    </div>
                    <div v-if="latestNote">
                        Latest note was sent by {{ latestNote.source_name === character ? 'them' : 'you' }}:
                        <h5 class="d-flex" style="user-select: text;">
                            <span :class="latestNote.read ? 'fa-envelope-open text-muted' : 'fa-envelope text-info'" class="fa-solid fa-fw"></span>
                            <span class="mr-auto"> {{ latestNote.title }}</span>
                            <i class="ml-auto">{{ latestNote.datetime_sent }}</i>
                        </h5>

                        <div class="text-truncate abbreviated" style="user-select: text;">
                            {{ latestNote.message }}
                        </div>

                        <div v-if="noteError" class="text-center">
                            <span class="text-danger fa-solid fa-fw fa-circle-exclamation"></span> {{ noteError }}
                        </div>
                    </div>
                </div>
            </div>

            <hr>

            <pre>
                This is where communications goes. :)
                - Last spoken to (last message?)
            </pre>

            <slot name="after-body"></slot>
        </div>
    </template>

    <template v-slot:postscroll>
        <div class="d-flex flex-wrap-reverse justify-content-between align-items-end small border-top">
        </div>
    </template>
</page>
</template>


<script lang="ts">
import Vue from 'vue';
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';

import HomePageLayout from './HomePageLayout.vue';

import { MemoManager } from '../character/memo';
import * as SiteUtils from '../../site/utils';
import core from '../core';
import { EventBus, SiteSessionEvent } from '../preview/event-bus';

// import type { CharacterMemo } from '../../site/character_page/interfaces';
import type { TempNoteFormat } from '../../site/notes-api';

import NewLogger from '../../helpers/log';
const logMemo = NewLogger('memo');

@Component({
    components: {
        page: HomePageLayout,
    },
})
export default class Comms extends Vue {
    @Prop({ required: true })
    readonly character!: string;

    @Hook('mounted')
    onMount() {
        EventBus.$on('site-session', this.onSiteSession);
    }

    onSiteSession({ state }: SiteSessionEvent) {
        if (state === 'active') {
            this.refreshNoteCount();

            EventBus.$off('site-session', this.onSiteSession);
        }
    }

    @Hook('destroyed')
    onDestroy() {
        EventBus.$off('site-session', this.onSiteSession);
    }

    @Watch('character', { immediate: true })
    characterChanged() {
        void this.getMemoFromCache();
        void this.refreshNoteCount();
    }

    /**
     * Memo
     */
    editingMemo = false;
    memoLoading = false;
    memoBody: string | null = '';
    memoInEdit: string | null = '';
    memoError = '';

    async getMemoFromCache() {
        this.memoLoading = true;
        this.editingMemo = false;
        this.memoError = '';

        try {
            const c = await core.cache.profileCache.get(this.character);

            this.memoBody = c?.character.memo?.memo ?? null;
        }
        catch {
            this.memoError = 'Failed to fetch memo.';
        }
        finally {
            this.memoLoading = false;
        }
    }

    async memoButtonClicked() {
        if (!this.editingMemo) {
            this.memoInEdit = this.memoBody;

            this.editingMemo = !this.editingMemo;
        }
        else {
            this.memoLoading = true;
            this.memoBody = this.memoInEdit;

            try {
                await new MemoManager(this.character).set(this.memoInEdit);

                // Only return once we're sure it's saved.
                this.editingMemo = !this.editingMemo;
            }
            catch (e) {
                SiteUtils.ajaxError(e, 'Unable to save memo');
                this.memoError = '⚠ Unable to save memo.';
            }
            finally {
                this.memoLoading = false;
            }
        }
    }

    async cancelOrRefreshMemo(isCancel: boolean = false) {
        if (isCancel) {
            this.editingMemo = false;
            this.memoInEdit = '';
        }
        else {
            await this.refreshMemo();
        }
    }

    async refreshMemo() {
        this.memoLoading = true;
        this.editingMemo = false;
        this.memoError = '';

        try {
            this.memoBody = (await new MemoManager(this.character).get()).memo;

            logMemo.debug('Comms.refreshMemo.memoBody', { body: this.memoBody });
        }
        catch {
            this.memoError = 'Failed to fetch memo.';
            this.memoBody = null;
        }
        finally {
            this.memoLoading = false;
        }
    }

    /**
     * Notes
     */
    notesLoading = true;
    noteCount: number | null = null;
    latestNote?: TempNoteFormat;
    noteError = '';

    async refreshNoteCount() {
        if (!core.siteSession.isRunning) {
            this.noteError = 'The background service has not yet started.';
            return;
        }

        this.notesLoading = true;
        this.noteError = '';

        try {
            const res = await this.getLatestIncoming();

            this.noteCount = res.total;
            this.latestNote = res.latest;
        }
        catch {
            this.noteCount = 0;
            this.latestNote = undefined;
            this.noteError = 'There was an error on the last attempt to fetch notes.';
        }
        finally {
            this.notesLoading = false;
        }
    }

    // async getLatest(): Promise<{ total: number | null, latest?: TempNoteFormat }> {
    //     if (core.siteSession.isRunning)
    //         return await core.siteSession.interfaces.notes.getCount(this.character, true);
    //     else
    //         return { total: 0 };
    // }

    async getLatestIncoming(): Promise<{ total: number | null, latest?: TempNoteFormat }> {
        if (core.siteSession.isRunning)
            return await core.siteSession.interfaces.notes.getLatestIncoming(core.characters.ownCharacter.name, this.character);
        else
            return { total: 0 };
    }



    /**
     * Inter-page Nagivation
     */

    @Prop({ default: false })
    readonly navigationRequest!: { tab: string, conversation?: any, section: any };

    @Watch('navigationRequest')
    onNavigationRequest() {
        if (!this.navigationRequest)
            return;

        // Do work here.
    }
}
</script>

<style>
.page-header {
    height: 3em;
}

.preformatted-shrink-wrap {
    color:inherit; /* Claaaaassic bootstrap! HaHaHa! */

    display:inline-block;

    white-space: pre-wrap;
    user-select:text;
}

#comms-memo-edit {
    field-sizing: content;
    resize: none;
}

.abbreviated {
    overflow: hidden;
    line-clamp: 1;
}
</style>
