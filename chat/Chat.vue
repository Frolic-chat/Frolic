<template>
  <div style="display:flex; flex-direction: column; height:100%; justify-content: center">
    <div v-if="!connected" class="card bg-light" style="width:400px;max-width:100%;margin:0 auto">
      <div v-show="error" class="alert alert-danger">
        {{ error }}
      </div>
      <h3 class="card-header" style="margin-top:0;display:flex">
        {{ l('title') }}
        <a href="#" class="btn" style="flex:1;text-align:right" @click.prevent="showLogs()">
          <span class="fa fa-file-alt"></span>
          <span class="btn-text">{{ l('logs.title') }}</span>
        </a>
      </h3>
      <div class="card-body">
        <h4 class="card-title">
          {{ l('login.selectCharacter') }}
        </h4>
        <select v-model="selectedCharacter" class="form-control custom-select">
          <option v-for="character in ownCharacters" :value="character">
            {{ character.name }}
          </option>
        </select>
        <div style="text-align:right;margin-top:10px">
          <button class="btn btn-primary" :disabled="connecting" @click="connect">
            {{ l(connecting ? 'login.connecting' : 'login.connect') }}
          </button>
        </div>
      </div>
    </div>
    <chat v-else ref="chatview" />
    <modal
      ref="reconnecting" :action="l('chat.disconnected.title')" :button-text="l('action.cancel')" :show-cancel="false"
      button-class="btn-danger" @submit="cancelReconnect"
    >
      <div v-show="error" class="alert alert-danger">
        {{ error }}
      </div>
      {{ l('chat.disconnected') }}
    </modal>
    <logs v-if="!connected" ref="logsDialog" />
    <div v-if="version && !connected" style="position:absolute;bottom:0;right:0">
      {{ version }}
    </div>
  </div>
</template>

<script lang="ts">
import NewLogger from '../helpers/log';
const log = NewLogger('chat');

import {Component, Hook, Prop} from '@frolic/vue-ts';
import Vue from 'vue';
import Modal from '../components/Modal.vue';
import {InlineDisplayMode, SimpleCharacter} from '../interfaces';
import {Keys} from '../keys';
import ChatView from './ChatView.vue';
import {errorToString, getKey} from './common';
import core from './core';
import l from './localize';

import Logs from './Logs.vue';

import * as ProfileApi from './profile_api';
import { AdManager } from './ads/ad-manager';
import EventBus from './preview/event-bus';

type BBCodeNode = Node & {bbcodeTag?: string, bbcodeParam?: string};

function copyNode(str: string, node: BBCodeNode, end: Node, range: Range, flags: {endFound?: true}): string {
    if (node === end) flags.endFound = true;
    if (node.bbcodeTag !== undefined)
        str = `[${node.bbcodeTag}${node.bbcodeParam !== undefined ? `=${node.bbcodeParam}` : ''}]${str}[/${node.bbcodeTag}]`;
    if (node.nextSibling !== null && !flags.endFound) {
        if (node instanceof HTMLElement && getComputedStyle(node).display === 'block') str += '\r\n';
        str += scanNode(node.nextSibling, end, range, flags);
    }

    if (!node.parentElement || !node.parentNode)
        return str;
    else
        return copyNode(str, node.parentNode, end, range, flags);
}

function scanNode(node: BBCodeNode, end: Node, range: Range, flags: {endFound?: true}, hide?: boolean): string {
    let str = '';
    hide = hide || node instanceof HTMLElement && node.classList.contains('bbcode-pseudo');

    // const component = (node as BBCodeNode & { __vue__?: unknown })?.__vue__;

    // if ((component?.$el?.bbcodeTag) || (component?.$el?.bbcodeParam)) {
    //     // nothing?
    // }

    if (node === end) flags.endFound = true;
    if (node.bbcodeTag !== undefined) str += `[${node.bbcodeTag}${node.bbcodeParam !== undefined ? `=${node.bbcodeParam}` : ''}]`;
    // if(component?.$el?.bbcodeTag !== undefined) str += `[${component?.$el?.bbcodeTag}${component?.$el?.bbcodeParam !== undefined ? `=${component?.$el?.bbcodeParam}` : ''}]`;
    if (node instanceof Text && node.nodeValue) {
        str += node === range.endContainer
            ? node.nodeValue.substring(0, range.endOffset)
            : node.nodeValue;
    }
    else if (node instanceof HTMLImageElement) str += node.alt;
    // else if ((node as any)?.__vue__ && (node as any)?.__vue__ instanceof UrlTagView) {
    //   console.log('URLTAGVIEWNODE', node);
    // }
    if (node.firstChild !== null && !flags.endFound) str += scanNode(node.firstChild, end, range, flags, hide);
    if (node.bbcodeTag !== undefined) str += `[/${node.bbcodeTag}]`;
    // if(component?.$el?.bbcodeTag !== undefined) str += `[/${component?.$el?.bbcodeTag}]`;
    if (node instanceof HTMLElement && window.getComputedStyle(node).display === 'block' && !flags.endFound) str += '\r\n';
    if (node.nextSibling !== null && !flags.endFound) str += scanNode(node.nextSibling, end, range, flags, hide);
    return hide ? '' : str;
}

@Component({
    components: {chat: ChatView, modal: Modal, logs: Logs},
})
export default class Chat extends Vue {
    @Prop({required: true})
    readonly ownCharacters!: SimpleCharacter[];

    @Prop({required: true})
    readonly defaultCharacter!: number;

    selectedCharacter = this.ownCharacters.find(x => x.id === this.defaultCharacter) || this.ownCharacters[0];

    @Prop
    readonly version?: string;

    error = '';
    connecting = false;
    connected = false;
    l = l;
    copyPlain = false;

