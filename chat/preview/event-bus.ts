import { Character } from '../../site/character_page/interfaces';
import { Message } from '../common';
import { Conversation } from '../interfaces';
import ChannelConversation = Conversation.ChannelConversation;

import { NoteCheckerCount } from '../../site/note-checker';
import { Character as CharacterProfile } from '../../site/character_page/interfaces';

import log from 'electron-log';

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
    profile: CharacterProfile;
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
    private eventCallbacks: Record<string, EventCallback[]> = {};

    $on(eventName: string, callback: EventCallback): void {
        this.$off(eventName, callback);

        if (!(eventName in this.eventCallbacks)) {
            this.eventCallbacks[eventName] = [];
        }

        this.eventCallbacks[eventName].push(callback);
    }


    $off(eventName: string, callback: EventCallback): void {
        if (!(eventName in this.eventCallbacks)) {
            return;
        }

        this.eventCallbacks[eventName] = _.filter(
          this.eventCallbacks[eventName],
          (cb) => (cb !== callback)
        );
    }


    $emit(eventName: string, eventData: EventBusEvent): void {
        // const d = Date.now();

        (this.callbacks[event] || []).forEach((cb) => cb(data));

        // log.silly('event.bus.emit', { eventName, eventData, time: (Date.now() - d) / 1000 });
    }


    clear(): void {
        this.eventCallbacks = {};
    }
}

export const EventBus = new EventBusManager();
log.verbose('init.eventbus');
// export const EventBus = new Vue();
