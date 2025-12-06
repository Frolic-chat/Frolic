//tslint:disable:no-shadowed-variable
import {Connection} from '../fchat';

import {Channel, Character} from '../fchat/interfaces';
import { AdManager } from './ads/ad-manager';
import { SmartFilterSettings } from '../learn/filter/types';
export {Connection, Channel, Character} from '../fchat/interfaces';
/**
 * User statuses are specifically the statuses that users can set for themselves via UIs and alash commands.
 */
export const userStatuses: ReadonlyArray<Character.Status> = ['online', 'looking', 'away', 'busy', 'dnd'];
export const channelModes: ReadonlyArray<Channel.Mode> = ['chat', 'ads', 'both'];
import { Ad } from './ads/ad-center';
import { GeneralSettings } from '../electron/common';
import { LocalizationKey } from './localize';
import type Modal from '../components/Modal.vue';
import type { ActivityEvent, ActivityStatusEvent } from './preview/event-bus';

export namespace Relation {
    export enum Chooser {
        NoOne, Bookmarks, Friends, Both, Default
    }

    export const Label: Record<Chooser, LocalizationKey> = {
        [Chooser.NoOne]     : 'settings.relation.noOne',
        [Chooser.Friends]   : 'settings.relation.friendsOnly',
        [Chooser.Bookmarks] : 'settings.relation.bookmarksOnly',
        [Chooser.Both]      : 'settings.relation.friendsAndBookmarks',
        [Chooser.Default]   : 'settings.relation.default'
    };
}

export namespace Conversation {
    interface BaseMessage {
        readonly id: number
        readonly type: Message.Type
        readonly text: string
        readonly time: Date

        score: number;
        filterMatch: boolean;
    }

    export interface EventMessage extends BaseMessage {
        readonly type: Message.Type.Event
    }

    export interface BcastMessage extends BaseMessage {
        readonly type: Message.Type.Bcast
        readonly sender: Character;
    }

    export interface ChatMessage extends BaseMessage {
        readonly isHighlight: boolean
        readonly sender: Character
    }

    export type Message = BcastMessage | EventMessage | ChatMessage;

    export interface SFCMessage extends EventMessage {
        sfc: Connection.ServerCommands['SFC'] & {confirmed?: true}
    }

    export namespace Message {
        export enum Type {
            Message,
            Action,
            Ad,
            Roll,
            Warn,
            Event,
            Bcast
        }
    }

    export type ActivityContext =
        | { e?: undefined; data?: undefined; time?: Date }
        | { e: 'EBL'; } & ActivityEvent
        | { e: 'EBS'; } & ActivityStatusEvent
        | {
            [K in keyof Connection.ServerCommands]: {
                e: K;
                data: Connection.ServerCommands[K];
                time: Date;
            } & (K extends 'BRO'
                ? { message: Message }
                : {})
        }[keyof Connection.ServerCommands];

    export type RecentChannelConversation = {readonly channel: string, readonly name: string};
    export type RecentPrivateConversation = {readonly character: string};

    export type TypingStatus = 'typing' | 'paused' | 'clear';

    export type TabType = 'conversation' | 'description' | 'settings';

    interface TabConversation extends Conversation {
        isPinned: boolean
        readonly maxMessageLength: number
        close(): Promise<void> | void
        sort(newIndex: number): Promise<void>
    }

    export interface PrivateConversation extends TabConversation {
        readonly character: Character
        readonly typingStatus: TypingStatus

        sendMessageEx(text: string): Promise<void>;
    }

    export interface ChannelConversation extends TabConversation {
        readonly channel: Channel
        mode: Channel.Mode
        readonly nextAd: number
        isSendingAds: boolean

        isSendingAutomatedAds(): boolean
        toggleAutomatedAds(): void
        hasAutomatedAds(): boolean

        sendAd(text: string): Promise<void>
    }

    export interface ConsoleConversation extends Conversation {}

    export interface ActivityConversation extends Conversation {
        // We're opting to include these to overwrite them with readonlies:
        readonly errorText: string;
        readonly infoText:  string;
        messages: Array<Message>;

        parse(activity: ActivityContext): Promise<void>;
    }

    export function isPrivate(conversation: Conversation): conversation is PrivateConversation {
        return (<Partial<PrivateConversation>>conversation).character !== undefined;
    }

    export function isChannel(conversation: Conversation): conversation is ChannelConversation {
        return (<Partial<ChannelConversation>>conversation).channel !== undefined;
    }

    export function isActivity(conversation: Conversation): conversation is ActivityConversation {
        return (<Partial<ActivityConversation>>conversation).key === '_activity';
    }

    export function isConsole(conversation: Conversation): conversation is ConsoleConversation {
        return (<Partial<ConsoleConversation>>conversation).key === '_';
    }

    export interface State {
        readonly privateConversations: ReadonlyArray<PrivateConversation>
        readonly channelConversations: ReadonlyArray<ChannelConversation>
        readonly activityTab: ActivityConversation;
        readonly consoleTab: ConsoleConversation
        readonly recent: ReadonlyArray<RecentPrivateConversation>
        readonly recentChannels: ReadonlyArray<RecentChannelConversation>
        readonly selectedConversation: Conversation
        readonly hasNew: boolean;
        byKey(key: string): Conversation | undefined

        getPrivate(character: Character): PrivateConversation;
        getPrivate(character: Character, noCreate: boolean): PrivateConversation | undefined;
    }

    export enum Setting {
        True, False, Default
    }

    export interface Settings {
        notify: Setting;
        notifyOnFriendMessage: Relation.Chooser;
        highlight: Setting;
        highlightWords: Array<string>;
        highlightUsernames: Array<string>;
        joinMessages: Setting;
        defaultHighlights: boolean;
        adSettings: AdSettings;
    }

