<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <modal :buttons="false" ref="dialog" @open="onOpen" @close="onClose" style="width:98%" dialogClass="logs-dialog">
        <template slot="title">
            {{l('logs.title')}}
            <div class="logs-fab btn btn-secondary" slot="title" @click="showFilters = !showFilters">
                <span class="fas" :class="'fa-chevron-' + (showFilters ? 'up' : 'down')"></span>
            </div>
        </template>
        <div class="form-group row" style="flex-shrink:0" v-show="showFilters">
            <label for="character" class="col-sm-2 col-form-label">{{l('logs.character')}}</label>
            <div :class="canZip ? 'col-sm-8 col-10 col-xl-9' : 'col-sm-10'">
                <select class="form-control" v-model="selectedCharacter" id="character" @change="loadCharacter">
                    <option value="">{{l('logs.selectCharacter')}}</option>
                    <option v-for="character in characters">{{character}}</option>
                </select>
            </div>
            <div class="col-2 col-xl-1" v-if="canZip">
                <button @click="downloadCharacter" class="btn btn-secondary form-control" :disabled="!selectedCharacter"><span
                    class="fa fa-download"></span></button>
            </div>
        </div>
        <div class="form-group row" style="flex-shrink:0" v-show="showFilters">
            <label class="col-sm-2 col-form-label">
                {{l('logs.conversation')}}
            </label>
            <div :class="canZip ? 'col-sm-8 col-10 col-xl-9' : 'col-sm-10'">
                <filterable-select v-model="selectedConversation" :options="conversations" :filterFunc="filterConversation"
                                   :placeholder="l('general.filter')">
                    <template v-slot="s">
                        {{s.option && ((s.option.key[0] == '#' ? '#' : '') + s.option.name) || l('logs.selectConversation')}}
                    </template>
                </filterable-select>
            </div>
            <div class="col-2 col-xl-1" v-if="canZip">
                <button @click="downloadConversation" class="btn btn-secondary form-control" :disabled="!selectedConversation">
                    <span class="fa fa-download"></span>
                </button>
            </div>
        </div>
        <div class="form-group row" style="flex-shrink:0" v-show="showFilters">
            <label for="date" class="col-sm-2 col-form-label">{{l('logs.date')}}</label>
            <div class="col-sm-8 col-10 col-xl-9">
                <select class="form-control" v-model="selectedDate" id="date" @change="loadMessages">
                    <option :value="undefined">{{l('logs.allDates')}}</option>
                    <option v-for="date in dates" :value="date.getTime()">{{formatDate(date)}}</option>
                </select>
            </div>
            <div class="col-2 col-xl-1">
                <button @click="downloadDay" class="btn btn-secondary form-control" :disabled="!selectedDate">
                    <span class="fa fa-download"></span>
                </button>
            </div>
        </div>
        <div class="messages messages-both" style="overflow:auto;overscroll-behavior:none;" ref="messageviews" tabindex="-1"
             @scroll="onMessagesScroll">
            <message-view v-for="message in displayedMessages" :message="message" :key="message.id" :logs="true"></message-view>
        </div>
        <div class="input-group" style="flex-shrink:0">
            <div class="input-group-prepend">
                <div class="input-group-text"><span class="fas fa-search"></span></div>
            </div>
            <input class="form-control" v-model="filter" :placeholder="l('general.filter')" v-show="messages" type="text"/>
        </div>
    </modal>
</template>

