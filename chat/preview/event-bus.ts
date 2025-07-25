import { Character, CharacterMemo } from '../../site/character_page/interfaces';
import { Message } from '../common';
import { Settings } from '../interfaces';
import { Conversation } from '../interfaces';
import ChannelConversation = Conversation.ChannelConversation;
import { NoteCheckerCount } from '../../site/note-checker';
import { CharacterCacheRecord } from '../../learn/profile-cache';

import Logger from 'electron-log/renderer';
const log = Logger.scope('event-bus');

/**
 * Prior undocumented emissions:
 * 'conversation-load-more': { conversation: conversation}
 * 'configuration-update' Settings
 * 'core-connected': Settings
 * 'word-definition': { lookupWord, x: props.x, y: props.y }
 */

/**
 * 'imagepreview-dismiss': {url: string}
 * 'imagepreview-show': {url: string}
 * 'imagepreview-toggle-sticky': {url: string}
 *
 * 'own-profile-update': {characterProfile: CharacterProfile (site/character_page/interfaces)}
 * 'character-data': {character: Character}
 * 'character-score': {character: Character, score: number, isFiltered: boolean}
 *
 * 'private-message': {message: Message}
 * 'channel-ad': {message: Message, channel: Conversation, profile: ComplexCharacter | undefined}
 * 'channel-message': {message: Message, channel: Conversation}
 *
 * 'select-conversation': { conversation: Conversation }
 *
 * 'note-counts-update': {},
 *
 * 'character-memo': { character: string, memo: CharacterMemo }
 *
 * 'error': { source: string, type?: string, message: string }
 */

export interface EmptyEvent {}

export interface EventBusEvent { [key: string]: any }

/**
 * This was previously used in the ImagePreview but prevents typescript from
 * type checking, so let the default event types prevail.
 */
// export interface LogDetailsEvent { [key: string]: any }

export interface ImagePreviewEvent {
    url: string;
    force?: boolean;
}

// Tried a Multiselect (to adapt url based on hide) but no bueno.
export type ImageToggleEvent =
    | { url?: string, force:  true  }
    | { url:  string, force?: false };

export interface WordDefinitionEvent {
     lookupWord: string;
     x: number;
     y: number;
}

export interface ChannelAdEvent extends ChannelMessageEvent {
    profile?: CharacterCacheRecord | undefined;
}

export interface ChannelMessageEvent {
    message: Message;
    channel: ChannelConversation;
}

export interface PrivateMessageEvent {
    message: Message;
}

export interface CharacterScoreEvent extends CharacterDataEvent {
    score: number;
    isFiltered: boolean;
}

export interface CharacterDataEvent {
    profile: Character;
}

export interface SelectConversationEvent {
    conversation: Conversation | null;
}

export interface NoteCountsEvent extends NoteCheckerCount {}

export interface MemoEvent {
    character: string;
    memo: CharacterMemo;
}

export interface ErrorEvent {
    source:  string,
    type?:   string,
    message: string,
}

export type EventCallback = (data: any) => void | Promise<void>;

class EventBusManager {
    private callbacks: Record<string, EventCallback[]> = {};

    $on(event: 'core-connected', callback: (e: Settings) => void | Promise<void>): void;
    $on(event: 'configuration-update', callback: (e: Settings) => void | Promise<void>): void;
    $on(event: 'error', callback: (e: ErrorEvent) => void | Promise<void>): void;

    $on(event: 'word-definition', callback: (e: WordDefinitionEvent) => void | Promise<void>): void;

    $on(event: 'own-profile-update', callback: (e: CharacterDataEvent) => void | Promise<void>): void;
    $on(event: 'note-counts-update', callback: () => void | Promise<void>): void;
    $on(event: 'character-data', callback: (e: CharacterDataEvent) => void | Promise<void>): void;
    $on(event: 'character-score', callback: (e: CharacterScoreEvent) => void | Promise<void>): void;
    $on(event: 'character-memo', callback: (e: MemoEvent) => void | Promise<void>): void;