    export interface AdSettings {
        readonly ads: string[];
        readonly randomOrder: boolean;
        readonly lastAdTimestamp: number;
    }

    export const enum UnreadState { None, Unread, Mention }

    export interface Conversation {
        enteredText: string;
        infoText: string;
        readonly name: string;
        messages: Array<Message>;
        readonly reportMessages: ReadonlyArray<Message>;
        readonly lastRead: Message | undefined
        errorText: string
        readonly key: string
        readonly unread: UnreadState
        settings: Settings
        readonly adManager: AdManager;
        send(): Promise<void>
        clear(): void
        loadLastSent(): void
        show(): void
        clearUnread(): void;
        loadMore(): boolean
    }
}

export type Conversation = Conversation.Conversation;

export namespace Logs {
    export type Conversation = {readonly key: string, readonly name: string};
}

export interface Logs {
    logMessage(conversation: Conversation, message: Conversation.Message): Promise<void> | void
    getBacklog(conversation: Conversation): Promise<ReadonlyArray<Conversation.Message>>
    getConversations(character: string): Promise<ReadonlyArray<Logs.Conversation>>
    getLogs(character: string, key: string, date: Date): Promise<ReadonlyArray<Conversation.Message>>
    getLogDates(character: string, key: string): Promise<ReadonlyArray<Date>>
    getAvailableCharacters(): Promise<ReadonlyArray<string>>
    canZip: boolean;
}

export type SearchKink = {id: number, name: string, description: string};
export type SearchSpecies = {id: number, name: string, shortName: string, details: string, keywords: string};

export interface SearchData {
    kinks: SearchKink[]
    genders: string[]
    orientations: string[]
    languages: string[]
    furryprefs: string[]
    roles: string[]
    positions: string[]
    bodytypes: string[]
}

export interface ExtendedSearchData extends SearchData {
    species: SearchSpecies[];
}

export namespace Settings {
    export type Keys = {
        settings: Settings
        pinned: {channels: string[], private: string[]}
        conversationSettings: {[key: string]: Conversation.Settings | undefined}
        modes: {[key: string]: Channel.Mode | undefined}
        recent: Conversation.RecentPrivateConversation[]
        recentChannels: Conversation.RecentChannelConversation[]
        hiddenUsers: string[]
        favoriteEIcons: Record<string, boolean>
        statusHistory: string[]
        searchHistory: (ExtendedSearchData | SearchData)[]
        hideNonMatchingAds: boolean
        hideProfileComparisonSummary: boolean
        ads: Ad[]
    };

    export interface Store {
        get<K extends keyof Keys>(key: K, character?: string): Promise<Keys[K] | undefined>
        getAvailableCharacters(): Promise<ReadonlyArray<string>>
        set<K extends keyof Keys>(key: K, value: Keys[K]): Promise<void>
    }

    export interface Settings {
        playSound: boolean;
        notifyVolume: number;
        clickOpensMessage: boolean;
        disallowedTags: string[];
        notifications: boolean;
        notifyFriendSignIn: Relation.Chooser;
        notifyOnFriendMessage: Relation.Chooser;
        highlight: boolean;
        highlightWords: string[];
        highlightUsers: boolean;
        highlightUsernames: string[];
        showBroadcastsInPMs: boolean;
        showAvatars: boolean;
        animatedEicons: boolean;
        idleTimer: number;
        messageSeparators: boolean;
        eventMessages: boolean;
        joinMessages: boolean;
        alwaysNotify: boolean;
        logMessages: boolean; // All messages
        logChannels: boolean;
        logAds: boolean;
        expensiveMemberList: boolean;
        fontSize: number;
        showNeedsReply: boolean;
        enterSend: boolean;
        secondEnterSend: boolean;
        colorBookmarks: boolean;

        risingAdScore: boolean;
        risingLinkPreview: boolean;
        linkPreviewVolume: number;
        risingAutoCompareKinks: boolean;

        risingAutoExpandCustomKinks: boolean;
        risingCharacterPreview: boolean;
        risingComparisonInUserMenu: boolean;
        risingComparisonInSearch: boolean;

        risingShowUnreadOfflineCount: boolean;
        risingColorblindMode: boolean;
        risingShowPortraitNearInput: boolean;
        risingShowPortraitInMessage: boolean;
        risingShowHighQualityPortraits: boolean;

        risingFilter: SmartFilterSettings;

        risingCharacterTheme: string | undefined;

        /**
         * Legacy: deprecate by removing from place of use, but retain it in settings for backporting capability; as long as we want to suporrt that.
         */
        bbCodeBar: boolean;
    }
}

export type Settings = Settings.Settings;

export interface Notifications {
    isInBackground: boolean
    notify(conversation: Conversation, title: string, body: string, icon: string, sound: string): Promise<void>
    playSound(sound: string): void
    requestPermission(): Promise<void>
    initSounds(sounds: ReadonlyArray<string>): Promise<void[]>
    applyGlobalAudioVolume(volume: number): Promise<void>
}

export interface State {
    settings: Settings;
    generalSettings: GeneralSettings;
    hiddenUsers: string[];
    favoriteEIcons: Record<string, boolean>;
}

/**
 * Miscellaneous elements needed only by the current run of the application. If you need to save anything, you should use `core.state` and its associated disk-writing features.
 */
export interface Runtime {
    dialogStack: Modal[];
    primaryInput: HTMLInputElement | HTMLTextAreaElement | null;
    registerPrimaryInputElement(e: HTMLInputElement | HTMLTextAreaElement): void;
    userToggles: { [key: string]: boolean } & {
        news?:       boolean,
        activity?:   boolean,
        scratchpad?: boolean,
    }
}
