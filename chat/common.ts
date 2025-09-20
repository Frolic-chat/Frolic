// SPDX-License-Identifier: AGPL-3.0-or-later
import {isToday} from 'date-fns';
import {Keys} from '../keys';
import {Character, Conversation, Settings as ISettings} from './interfaces';
import core from './core';

const encode = new TextEncoder().encode;
export function getByteLength(s: string ): number {
    return encode(s).length;
}

/**
 * Remove: \ / : * ? " < > | from the string to make it compatible with NTFS.
 * @param fn A file name.
 */
export function sanitizeFilenameForWindows(fn: string): string {
    return fn.replaceAll(/[\\/:*?"<>|]/, '_');
}

/**
 * Remove: / to make the filename compatible with linux.
 * NUL byte probably doesn't need to be escaped
 * @param fn A file name.
 */
export function sanitizeFilenameForUnixlike(fn: string): string {
    return fn.replaceAll(/[/\0]/, '_');
}

export function profileLink(this: any | never, character: string): string {
    return `https://www.f-list.net/c/${character}`;
}

export function characterImage(this: any | never, character: string): string {
    const c = core.characters.get(character);

    return c.overrides.avatarUrl || `https://static.f-list.net/images/avatar/${character.toLowerCase()}.png`;
}

export class Settings implements ISettings {
    playSound = true;
    notifyVolume = 100;
    clickOpensMessage = false;
    disallowedTags: string[] = [];
    notifications = true;
    notifyFriendSignIn = Conversation.RelationChooser.NoOne;
    notifyOnFriendMessage = Conversation.RelationChooser.NoOne;
    highlight = true;
    highlightWords: string[] = [];
    highlightUsers = false;
    showBroadcastsInPMs = false;
    showAvatars = true;
    animatedEicons = true;
    idleTimer = 0;
    messageSeparators = false;
    eventMessages = true;
    joinMessages = false;
    alwaysNotify = false;
    logMessages = true; // All messages
    logChannels = true;
    logAds = false;
    expensiveMemberList = false;
    fontSize = 14;
    showNeedsReply = false;
    enterSend = true;
    secondEnterSend = false;
    colorBookmarks = false;
    bbCodeBar = true;

    risingAdScore = true;
    risingLinkPreview = true;
    linkPreviewVolume = 0;
    risingAutoCompareKinks = true;

    risingAutoExpandCustomKinks = true;
    risingCharacterPreview = true;
    risingComparisonInUserMenu = true;
    risingComparisonInSearch = true;
    experimentalOrientationMatching = false;
    relaxPostLengthMatching = false;

    risingShowUnreadOfflineCount = true;
    risingColorblindMode = false;
    risingShowPortraitNearInput = true;
    risingShowPortraitInMessage = true;
    risingShowHighQualityPortraits = true;

    risingFilter = {
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

    risingCharacterTheme = undefined;
}


export class AdSettings implements Conversation.AdSettings {
    ads: string[] = [];
    randomOrder = false;
    lastAdTimestamp = 0;
}


export class ConversationSettings implements Conversation.Settings {
    notify = Conversation.Setting.Default;
    notifyOnFriendMessage = Conversation.RelationChooser.Default;
    highlight = Conversation.Setting.Default;
    highlightWords: string[] = [];
    highlightUsers = false;
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