<script lang="ts">
    import {Component, Hook, Prop, Watch} from '@f-list/vue-ts';
    import {format} from 'date-fns';
    import CustomDialog from '../components/custom_dialog';
    import FilterableSelect from '../components/FilterableSelect.vue';
    import Modal from '../components/Modal.vue';
    import {Keys} from '../keys';
    import {formatTime, getKey, messageToString} from './common';
    import core from './core';
    import {Conversation, Logs as LogInterface} from './interfaces';
    import l from './localize';
    import MessageView from './message_view';
    import Zip from './zip';
    import { Dialog } from '../helpers/dialog';

    function formatDate(this: void, date: Date): string {
        return format(date, 'yyyy-MM-dd');
    }

    function getLogs(messages: ReadonlyArray<Conversation.Message>, html: boolean): string {
        const start = html
            ? `<meta charset="utf-8"><style>body { padding: 10px; } .messages sub, .messages sup { line-height: inherit } ${document.getElementById('themeStyle')!.innerText}</style>`
            : '';

        const front = html ? '<div class="messages bbcode">' : '',
              back  = html ? '</div>'                        : '';

        return front + messages.reduce((acc, x) =>
                acc + messageToString(
                    x,
                    date => formatTime(date, true),
                    html
                        ? c => {
                            const gender = core.characters.get(c).gender?.toLowerCase() ?? 'none';
                            return `<span class="user-view gender-${gender}">${c}</span>`;
                        }
                        : undefined,
                    html
                        ? t => core.bbCodeParser.parseEverything(t).innerHTML
                        : undefined
                ),
                start
            ) + back;
    }

    @Component({
        components: {
            modal: Modal,
            'message-view': MessageView,
            'filterable-select': FilterableSelect,
        },
    })
    export default class Logs extends CustomDialog {
        @Prop
        readonly conversation?: Conversation;

        conversations: LogInterface.Conversation[] = [];
        dates: ReadonlyArray<Date> = [];
        selectedConversation: LogInterface.Conversation | undefined;
        selectedCharacter = core.connection.character;
        selectedDate: string | undefined;
        l = l;
        filter = '';
        messages: ReadonlyArray<Conversation.Message> = [];
        formatDate = formatDate;
        keyDownListener?: (e: KeyboardEvent) => void;
        characters: ReadonlyArray<string> = [];
        showFilters = true;
        canZip = core.logs.canZip;
        dateOffset = -1;
        windowStart = 0;
        windowEnd = 0;
        resizeListener?: () => void;

        get displayedMessages(): ReadonlyArray<Conversation.Message> {
            if (this.selectedDate)
                return this.filteredMessages;
            else
                return this.filteredMessages.slice(this.windowStart, this.windowEnd);
        }

        get filteredMessages(): ReadonlyArray<Conversation.Message> {
            if (!this.filter.length)
                return this.messages;

            const filter = new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');
            return this.messages.filter(
                x => filter.test(x.text) || x.type !== Conversation.Message.Type.Event && filter.test(x.sender.name));
        }

        @Hook('mounted')
        async mounted(): Promise<void> {
            this.characters = await core.logs.getAvailableCharacters();
            this.resizeListener = async () => this.onMessagesScroll();
            window.addEventListener('resize', this.resizeListener);
        }

        @Hook('beforeDestroy')
        beforeDestroy(): void {
            window.removeEventListener('resize', this.resizeListener!);
        }

        async loadCharacter(): Promise<void> {
            this.selectedConversation = undefined;
            return this.loadConversations();
        }

        async loadConversations(): Promise<void> {
            if (!this.selectedCharacter)
                return;

            this.conversations = (await core.logs.getConversations(this.selectedCharacter)).slice();
            this.conversations.sort((x, y) => (x.name < y.name ? -1 : (x.name > y.name ? 1 : 0)));
        }

        async loadDates(): Promise<void> {
            this.dates = !this.selectedConversation
                ? []
                : (await core.logs.getLogDates(this.selectedCharacter, this.selectedConversation.key))
                        .slice().reverse();
        }

        filterConversation(filter: RegExp, conversation: LogInterface.Conversation): boolean {
            return filter.test(conversation.name);
        }

        @Watch('selectedConversation')
        async conversationSelected(oldValue: Conversation | undefined, newValue: Conversation | undefined): Promise<void> {
            if (oldValue && newValue && oldValue.key === newValue.key)
                return;

            await this.loadDates();
            this.selectedDate = undefined;
            this.dateOffset = -1;
            this.filter = '';
            await this.loadMessages();
        }

        @Watch('filter')
        onFilterChanged(): void {
            if (!this.selectedDate) {
                this.windowEnd = this.filteredMessages.length;
                this.windowStart = this.windowEnd - 50;
            }

            this.$nextTick(async () => this.onMessagesScroll());
        }

        @Watch('showFilters')
        async onFilterToggle(): Promise<void> {
            return this.onMessagesScroll();
        }

        download(file: string, logs: string): void {
            const a = document.createElement('a');
            a.href = logs;
            a.setAttribute('download', file);
            a.style.display = 'none';
            document.body.appendChild(a);

            setTimeout(() => {
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(logs);
            });
        }

        downloadDay(): void {
            if (!this.selectedConversation || !this.selectedDate || !this.messages.length)
                return;

            const html = Dialog.confirmDialog(l('logs.html'));
            const name = `${this.selectedConversation.name}-${formatDate(new Date(this.selectedDate))}.${html ? 'html' : 'txt'}`;

            this.download(name, `data:${encodeURIComponent(name)},${encodeURIComponent(getLogs(this.messages, html))}`);
        }

        async downloadConversation(): Promise<void> {
            if (!this.selectedConversation)
                return;

            const char = this.selectedCharacter;
            const convKey = this.selectedConversation.key;
            const fileName = this.selectedConversation.name;
            const zip = new Zip();
            const html = Dialog.confirmDialog(l('logs.html'));

            for (const d of this.dates) {
                const messages = await core.logs.getLogs(char, convKey, d);
                zip.addFile(`${formatDate(d)}.${html ? 'html' : 'txt'}`, getLogs(messages, html));
            }

            this.download(`${fileName}.zip`, URL.createObjectURL(zip.build()));
        }

        async downloadCharacter(): Promise<void> {
            if (!this.selectedCharacter || !Dialog.confirmDialog(l('logs.confirmExport', this.selectedCharacter)))
                return;

            const char = this.selectedCharacter;
            const zip = new Zip();
            const html = Dialog.confirmDialog(l('logs.html'));

            for (const c of this.conversations) {
                zip.addFile(`${c.name}/`, '');
                const dates = await core.logs.getLogDates(char, c.key);

                for (const d of dates) {
                    const messages = await core.logs.getLogs(char, c.key, d);
                    zip.addFile(`${c.name}/${formatDate(d)}.${html ? 'html' : 'txt'}`, getLogs(messages, html));
                }
            }

            this.download(`${char}.zip`, URL.createObjectURL(zip.build()));
        }

        async onOpen(): Promise<void> {
            if (this.selectedCharacter) {
                await this.loadConversations();

                if (this.conversation) {
                    this.selectedConversation = this.conversations
                            .filter(x => x.key === this.conversation!.key)[0];
                }
                else {
                    await this.loadDates();
                    await this.loadMessages();
                }
            }

            this.keyDownListener = e => {
                if (getKey(e) === Keys.KeyA
                &&  (e.ctrlKey || e.metaKey)
                &&  !e.altKey && !e.shiftKey) {
                    if ((e.target as HTMLElement).tagName.toLowerCase() === 'input')
                        return;

                    e.preventDefault();

                    const selection = document.getSelection();
                    if (!selection)
                        return;

                    selection.removeAllRanges();
                    if (this.messages.length) {
                        const range = document.createRange();
                        const messages = this.$refs['messageviews'] as Node;

                        range.setStartBefore(messages.firstChild!);
                        range.setEndAfter(messages.lastChild!);
                        selection.addRange(range);
                    }
                }
            };

            window.addEventListener('keydown', this.keyDownListener);
        }

        onClose(): void {
            window.removeEventListener('keydown', this.keyDownListener!);
        }

        async loadMessages(): Promise<void> {
            if (!this.selectedConversation) {
                this.messages = [];
            }
            else if (this.selectedDate) {
                this.dateOffset = -1;
                this.messages = await core.logs.getLogs(this.selectedCharacter, this.selectedConversation.key, new Date(this.selectedDate));
            }
            else if (this.dateOffset === -1) {
                this.messages = [];
                this.dateOffset = 0;
                this.windowStart = 0;
                this.windowEnd = 0;
                this.lastScroll = -1;
                this.lockScroll = false;
                this.$nextTick(async () => this.onMessagesScroll());
            }
            else {
                return this.onMessagesScroll();
            }
        }

        lockScroll = false;
        lastScroll = -1;

        async onMessagesScroll(ev?: Event): Promise<void> {
            if (this.lockScroll)
                return;

            const list = <HTMLElement | undefined>this.$refs['messageviews'];

            if (!list || ev && Math.abs(list.scrollTop - this.lastScroll) < 50)
                return;

            this.lockScroll = true;

            function getTop(index: number): number {
                return (list!.children[index] as HTMLElement).offsetTop;
            }

            while (this.selectedConversation && !this.selectedDate && this.dialog.isShown) {
                const oldHeight = list.scrollHeight, oldTop = list.scrollTop;
                const oldFirst = this.displayedMessages[0];
                const oldEnd = this.windowEnd;
                const length = this.displayedMessages.length;
                const oldTotal = this.filteredMessages.length;

                let loaded = false;
                if (length <= 20 || getTop(20) > list.scrollTop)
                    this.windowStart -= 50;
                else if (length > 100 && getTop(100) < list.scrollTop)
                    this.windowStart += 50;
                else if (length >= 100 && getTop(length - 100) > list.scrollTop + list.offsetHeight)
                    this.windowEnd -= 50;
                else if (getTop(length - 20) < list.scrollTop + list.offsetHeight)
                    this.windowEnd += 50;
                if (this.windowStart <= 0 && this.dateOffset < this.dates.length) {
                    const messages = await core.logs.getLogs(this.selectedCharacter, this.selectedConversation.key,
                        this.dates[this.dateOffset++]);

                    this.messages = messages.concat(this.messages);

                    const addedTotal = this.filteredMessages.length - oldTotal;
                    this.windowStart += addedTotal;
                    this.windowEnd += addedTotal;

                    loaded = true;
                }

                this.windowStart = Math.max(this.windowStart, 0);
                this.windowEnd = Math.min(this.windowEnd, this.filteredMessages.length);

                if (this.displayedMessages[0] !== oldFirst) {
                    list.style.overflow = 'hidden';
                    await this.$nextTick();
                    list.scrollTop = oldTop + list.scrollHeight - oldHeight;
                    list.style.overflow = 'auto';
                }
                else if (this.windowEnd === oldEnd && !loaded) {
                    break;
                }
                else {
                    await this.$nextTick();
                }
            }

            this.lastScroll = list.scrollTop;
            this.lockScroll = false;
        }
    }
</script>

<style>
    .logs-dialog {
        max-width: 98% !important;
        width: 98% !important;
    }

    .logs-dialog .modal-body {
        display: flex;
        flex-direction: column;
    }
</style>
