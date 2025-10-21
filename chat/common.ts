// SPDX-License-Identifier: AGPL-3.0-or-later
import {isToday} from 'date-fns';
import {Keys} from '../keys';
import { Character, Conversation, Settings as ISettings, Relation } from './interfaces';
import core from './core';

import { SmartFilterSettings } from '../learn/filter/types';

const e = new TextEncoder()
export function getByteLength(s: string): number {
    return e.encode(s).length;
}

/**
 * Remove: \ / : * ? " < > | from the string to make it compatible with NTFS.
 * @param fn A file name.
 */
export function sanitizeFilenameForWindows(fn: string): string {
    return fn.replaceAll(/[\\/:*?"<>|]/g, '_');
}

/**
 * Remove: / to make the filename compatible with linux.
 * NUL byte probably doesn't need to be escaped
 * @param fn A file name.
 */
export function sanitizeFilenameForUnixlike(fn: string): string {
    return fn.replaceAll(/[/\0]/g, '_');
}

export function profileLink(this: any | never, character: string): string {
    return `https://www.f-list.net/c/${character}`;
}

export function characterImage(this: any | never, character: string): string {
    const c = core.characters.get(character);

    return c.overrides.avatarUrl || `https://static.f-list.net/images/avatar/${character.toLowerCase()}.png`;
}

export class Settings implements ISettings {
    playSound: boolean = true;
    notifyVolume: number = 100;
    clickOpensMessage: boolean = false;
    disallowedTags: string[] = [];
    notifications: boolean = true;
    notifyFriendSignIn: Relation.Chooser = Relation.Chooser.NoOne;
    notifyOnFriendMessage: Relation.Chooser = Relation.Chooser.NoOne;
    highlight: boolean = true;
    highlightWords: string[] = [];
    highlightUsers: boolean = false;
    highlightUsernames: string[] = [];
    showBroadcastsInPMs: boolean = false;
    showAvatars: boolean = true;
    animatedEicons: boolean = true;
    idleTimer: number = 0;
    messageSeparators: boolean = false;
    eventMessages: boolean = true;
    joinMessages: boolean = false;
    alwaysNotify: boolean = false;
    logMessages: boolean = true; // All messages
    logChannels: boolean = true;
    logAds: boolean = false;
    expensiveMemberList: boolean = false;
    fontSize: number = 14;
    showNeedsReply: boolean = false;
    enterSend: boolean = true;
    secondEnterSend: boolean = false;
    colorBookmarks: boolean = false;
    bbCodeBar: boolean = true;

    risingAdScore: boolean = true;
    risingLinkPreview: boolean = true;
    linkPreviewVolume: number = 0;
    risingAutoCompareKinks: boolean = true;

    risingAutoExpandCustomKinks: boolean = true;
    risingCharacterPreview: boolean = true;
    risingComparisonInUserMenu: boolean = true;
    risingComparisonInSearch: boolean = true;

    risingShowUnreadOfflineCount: boolean = true;
    risingColorblindMode: boolean = false;
    risingShowPortraitNearInput: boolean = true;
    risingShowPortraitInMessage: boolean = true;
    risingShowHighQualityPortraits: boolean = true;

    risingFilter: SmartFilterSettings = {
        hideAds: false,
        hideSearchResults: false,
        hideChannelMembers: false,
        hidePublicChannelMessages: false,
        hidePrivateChannelMessages: false,
        hidePrivateMessages: false,
        showFilterIcon: true,
        penalizeMatches: true,
        rewardNonMatches: false,
        autoReply: false,
        minAge: null,
        maxAge: null,
        smartFilters: {
            ageplay: false,
            anthro: false,
            female: false,
            feral: false,
            human: false,
            hyper: false,
            incest: false,
            intersex: false,
            male: false,
            microMacro: false,
            obesity: false,
            pokemon: false,
            pregnancy: false,
            rape: false,
            scat: false,
            std: false,
            taur: false,
            gore: false,
            vore: false,
            unclean: false,
            watersports: false,
            zoophilia: false
        },
        exceptionNames: []
    };

    risingCharacterTheme: string | undefined = undefined;
}


export class AdSettings implements Conversation.AdSettings {
    ads: string[] = [];
    randomOrder = false;
    lastAdTimestamp = 0;
}


export class ConversationSettings implements Conversation.Settings {
    notify = Conversation.Setting.Default;
    notifyOnFriendMessage = Relation.Chooser.Default;
    highlight = Conversation.Setting.Default;
    highlightWords: string[] = [];
    highlightUsernames: string[] = [];
    joinMessages = Conversation.Setting.Default;
    defaultHighlights = true;
    adSettings: Conversation.AdSettings = { ads: [], randomOrder: false, lastAdTimestamp: 0 };
}

function pad(num: number): string | number {
    return num < 10 ? `0${num}` : num;
}

export function formatTime(this: any | never, date: Date, noDate: boolean = false): string {
    if(!noDate && isToday(date)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function messageToString(
    this: any | never,
    msg: Conversation.Message,
    timeFormatter:      (date: Date)  => string = formatTime,
    characterTransform: (str: string) => string = x => x,
    textTransform:      (str: string) => string = x => x
): string {
    const timestamp        = `[${timeFormatter(msg.time)}]`;
    const action_indicator = msg.type === Conversation.Message.Type.Action  ? '*' : '';
    let character_name     = '';
    const name_msg_break   = msg.type === Conversation.Message.Type.Message ? ':' : '';
    let body: string | undefined;

    if (msg.type !== Conversation.Message.Type.Event) {
        character_name = characterTransform(msg.sender.name);
        body           = textTransform(msg.text.trim());
    }
    else { // Events frequently have a character.
        const split = msg.text.match(/\[user\]([^\[]*)\[\/user\](.*)/);
        if (split?.[1]) {
            character_name = characterTransform(split[1]);
            body           = textTransform(split[2].trim());
        }
        else {
            body = textTransform(msg.text.trim());
        }
    }

    return `${timestamp} ${action_indicator + character_name + name_msg_break} ${body}\r\n`;
}

export function getKey(e: KeyboardEvent): Keys {
    // tslint:disable-next-line deprecation
    return e.keyCode;
}

/*tslint:disable:no-any no-unsafe-any*///because errors can be any
export function errorToString(e: any): string {
    return e instanceof Error ? e.message : e !== undefined ? e.toString() : '';
}

//tslint:enable

let messageId = 0;

export class Message implements Conversation.ChatMessage {
    readonly id = ++messageId;
    isHighlight = false;

    score = 0;
    filterMatch = false;

    constructor(readonly type: Conversation.Message.Type, readonly sender: Character, readonly text: string,
                readonly time: Date = new Date()) {
        if(Conversation.Message.Type[type] === undefined) throw new Error('Unknown type'); //tslint:disable-line
    }
}

export class EventMessage implements Conversation.EventMessage {
    readonly id = ++messageId;
    readonly type = Conversation.Message.Type.Event;

    readonly score = 0;
    filterMatch = false;

    constructor(readonly text: string, readonly time: Date = new Date()) {
    }
}

export class BroadcastMessage implements Conversation.BcastMessage {
    readonly id = ++messageId;
    readonly type = Conversation.Message.Type.Bcast;

    readonly score = 0;
    filterMatch = false;

    constructor(readonly text: string, readonly sender: Character, readonly time: Date = new Date()) {}
}