    $on(event: 'channel-message', callback: (e: ChannelMessageEvent) => void | Promise<void>): void;
    $on(event: 'channel-ad', callback: (e: ChannelAdEvent) => void | Promise<void>): void;
    $on(event: 'private-message', callback: (e: PrivateMessageEvent) => void | Promise<void>): void;
    $on(event: 'select-conversation', callback: (e: SelectConversationEvent) => void | Promise<void>): void;
    $on(event: 'conversation-load-more', callback: (e: SelectConversationEvent) => void | Promise<void>): void;

    $on(event: 'imagepreview-show' | 'imagepreview-dismiss', callback: (e: ImagePreviewEvent) => void | Promise<void>): void;
    $on(event: 'imagepreview-toggle-sticky', callback: (e: ImageToggleEvent) => void | Promise<void>): void;
    //$on(event: string, callback: EventCallback): void;
    $on(event: string, callback: EventCallback): void {
        this.$off(event, callback);

        if (!(event in this.callbacks)) this.callbacks[event] = [];

        this.callbacks[event].push(callback);

        // log.debug('eventbus.on', {
        //     event: event,
        //     events: this.callbacks[event].length,
        //     // cb: callback.toString(),
        //     cb: callback.name,
        // });
    }


    $off(event: string, callback: EventCallback): void {
        const r = this.callbacks[event];
        if (r === undefined) return;

        const i = r.indexOf(callback);
        if (i < 0) {
            // log.debug('eventbus.off', {
            //     event: event,
            //     success: i > -1,
            //     remaining: r.length,
            //     // cb: callback.toString(),
            //     cb: callback.name,
            // });

            return;
        }

        r.splice(i, 1);

        // log.debug('eventbus.off', {
        //     event: event,
        //     success: i > -1,
        //     remaining: r.length,
        //     // cb: callback.toString(),
        //     cb: callback.name,
        // });
    }

    // The fancy notes api has a way to lock these and `$on` signatures
    // together, so come back and do that once it's implemented.
    $once(event: string, callback: EventCallback): void {
        if (!(event in this.callbacks)) this.callbacks[event] = [];

        // const once: EventCallback = (data: any) => {
        //     callback(data); this.$off(event, once);
        // };

        // this.callbacks[event].push(once);

        const onceWrapper: EventCallback = (data: any) => {
            log.debug('eventbus.once.resolving');

            Promise.resolve(callback(data))
                .then(() => {
                    this.$off(event, onceWrapper);
                    log.debug('eventbus.once.resolved');
                });
        };

        // @ts-expect-error No overload for generic string; there's a fancy way to implement $on/$once argument syncing that we can do later to fix this.
        this.$on(event, onceWrapper);

        log.debug('eventbus.once', {
            event: event,
            events: this.callbacks[event].length,
        });
    }


    $emit(event: 'core-connected', data: Settings): void;
    $emit(event: 'configuration-update', data: Settings): void;
    $emit(event: 'error', data: ErrorEvent): void;

    $emit(event: 'word-definition', data: WordDefinitionEvent): void;

    $emit(event: 'own-profile-update', data: CharacterDataEvent): void;
    $emit(event: 'note-counts-update', data: NoteCountsEvent): void;
    $emit(event: 'character-data', data: CharacterDataEvent): void;
    $emit(event: 'character-score', data: CharacterScoreEvent): void;
    $emit(event: 'character-memo', data: MemoEvent): void;

    $emit(event: 'channel-message', data: ChannelMessageEvent): void;
    $emit(event: 'channel-ad', data: ChannelAdEvent): void;
    $emit(event: 'private-message', data: PrivateMessageEvent): void;
    $emit(event: 'select-conversation', data: SelectConversationEvent): void;
    $emit(event: 'conversation-load-more', data: SelectConversationEvent): void;

    $emit(event: 'imagepreview-show' | 'imagepreview-dismiss', data: ImagePreviewEvent): void;
    $emit(event: 'imagepreview-toggle-sticky', data: ImageToggleEvent): void;
    $emit(event: 'character-score', data: CharacterScoreEvent): void;
    $emit(event: string, data?: EventBusEvent): void {
        (this.callbacks[event] || []).forEach(cb => cb(data));
    }


    /**
     * This is used in one place in Chat.vue for connection closing.
     */
    clear(): void {
        this.callbacks = {};
    }
}

export const EventBus = new EventBusManager();
log.verbose('init.eventbus');
