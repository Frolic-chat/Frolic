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

            <!-- status -->
            <div class="form-group" v-if="char && char.statusText.trim()">
                <h5>Status</h5>
                <bbcode :text="char.statusText" class="form-control" style="user-select: text; height: auto;"></bbcode>
            </div>

            <!-- memo -->
            <div class="form-group">
                <h5>Memo</h5>
                <span v-if="memoLoading" class="text-center">
                    Loading memo...
                </span>

                <textarea v-else-if="editingMemo" v-model="memoInEdit" id="comms-memo-edit" maxlength="1000" class="form-control"></textarea>

                <div v-else class="form-control" style="user-select: text; height: auto; white-space: pre-wrap;">{{ memoBody || 'No memo set for this character.' }}</div>

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
            <!--
            <div class="form-group">
                <h5>Notes</h5>

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
                            <span :class="latestNote.read ? 'fa-envelope-open text-muted' : 'fa-envelope text-info'" class="fa-solid fa-fw">
                            </span> <span class="mr-auto">{{ latestNote.title }}</span>

                            <i class="ml-auto">{{ latestNote.datetime_sent }}</i>
                        </h5>

                        <bbcode :text="latestNote.message" class="text-truncate abbreviated" style="user-select: text;"></bbcode>

                        <div v-if="noteError" class="text-center">
                            <span class="text-danger fa-solid fa-fw fa-circle-exclamation"></span> {{ noteError }}
                        </div>

                        <hr>
                    </div>
                </div>
            </div>

            <hr>
            -->

            <!-- channel view-->
            <div class="form-group">
                <h5>Channels in Common</h5>

                <div class="d-flex flex-row flex-shrink-0 flex-wrap" style="gap: 1em;">
                    <template v-for="channel in sharedChannelDisplay">
                        <a href="#" @click.prevent="jumpToChannel(channel)">#{{channel.name}}</a>
                    </template>
                    <div v-if="!sharedChannelDisplay.length">None.</div>
                </div>
            </div>

            <hr>

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
import { Component, Prop, Hook, Watch } from '@frolic/vue-ts';

import HomePageLayout from './HomePageLayout.vue';

import { MemoManager } from '../character/memo';
import * as SiteUtils from '../../site/utils';
import core from '../core';
import EventBus from '../preview/event-bus';
import type { SiteSessionEvent } from '../preview/event-bus';
import { BBCodeView } from '../../bbcode/view';
import { Conversation, Character } from '../interfaces';
import ChannelView from '../ChannelTagView.vue';
import type { TempNoteFormat } from '../../site/note-types';

import NewLogger from '../../helpers/log';
const logMemo = NewLogger('memo');

@Component({
    components: {
        page: HomePageLayout,
        bbcode: BBCodeView(core.bbCodeParser),
        'channel-tag': ChannelView,
    },
})
export default class Comms extends Vue {
    @Prop()
    readonly character!: string;
    char?: Character;

    @Watch('character', { immediate: true })
    onCharacterChanged() {
        if (!Conversation.isPrivate(this.conversation)) {
            this.char = undefined;
        }
        else {
            this.char = core.characters.get(this.character);

            void this.getMemoFromCache(this.character);
            // void this.refreshNotes(this.character);
            this.updateSharedChannelDisplay();
        }
    }

    get conversation() {
        return core.conversations.selectedConversation;
    }

    @Hook('created')
    created() {
        // EventBus.$on('notes-api', this.onNoteApi);

        if (!core.siteSession.isRunning)
            EventBus.$on('site-session', this.onSiteSession);
    }

    @Hook('beforeDestroy')
    beforeDestroy() {
        EventBus.$off('site-session', this.onSiteSession);
        // EventBus.$off('notes-api',    this.onNoteApi);
    }

    /**
     * Invoked from external sources.
     */
    onShow() {
        this.updateSharedChannelDisplay();
    }

    onSiteSession({ state }: SiteSessionEvent) {
        if (state === 'active') {
            EventBus.$off('site-session', this.onSiteSession);

            // this.refreshNotes(this.character);
        }
    }

    onNoteApi = () => this.refreshNotes(this.character);


    /**
     * Memo
     */

    editingMemo = false;
    memoLoading = false;
    memoBody: string | null = '';
    memoInEdit: string | null = '';
    memoError = '';

    async getMemoFromCache(name: string) {
        const name_key = name.toLowerCase();

        this.memoLoading = true;
        this.memoBody = '';
        this.editingMemo = false;
        this.memoError = '';

        try {
            const c = await core.cache.profileCache.get(name_key);

            if (name_key === this.character.toLowerCase()) {
                this.memoBody = c?.character.memo?.memo ?? null;

                // If we changed characters, we don't need to turn off memoLoading, because that change also triggered a memoLoading = true call and will turn it off when it's finished (or errors)
                this.memoLoading = false;
            }
        }
        catch {
            this.memoError = 'Failed to fetch memo.';

            if (name_key === this.character.toLowerCase())
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

    //registerMemoTabKey

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
        // if (!this.character)
        //     return;

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

    async refreshNotes(name: string) {
        if (!core.siteSession.isRunning) {
            this.noteError = 'The background service has not yet started.';
            return;
        }

        const name_key = name.toLowerCase();
        const conversation = core.conversations.byKey(name_key);

        if (!conversation || !Conversation.isPrivate(conversation))
            return;

        this.noteCount = 0;
        this.latestNote = undefined;
        this.notesLoading = true;
        this.noteError = '';

        try {
            if (!conversation.notes.initialized) {
                // Still need a good way to differentiate between Server Name, string, and NameKey.
                // You'd think this would be user id... :)
                // So, how do you get the canonical user id of a deleted character?
                const server_notes = await core.siteSession.interfaces.notes.getAllBetween(core.characters.ownCharacter.name, name);

                conversation.notes.init(server_notes.notes);
            }

            if (this.conversation === conversation) {
                this.noteCount = conversation.notes.count;
                this.latestNote = conversation.notes.latest;

                // If this convo is NOT the convo we're working with, then we've queried another convo since this one, and notesLoading should be controlled by that thread, not this one; so only unset this from whichever thread returns success.
                this.notesLoading = false;
            }
        }
        catch {
            this.noteError = 'There was an error on the last attempt to fetch notes. Your information may be out of date.';

            if (this.conversation === conversation)
                this.notesLoading = false;
        }
    }



    /**
     * Shared channel display
     */

    sharedChannelDisplay: Conversation.ChannelConversation[] = [];

    updateSharedChannelDisplay() {
        this.sharedChannelDisplay = core.conversations.channelConversations.reduce(
            (box, channel) => {
                const match = channel.channel.members[this.character];
                if (match)
                    box.push(channel);

                return box;
            },
            []  as Conversation.ChannelConversation[],
        );
    }

    jumpToChannel(channel: Conversation.ChannelConversation): void {
        channel.show();
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