    @Hook('mounted')
    mounted(): void {
        document.title = l('title', core.connection.character);
        document.addEventListener('copy', ((e: ClipboardEvent) => {
            if (this.copyPlain) {
                this.copyPlain = false;
                return;
            }
            const selection = document.getSelection();
            if (selection === null || selection.isCollapsed) return;
            const range = selection.getRangeAt(0);
            let start: Node | undefined = range.startContainer, end: Node | undefined = range.endContainer;
            let start_value = '';
            if (start instanceof HTMLElement) {
                start = start.childNodes[range.startOffset];
                if (start === undefined) start = range.startContainer;
                else start_value = start instanceof HTMLImageElement ? start.alt : scanNode(start.firstChild!, end, range, {});
            }
            else if (start.nodeValue) {
                const end = start === range.endContainer
                    ? range.endOffset
                    : undefined;

                start_value = start.nodeValue.substring(range.startOffset, end);
            }
            if (end instanceof HTMLElement && range.endOffset > 0) end = end.childNodes[range.endOffset - 1];
            if (end && e.clipboardData)
                e.clipboardData.setData('text/plain', copyNode(start_value, start, end, range, {}));

            e.preventDefault();
        }) as EventListener);
        window.addEventListener('keydown', (e) => {
            if (getKey(e) === Keys.KeyC && e.shiftKey && (e.ctrlKey || e.metaKey) && !e.altKey) {
                this.copyPlain = true;
                document.execCommand('copy');
                e.preventDefault();
            }
        });
        core.connection.onEvent('closed', (isReconnect) => {
            log.debug('connection.closed', {
                character: core.characters.ownCharacter.name,
                error:     this.error,
                isReconnect,
            });

            if (isReconnect) (<Modal> this.$refs['reconnecting']).show(true);
            if (this.connected) core.notifications.playSound('logout');
            this.connected = false;
            this.connecting = false;

            AdManager.onConnectionClosed();
            core.adCoordinator.clear();
            EventBus.clear();

            void core.siteSession.onConnectionClosed();
            void core.cache.stop();

            document.title = l('title');
        });
        core.connection.onEvent('connecting', () => {
            this.connecting = true;

            log.debug('connection.connecting', {
                character: core.characters.ownCharacter?.name,
            });

            ProfileApi.init(
                {
                    defaultCharacter:  this.defaultCharacter,
                    animateEicons:     core.state.settings.animatedEicons,
                    fuzzyDates:        true,
                    inlineDisplayMode: InlineDisplayMode.DISPLAY_ALL,
                },
                this.ownCharacters
            );
        });
        core.connection.onEvent('connected', () => {
            log.debug('connection.connected', {
                character: core.characters.ownCharacter?.name,
            });

            (<Modal> this.$refs['reconnecting']).hide();
            this.error = '';
            this.connecting = false;
            this.connected = true;

            core.notifications.playSound('login');
            document.title = l('title.connected', core.connection.character);

            void core.siteSession.onConnectionEstablished();

            // Compatible with the core starting earlier in Index.vue virtue of calling `stop` inside. (And that `stop` call actually working.)
            core.cache.start()
                .then(success => {
                    if (!success) {
                        const log_out = window.confirm("Profile cache failed to open. You will experience odd behavior.\n\nThis is usually caused by running multiple instances of Frolic.\nIt's recommended you exit the app completely, ensure all copies of Frolic have been closed, and relaunch the app.\n\nLog out now?");

                        if (log_out)
                            core.connection.close();
                    }
                })
                .catch(reason => {
                    let message = '';

                    if (reason) {
                        if (typeof reason === 'string')
                            message = reason.substring(0, 255);
                        else if (typeof reason === 'object' && 'message' in reason && typeof reason.message === 'string')
                            message = reason.message.substring(0, 255);
                    }

                    const log_out = window.confirm(`ERROR opening profile cache. You will experience odd behavior.\nThis may be caused by running multiple instances of Frolic.\nIt's recommended you exit the app completely, ensure all copies of Frolic have been closed, and relaunch the app.\nError: ${message}\n\nLog out now?`);

                    if (log_out)
                        core.connection.close();
                });
        });
        core.watch(
            () => core.conversations.hasNew,
            hasNew => {
                // Does this work?
                document.title = (hasNew ? '💬 ' : '') + l(core.connection.isOpen ? 'title.connected' : 'title', core.connection.character);
            }
        );
        core.connection.onError(e => {
            log.debug('connection.error', {
                error:     errorToString(e),
                character: core.characters.ownCharacter.name,
            });

            if ((<Error & {request?: object}>e).request !== undefined) {//catch axios network errors
                this.error = l('login.connectError', errorToString(e));
                this.connecting = false;
            }
            else {
                throw e;
            }
        });
    }

    cancelReconnect(): void {
        core.connection.close();
        (this.$refs['reconnecting'] as Modal).hide();
    }

    showLogs(): void {
        (this.$refs['logsDialog'] as Logs).show();
    }

    connect(): void {
        this.connecting = true;

        void core.notifications.initSounds([
            'attention',
            'login',
            'logout',
            'modalert',
            'newnote',
            'silence',
        ]);

        EventBus.$on('core-connected', s => core.notifications.applyGlobalAudioVolume(s.notifyVolume));
        // Updating on config change is done inside SettingsView.

        if (this.selectedCharacter)
            core.connection.connect(this.selectedCharacter.name);
    }

    getChatView(): ChatView | undefined {
        //return this.$refs['chatview'] as InstanceType<typeof ChatView> | undefined;
        return this.$refs['chatview'] as ChatView | undefined;
    }
}
</script>

<style lang="scss">
    .modal-footer {
        min-height: initial;
    }
</style>
