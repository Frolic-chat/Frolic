import { Character } from '../../site/character_page/interfaces';
import { Message } from '../common';
import { Conversation } from '../interfaces';
import ChannelConversation = Conversation.ChannelConversation;
import { NoteCheckerCount } from '../../site/note-checker';

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
 * 'imagepreview-toggle-stickyness': {url: string}
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

// tslint:disable: no-any
export interface EventBusEvent { [key: string]: any; }

export interface CharacterProfileEvent extends EventBusEvent {
    profile: Character;
}

export interface ChannelMessageEvent extends EventBusEvent {
    message: Message;
    channel: ChannelConversation;
}

// tslint:disable-next-line no-empty-interface
export interface ChannelAdEvent extends ChannelMessageEvent {}

export interface CharacterDataEvent {
    character: Character;
}

export interface SelectConversationEvent extends EventBusEvent {
    conversation: Conversation | null;
}

// tslint:disable-next-line no-empty-interface
export interface NoteCountsUpdate extends EventBusEvent, NoteCheckerCount {}

export interface ErrorEvent extends EventBusEvent {
    source:  string,
    type?:   string,
    message: string,
}

export type EventCallback = (data: any) => void | Promise<void>;

class EventBusManager {
    private callbacks: Record<string, EventCallback[]> = {};


    $on(event: string, callback: EventCallback): void {
        this.$off(event, callback);

        if (!(event in this.callbacks)) this.callbacks[event] = [];

        this.callbacks[event].push(callback);

        log.debug('eventbus.on', {
            event: event,
            events: this.callbacks[event].length,
            // cb: callback.toString(),
            cb: callback.name,
        });
    }


    $off(event: string, callback: EventCallback): void {
        const r = this.callbacks[event];
        if (r === undefined) return;

        const i = r.indexOf(callback);
        if (i < 0) {
            log.debug('eventbus.off', {
                event: event,
                success: i > -1,
                remaining: r.length,
                // cb: callback.toString(),
                cb: callback.name,
            });

            return;
        }

        r.splice(i, 1);

        log.debug('eventbus.off', {
            event: event,
            success: i > -1,
            remaining: r.length,
            // cb: callback.toString(),
            cb: callback.name,
        });
    }


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

        this.$on(event, onceWrapper);

        log.debug('eventbus.once', {
            event: event,
            events: this.callbacks[event].length,
        });
    }


    $emit(event: string, data: EventBusEvent): void {
        (this.callbacks[event] || []).forEach(cb => cb(data));
    }


    clear(): void {
        this.callbacks = {};
    }
}

export const EventBus = new EventBusManager();
log.verbose('init.eventbus');
