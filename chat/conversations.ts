// SPDX-License-Identifier: AGPL-3.0-or-later
import Vue from 'vue';
import {queuedJoin} from '../fchat/channels';
import {decodeHTML} from '../fchat/common';
import { AdManager } from './ads/ad-manager';
import ConversationNoteManager from './conversation_notes';
import { ConversationSettings, EventMessage, BroadcastMessage,  Message, messageToString } from './common';
import core from './core';
import { sleep } from '../helpers/utils';
import { Channel, Character, Conversation as Interfaces, Relation } from './interfaces';
import isChannel = Interfaces.isChannel;
import l from './localize';
import {CommandContext, isAction, isCommand, isWarn, parse as parseCommand} from './slash_commands';
import MessageType = Interfaces.Message.Type;
import EventBus from './preview/event-bus';
import throat from 'throat';

import NewLogger from '../helpers/log';
const log = NewLogger('conversation', () => core?.state.generalSettings.argv.includes('--debug-conversation'));
const logS = NewLogger('settings', () => core?.state.generalSettings.argv.includes('--debug-settings'));
const logA = NewLogger('activity', () => core?.state.generalSettings.argv.includes('--debug-activity'));
const logRTB = NewLogger('rtb', () => core?.state.generalSettings.argv.includes('--debug-rtb'));
const logNotes = NewLogger('notes', () => core?.state.generalSettings.argv.includes('--debug-notes'));

const TWENTY_MINUTES_IN_MS = 20 * 60 * 1000;
const THIRTY_MINUTES_IN_MS = 30 * 60 * 1000;

function createMessage(this: any, type: MessageType, sender: Character, text: string, time?: Date): Message {
    if(type === MessageType.Message && isAction(text)) {
        type = MessageType.Action;
        text = text.substring(text.charAt(4) === ' ' ? 4 : 3);
    }
    return new Message(type, sender, text, time);
}

function safeAddMessage(this: any, messages: Interfaces.Message[], message: Interfaces.Message, max: number): void {
    if(messages.length >= max) messages.shift();
    messages.push(message);
}

abstract class Conversation implements Interfaces.Conversation {
    abstract enteredText: string;
    abstract readonly name: string;
    messages: Interfaces.Message[] = [];
    errorText = '';
    unread = Interfaces.UnreadState.None;
    lastRead: Interfaces.Message | undefined = undefined;
    infoText = '';
    abstract readonly maxMessageLength: number | undefined;
    _settings: Interfaces.Settings;
    protected abstract context: CommandContext;
    protected maxMessages = 50;
    protected insertCount = 0;
    protected allMessages: Interfaces.Message[] = [];
    readonly reportMessages: Interfaces.Message[] = [];
    private lastSent = '';
    // private loadedMore = false;
    adManager: AdManager;

    public static readonly conversationThroat = throat(1); // make sure user posting and ad posting won't get in each others' way

    constructor(readonly key: string, public _isPinned: boolean) {
        this.adManager = new AdManager(this);

        // In the future, see if we can manage settings by conversation type so we can offer different settings for PMs.
        if (this instanceof ConsoleConversation || this instanceof ActivityConversation) {
            this._settings = new ConversationSettings();
        }
        else {
            this._settings = Vue.observable(state.settings[key] || new ConversationSettings());

            core.watch(() => this._settings, async (newValue, _oldValue) => {
                logS.warn(`watch _settings will save conversation ${this.name}.`);
                state.setSettings(this.key, newValue);
            }, { deep: true });
        }
    }

    get settings(): Interfaces.Settings {
        return this._settings;
    }

    set settings(value: Interfaces.Settings) {
        this._settings = value;
    }

    get isPinned(): boolean {
        return this._isPinned;
    }

    set isPinned(value: boolean) {
        if(value === this._isPinned) return;
        this._isPinned = value;
        state.savePinned(); //tslint:disable-line:no-floating-promises
    }

    clearText(): void {
        setImmediate(() => this.enteredText = '');
    }

    async send(): Promise<void> {
        // This is a safety check; technically if we reached this point, we should send the message.
        // However, parsing requires there be an actual message, so we can't avoid this.
        this.enteredText = this.enteredText.trim();
        if (!this.enteredText)
            return;

        if(isCommand(this.enteredText)) {
            const parsed = parseCommand(this.enteredText, this.context);
            if(typeof parsed === 'string') this.errorText = parsed;
            else {
                parsed.call(this);
                this.lastSent = this.enteredText;
                this.clearText();
            }
        } else {
            this.lastSent = this.enteredText;
            await this.doSend();
        }
    }

    //tslint:disable-next-line:no-async-without-await
    abstract addMessage(message: Interfaces.Message): Promise<void>;

    loadLastSent(): void {
        this.enteredText = this.lastSent;
    }

    loadMore(): boolean {
        if(this.messages.length >= this.allMessages.length) return false;
        this.maxMessages += 50;
        // this.loadedMore = true;
        this.messages = this.allMessages.slice(-this.maxMessages);

        EventBus.$emit('conversation-load-more', { conversation: this });

        return true;
    }

    show(): void {
        state.show(this);
    }

    onHide(): void {
        this.errorText = '';
        this.lastRead = this.messages[this.messages.length - 1];
        this.maxMessages = 50;
        this.messages = this.allMessages.slice(-this.maxMessages);
        // this.loadedMore = false;
        this.insertCount = 0;
    }

    clearUnread() {
        this.unread = Interfaces.UnreadState.None;
    }

    // Keeps the message-list from re-rendering every time when full, cleaning up after itself every 200 messages
    stretch(): void {
        if ((core.conversations.selectedConversation !== this) || (this.messages.length < this.maxMessages)) {
            return;
        }

        if (this.insertCount < 200) {
            this.maxMessages += 1;
            this.insertCount += 1;
        } else {
            const removed = this.insertCount;

            this.maxMessages -= removed;
            this.insertCount = 0;
            this.messages = this.allMessages.slice(-this.maxMessages);

            log.debug('conversation.view.cleanup', { channel: this.name, removed, left: this.messages.length, limit: this.maxMessages });
        }
    }

    clear(): void {
        this.allMessages = [];
        this.messages = [];
    }

    abstract close(): void;

    protected safeAddMessage(message: Interfaces.Message): void {
        safeAddMessage(this.reportMessages, message, 500);
        safeAddMessage(this.allMessages, message, 500);
        safeAddMessage(this.messages, message, this.maxMessages);
    }

    protected abstract doSend(): void | Promise<void>;


    protected static readonly POST_DELAY = 1250;

    public static async testPostDelay(): Promise<void> {
        const lastPostDelta = Date.now() - core.cache.getLastPost().getTime();

        if (lastPostDelta < Conversation.POST_DELAY && lastPostDelta > 0)
            await sleep(Conversation.POST_DELAY - lastPostDelta);
    }

    isSendingAutomatedAds(): boolean {
        return this.adManager.isActive();
    }


    toggleAutomatedAds(): void {
        this.adManager.isActive() ? this.adManager.stop() : this.adManager.start();
    }


    hasAutomatedAds(): boolean {
        return (this.adManager.getAds().length > 0);
    }
}

class PrivateConversation extends Conversation implements Interfaces.PrivateConversation {
    readonly name: string;
    readonly context = CommandContext.Private;
    typingStatus: Interfaces.TypingStatus = 'clear';
    readonly maxMessageLength = core.connection.vars.priv_max;
    private _enteredText = '';
    private ownTypingStatus: Interfaces.TypingStatus = 'clear';
    private timer: number | undefined;
    private logPromise = core.logs.getBacklog(this).then((messages) => {
        this.allMessages.unshift(...messages);
        this.reportMessages.unshift(...messages);
        this.messages = this.allMessages.slice();
    });

    notes = new ConversationNoteManager();

    constructor(readonly character: Character) {
        super(character.name.toLowerCase(), state.pinned.private.indexOf(character.name) !== -1);

        this.lastRead = this.messages[this.messages.length - 1];

        this.name  = this.character.name;
    }

    get enteredText(): string {
        return this._enteredText;
    }

    set enteredText(value: string) {
        this._enteredText = value;
        if(this.timer !== undefined) clearTimeout(this.timer);
        if(value.length > 0) {
            if(this.ownTypingStatus !== 'typing') this.setOwnTyping('typing');
            this.timer = window.setTimeout(() => this.setOwnTyping('paused'), 5000);
        } else if(this.ownTypingStatus !== 'clear') this.setOwnTyping('clear');
    }

    async addMessage(message: Interfaces.Message): Promise<void> {
        await this.logPromise;

        this.stretch();

        this.safeAddMessage(message);

        if (message.type !== MessageType.Event
         && message.type !== MessageType.Bcast) {
            if (core.state.settings.logMessages)
                await core.logs.logMessage(this, message);

            if (this.settings.notify !== Interfaces.Setting.False && message.sender !== core.characters.ownCharacter)
                await core.notifications.notify(this, message.sender.name, message.text, core.characters.getImage(message.sender.name), 'attention');

            if (this !== state.selectedConversation || !state.windowFocused)
                this.unread = Interfaces.UnreadState.Mention;

            this.typingStatus = 'clear';
        }
    }

    async close(): Promise<void> {
        this.setOwnTyping('clear');
        state.privateConversations.splice(state.privateConversations.indexOf(this), 1);
        delete state.privateMap[this.character.name.toLowerCase()];
        await state.savePinned();
        if(state.selectedConversation === this) state.show(core.state.generalSettings.defaultToHome ? state.activityTab : state.consoleTab);
    }

    async sort(newIndex: number): Promise<void> {
        state.privateConversations.splice(state.privateConversations.indexOf(this), 1);
        state.privateConversations.splice(newIndex, 0, this);
        return state.savePinned();
    }

    public async sendMessageEx(messageText: string): Promise<void> {
        if(this.character.status === 'offline') {
            this.errorText = l('chat.errorOffline', this.character.name);
            return;
        }

        if(this.character.isIgnored) {
            this.errorText = l('chat.errorIgnored', this.character.name);
            return;
        }

        await Conversation.conversationThroat(
            async() => {
                await Conversation.testPostDelay();

                core.connection.send('PRI', {recipient: this.name, message: messageText});
                core.cache.markLastPostTime();

                const message = createMessage(MessageType.Message, core.characters.ownCharacter, messageText);
                this.safeAddMessage(message);

                if(core.state.settings.logMessages) await core.logs.logMessage(this, message);
            }
        );
    }

    protected async doSend(): Promise<void> {
        await this.logPromise;
        if(this.character.status === 'offline') {
            this.errorText = l('chat.errorOffline', this.character.name);
            return;
        }
        if(this.character.isIgnored) {
            this.errorText = l('chat.errorIgnored', this.character.name);
            return;
        }

        if(this.adManager.isActive()) {
            this.errorText = 'Cannot send ads manually while ad auto-posting is active';
            return;
        }

        const messageText = this.enteredText;

        this.clearText();

        await Conversation.conversationThroat(
            async() => {
                await Conversation.testPostDelay();

                core.connection.send('PRI', {recipient: this.name, message: messageText});
                core.cache.markLastPostTime();

                const message = createMessage(MessageType.Message, core.characters.ownCharacter, messageText);
                this.safeAddMessage(message);

                if(core.state.settings.logMessages) await core.logs.logMessage(this, message);
            }
        );
    }

    private setOwnTyping(status: Interfaces.TypingStatus): void {
        this.ownTypingStatus = status;
        core.connection.send('TPN', {character: this.name, status});
    }
}

class ChannelConversation extends Conversation implements Interfaces.ChannelConversation {
    readonly context = CommandContext.Channel;
    readonly name: string;
    isSendingAds: boolean;
    nextAd = 0;
    private chat: Interfaces.Message[] = [];
    private ads: Interfaces.Message[] = [];
    private both: Interfaces.Message[] = [];
    private _mode!: Channel.Mode;
    private adEnteredText = '';
    private chatEnteredText = '';
    private logPromise = core.logs.getBacklog(this).then((messages) => {
        this.both.unshift(...messages);
        this.chat.unshift(...this.both.filter((x) => x.type !== MessageType.Ad));
        this.ads.unshift(...this.both.filter((x) => x.type === MessageType.Ad));
        this.reportMessages.unshift(...messages);
        this.lastRead = this.messages[this.messages.length - 1];
        this.messages = this.allMessages.slice(-this.maxMessages);
    });

    constructor(readonly channel: Channel) {
        super(`#${channel.id.replace(/[^\w- ]/gi, '')}`, state.pinned.channels.indexOf(channel.id) !== -1);
        core.watch<Channel.Mode | undefined>(function(): Channel.Mode | undefined {
            const c = this.channels.getChannel(channel.id);
            return c !== undefined ? c.mode : undefined;
        }, (value: Channel.Mode | undefined) => {
            if(value === undefined) return;
            this.mode = value;
            if(value !== 'both') this.isSendingAds = value === 'ads';
        });

        this.mode = channel.mode === 'both' && channel.id in state.modes ? state.modes[channel.id]! : channel.mode;

        this.name = this.channel.name;

        this.isSendingAds  = this.channel.mode === 'ads';
    }

    get maxMessageLength(): number {
        return core.connection.vars[this.isSendingAds ? 'lfrp_max' : 'chat_max'];
    }

    get mode(): Channel.Mode {
        return this._mode;
    }

    set mode(mode: Channel.Mode) {
        this._mode = mode;
        this.maxMessages = 50;
        this.allMessages = this[mode];
        this.messages = this.allMessages.slice(-this.maxMessages);
        if(mode === this.channel.mode && this.channel.id in state.modes) delete state.modes[this.channel.id];
        else if(mode !== this.channel.mode && mode !== state.modes[this.channel.id]) state.modes[this.channel.id] = mode;
        else return;
        state.saveModes(); //tslint:disable-line:no-floating-promises
    }

    get enteredText(): string {
        return this.isSendingAds ? this.adEnteredText : this.chatEnteredText;
    }

    set enteredText(value: string) {
        if(this.isSendingAds) this.adEnteredText = value;
        else this.chatEnteredText = value;
    }

    addModeMessage(mode: Channel.Mode, message: Interfaces.Message): void {
        safeAddMessage(this[mode], message, 500);
        if(this._mode === mode) safeAddMessage(this.messages, message, this.maxMessages);
    }

    async addMessage(message: Interfaces.Message): Promise<void> {
        await this.logPromise;

        this.stretch();

        const is_warning_from_mod = (m: Interfaces.Message): m is BroadcastMessage | Message => {
            if (m.type === MessageType.Message || m.type === MessageType.Ad) {
                const is_mod = (this.channel.members[m.sender.name]?.rank ?? Channel.Rank.Member) > Channel.Rank.Member;

                return isWarn(m.text) && (is_mod || m.sender.isChatOp);
            }
            return false;
        }

        if (is_warning_from_mod(message)) {
            message = new Message(MessageType.Warn, message.sender, message.text.substring(6), message.time);
        }

        const user_should_know = (c: ChannelConversation) => {
            return this.mode !== 'ads'
                && (c !== state.selectedConversation || !state.windowFocused)
        }

        if (message.type === MessageType.Ad) {
            this.addModeMessage('ads', message);

            if (core.state.settings.logAds) {
                await core.logs.logMessage(this, message);
            }
        }
        else {
            this.addModeMessage('chat', message);

            if (message.type === MessageType.Event) {
                this.addModeMessage('ads', message);
            }
            else if (message.type === MessageType.Warn) {
                this.addModeMessage('ads', message);
            }
            else if (message.type !== MessageType.Bcast) {
                if (core.state.settings.logMessages && core.state.settings.logChannels)
                    await core.logs.logMessage(this, message);

                if (user_should_know(this) && this.unread === Interfaces.UnreadState.None)
                    this.unread = Interfaces.UnreadState.Unread;
            }
        }

        this.addModeMessage('both', message);

        if (message.type !== MessageType.Event) {
            safeAddMessage(this.reportMessages, message, 500);
        }
    }

    clear(): void {
        this.messages = [];
        this.chat.length = 0;
        this.ads.length = 0;
        this.both.length = 0;
    }

    close(): void {
        core.connection.send('LCH', {channel: this.channel.id});
    }

    async sort(newIndex: number): Promise<void> {
        state.channelConversations.splice(state.channelConversations.indexOf(this), 1);
        state.channelConversations.splice(newIndex, 0, this);
        return state.savePinned();
    }

    protected async doSend(): Promise<void> {
        const isAd = this.isSendingAds;

        if(isAd && this.adManager.isActive()) {
            this.errorText = 'Cannot post ads manually while ad auto-posting is active';
            return;
        }

        if(isAd && Date.now() < this.nextAd) {
            this.errorText = 'You must wait at least ten minutes between ad posts on this channel';
            return;
        }

        const message = this.enteredText;

        if (!isAd) {
            this.clearText();
        }

        await Conversation.conversationThroat(
            async() => {
                await Conversation.testPostDelay();

                core.connection.send(isAd ? 'LRP' : 'MSG', {channel: this.channel.id, message});
                core.cache.markLastPostTime();

                await this.addMessage(
                    createMessage(isAd ? MessageType.Ad : MessageType.Message, core.characters.ownCharacter, message, new Date())
                );

                if(isAd) {
                    this.nextAd = Date.now() + core.connection.vars.lfrp_flood * 1000;

                    // enforces property setter
                    this.settings = {
                        ...this.settings,
                        adSettings: {
                          ...this.settings.adSettings,
                          lastAdTimestamp: Date.now()
                      }
                    };
                }
            }
        );
    }


    hasAutomatedAds(): boolean {
        return ((this.mode === 'both') || (this.mode === 'ads'))
            && super.hasAutomatedAds();
    }


    async sendAd(text: string): Promise<void> {
        if (text.length < 1)
            return;

        const initTime = Date.now();

        await Conversation.conversationThroat(
            async() => {
                const throatTime = Date.now();

                await Promise.all([
                    await Conversation.testPostDelay(),
                    await core.adCoordinator.requestTurnToPostAd()
                ]);

                const delayTime = Date.now();

                core.connection.send('LRP', {channel: this.channel.id, message: text});
                core.cache.markLastPostTime();

                log.debug(
                'conversation.sendAd',
                  {
                    character: core.characters.ownCharacter?.name,
                    channel: this.channel.name,
                    throatDelta: throatTime - initTime,
                    delayDelta: delayTime - throatTime,
                    totalWait: delayTime - initTime,
                    text
                  }
                );

                await this.addMessage(
                    createMessage(MessageType.Ad, core.characters.ownCharacter, text, new Date())
                );

                this.nextAd = Date.now() + core.connection.vars.lfrp_flood * 1000;

                // enforces property setter
                this.settings = {
                    ...this.settings,
                    adSettings: {
                      ...this.settings.adSettings,
                      lastAdTimestamp: Date.now()
                  }
                };
            }
        );
    }
}

class ConsoleConversation extends Conversation {
    readonly context = CommandContext.Console;
    readonly name = l('chat.consoleTab');
    readonly maxMessageLength = undefined;
    enteredText = '';

    constructor() {
        super('_', false);
        this.allMessages = [];
    }

    //tslint:disable-next-line:no-empty
    close(): void {
    }

    async addMessage(message: Interfaces.Message): Promise<void> {
        this.safeAddMessage(message);
        if(core.state.settings.logMessages) await core.logs.logMessage(this, message);
        if(this !== state.selectedConversation || !state.windowFocused) this.unread = Interfaces.UnreadState.Unread;
    }

    protected doSend(): void {
        this.errorText = l('chat.consoleChat');
    }
}

class ActivityConversation extends Conversation {
    constructor() {
        super('_activity', false);

        // Not sure how many of these are necessary.
        this._settings.notify = Interfaces.Setting.False;
        this._settings.highlight = Interfaces.Setting.False;
        this._settings.defaultHighlights = false;

        EventBus.$on('activity-friend-login',    e => this.handleLogin({ e: 'EBL', ...e }));
        EventBus.$on('activity-friend-logout',   e => this.handleLogout({ e: 'EBL', ...e }));
        EventBus.$on('activity-friend-status',   e => this.handleStatus({ e: 'EBS', ...e }));
        EventBus.$on('activity-bookmark-login',  e => this.handleLogin({ e: 'EBL', ...e }));
        EventBus.$on('activity-bookmark-logout', e => this.handleLogout({ e: 'EBL', ...e }));
        EventBus.$on('activity-bookmark-status', e => this.handleStatus({ e: 'EBS', ...e }));
    }

    //override messages: Array<Interfaces.Message | undefined> = [];

    readonly context = CommandContext.Console;
    readonly name = l('chat.activityTab');
    readonly maxMessageLength = 0;
    readonly enteredText = '';

    _messages: Array<Interfaces.Message | undefined> = [];

    static importance = {
        login: 0,
        status: 1,
        looking: 2,
    } as const;

    /**
     * The styles of messages we want to preserve.
     */

    /**
     * Recent login notifications. Not that important, since you can see online people in the sidebar.
     * Amount: 3
     * Track: logins
     * hook into state.windowFocused to determine new?
     */
    protected readonly login: Map<string, number> = new Map();
    protected readonly MAX_LOGINS = 0;

    /**
     * Custom statuses are important because they're directly from the user.
     * Amount: All?
     * Track: has set custom status.
     */
    protected readonly status: Map<string, number> = new Map();
    protected readonly MAX_STATUS = 0;

    /**
     * People with looking status.
     * Amount: All?
     * Track: Status changes to looking
     */
    protected readonly looking: Map<string, number> = new Map();
    protected readonly MAX_LOOKING = 0;

    /**
     * People who recently returned.
     * Amount: 3
     * Track: Status changed from away/busy/dnd to online or crown.
     */
    protected readonly returned: Map<string, number> = new Map();
    protected readonly MAX_RETURNED = 0;

    members: string[] = [];

    // private rebuildMembers() {
    //     this.members.length = 0;
    //     this.members.push(
    //         ...this.login.keys(),
    //         ...this.status.keys(),
    //         ...this.looking.keys(),
    //         ...this.returned.keys(),
    //     );
    // }

    protected addToMemberList(name: string) {
        const key = name.toLowerCase();

        if (!this.members.includes(key))
            this.members.push(key);
    }

    /**
     * `removeCharacter` was designed to reveal information about removal, which was initially considered undesirable to reveals - but now I can't see how it matters, so possibly just make `removeCharacter` public to replace this.
     * @param name Name of character - will be sanitized into a name-key
     */
    public clearMember(name: string) {
        this.removeCharacter(name.toLowerCase() /* key */);
    }

    // public messageTypeForMember(name: string): Interfaces.ActivityType | null {
    //     if      (this.login.has(name))      return 'login';
    //     else if (this.status.has(name))     return 'status';
    //     else if (this.looking.has(name))    return 'looking';
    //     else if (this.returned.has(name))   return 'returned';
    //     else                                return null;
    // }

    // public messageForMember(name: string): Interfaces.Message | null {
    //     const i = this.login.get(name) ?? this.status.get(name) ?? this.looking.get(name) ?? this.returned.get(name);

    //     // @ts-ignore "type undefined not assignable" Give me a break.
    //     return i && this._messages[i]
    //         ? this._messages[i]
    //         : null;
    // }

    /**
     * Heuristics
     * Unused yet. Useful to check custom statuses if showing all custom statuses doesn't work.
     */
    protected readonly ignoreKeywords = [ "at work", "working", "busy", "away", "not here", "idle" ];
    protected readonly preferKeywords = [ "looking for", "want", "new", "you" ];

    protected updateDisplay(addedAny?: boolean, elevateAlertLevel?: boolean): void {
        this.messages = this._messages.filter((m): m is Interfaces.Message => m !== undefined); // webpack ts

        if (addedAny && this !== state.selectedConversation || !state.windowFocused) {
            if (!this.messages.length) // needs better detection.
                this.unread = Interfaces.UnreadState.None;
            else if (elevateAlertLevel)
                this.unread = Interfaces.UnreadState.Mention;
            else
                this.unread = Interfaces.UnreadState.Unread;
        }

    }

    /**
     * Get the oldest slot in a full map or the first empty slot in the message array. Modifies the map to remove the entry we're replacing. The default index for a slot is _messages.length; ie after the last.
     * @param map The map to check for empty slots.
     * @param MAX Maximum number of entries in the map allowed. Will remove oldest entry and return the index of the now-empty slot.
     * @returns index in _messages where a new message can go.
     */
    protected freeSlot(map: Map<string, number>, MAX?: number): number {
        if (MAX && MAX > 0 && map.size >= MAX) {
            let oldestKey:  string | undefined;
            let oldestTime: number | undefined;

            for (const [key, i] of map.entries()) {
                const m = this._messages[i];
                if (!m) { // mystery orphan, use it
                    map.delete(key);
                    logA.debug('ActivityConversation.freeSlot.orphan', key, i);
                    return i;
                }

                const this_time = m.time.getTime();
                if (oldestTime === undefined || this_time < oldestTime) {
                    logA.debug('Time for', m.text, 'is', this_time, 'while oldest is', oldestTime);

                    oldestTime = this_time;
                    oldestKey = key;
                }
            }

            if (oldestKey) {
                const i = map.get(oldestKey);
                map.delete(oldestKey);

                logA.debug('ActivityConversation.freeSlot.oldestKey', oldestKey, i);

                // Some day the typescript team will be replaced with AI and we will be able to bully it into not fucking everything up.
                if (i !== undefined) // bad TS check; it exists
                    return i;
            }
        }
         else { // not full - find existing undefined slot; use default is there isn't one.
                // if removeCharacter just ran, this is at least going to find that empty slot.
            const i = this._messages.findIndex(e => !e);
            logA.debug('ActivityConversation.freeSlot.unsaturated', i);
            if (i !== -1)
                return i;
        }

        return this._messages.length;
    }

    /**
     * Remove a character from the mappings and from the member list and return a free slot if one was freed; null otherwise.
     * @param name Character name to look for in the maps.
     * @returns index of slot in `_messages` that's now undefined; null if a character wasn't removed.
     */
    protected removeCharacter(name: string): number | null {
        const key = name.toLowerCase();

        logA.debug('ActivityConversation.removeCharacter.start', key);

        // Remove from member list
        const ml_index = this.members.indexOf(key);
        if (ml_index >= 0)
            this.members.splice(ml_index, 1);

        // For an entry in each of the groups, use the entry to remove the message from messages[];
        const i = this.login.get(key) ?? this.status.get(key) ?? this.looking.get(key) ?? this.returned.get(key);

        [ this.login, this.status, this.looking, this.returned ]
            .forEach(map => map.delete(key));

        if (i === undefined) {
            logA.debug('ActivityConversation.removeCharacter.none');
            return null;
        }
        else {
            logA.debug('ActivityConversation.removeCharacter.found', i, this._messages[i]);
            this._messages[i] = undefined;
            return i;
        }
    };

    protected isTracked(name: string): boolean {
        const key = name.toLowerCase();

        return this.login.has(key) ?? this.status.has(key) ?? this.looking.has(key) ?? this.returned.has(key);
    }

    protected isHere(status: Character.Status): status is 'online' | 'looking' | 'crown' {
        return [ 'online', 'looking', 'crown' ].includes(status);
    }

    // Login is any status change with the character 'offline' but the status 'online'.
    protected async handleLogin(activity: Interfaces.ActivityContext & { e: 'EBL' }): Promise<void> {
        const c   = activity.character;
        const key = activity.character.name.toLowerCase();

        if (c.isFriend || c.isBookmarked) { // expanded to bookmarks for now.
            logA.debug('ActivityConversation.handleLogin.start.friend', key);

            // Clear a spot.
            const index  = this.removeCharacter(key);
            const index2 = this.freeSlot(this.login, this.MAX_LOGINS); // This does not remove properly.

            // add index to login map.
            this.login.set(key, index ?? index2);
            const message = new EventMessage(l('events.login', `[user]${key}[/user]`), activity.date);
            this._messages[index ?? index2] = message;

            this.addToMemberList(key);
            this.cleanseOutdatedData();
            this.updateDisplay(true);
            // c.isFriend && shouldNotifyOnFriendLogin() || c.isBookmarked && shouldNotifyOnBookmarkLogin()

            logA.debug('ActivityConversation.handleLogin.postAdd', {
                name: key,
                index: index ?? index2,
                loginEntries: [ ...this.login.entries() ].map(e => `${e[0]}->${e[1]}`),
            });
        }
        else { // bookmark; don't log logins.
            logA.debug('ActivityConversation.handleLogin.start.unused');
            return;
        }
    }

    // Logout is any status change with the character whos new status is 'offline'.
    protected async handleLogout(activity: Interfaces.ActivityContext & { e: 'EBL' }): Promise<void> {
        const key = activity.character.name.toLowerCase();

        logA.debug('ActivityConversation.handleLogout.tracked', {
            name: key,
            x:    activity.date
        });

        this.removeCharacter(key);
        this.cleanseOutdatedData();
        this.updateDisplay();
    }

    /**
     * Status change is any non-login, non-logout status change event. Specifically:
     * 1. Going away/busy/dnd. Add to `this.away`.
     * 2. Coming out of away/busy/dnd. Remove from `this.away`, add to `this.returned`.
     * 3. Set looking status. add to `this.looking`.
     * 4. Set custom message. add to `this.status`.
     */
    protected async handleStatus(activity: Interfaces.ActivityContext & { e: 'EBS' }): Promise<void> {
        const key = activity.character.name.toLowerCase();

        let target_map: Map<string, number> | undefined;
        let target_max: number | undefined;
        let message: Interfaces.Message | undefined;

        // bucket
        if (activity.statusmsg && [ 'online', 'crown', 'looking' ].includes(activity.status)) {
            logA.debug('ActivityConversation.handleStatus.status');

            target_map = this.status;

            message = new EventMessage(
                l(activity.statusmsg ? 'events.status.message' : 'events.status',
                    `[user]${key}[/user]`,
                    l(`status.${activity.status}`),
                    decodeHTML(activity.statusmsg)
                ),
                activity.date
            );
        }
        else if (activity.status === 'looking') {
            logA.debug('ActivityConversation.handleStatus.looking');

            target_map = this.looking;
            target_max = this.MAX_LOOKING;

            message = new EventMessage(
                l(activity.statusmsg ? 'events.status.message' : 'events.status',
                    `[user]${key}[/user]`,
                    l(`status.${activity.status}`),
                    decodeHTML(activity.statusmsg)
                ),
                activity.date
            );
        }
        else if ([ 'away', 'busy', 'dnd' ].includes(activity.oldStatus)
              && [ 'online', 'crown' ].includes(activity.status)) {
            logA.debug('ActivityConversation.handleStatus.returned');

            target_map = this.returned;
            target_max = this.MAX_RETURNED;

            message = new EventMessage(
                l(activity.statusmsg ? 'events.status.message' : 'events.status',
                    `[user]${key}[/user]`,
                    l(`status.${activity.status}`),
                    decodeHTML(activity.statusmsg)
                ),
                activity.date
            );
        }
        else if (activity.oldStatus === activity.status) {
            // online -> online frequently seen for some logins.
            // above we already capture "status === looking" and "here w/statusmsg"
            return;
        }
        else {
            logA.debug('ActivityConversation.handleStatus.shouldntBeHitbyLogin', {
                name:      key,
                status:    activity.status,
                oldStatus: activity.oldStatus,
            });
            this.removeCharacter(key);
            this.updateDisplay(); // removed
            return; // Other status changes shouldn't be received here.
        }

        const index =  this.removeCharacter(key);
        const index2 = this.freeSlot(target_map, target_max);

        logA.debug('handleStatus.indexDecided', { i1: index, i2: index2 });

        target_map.set(key, index ?? index2);
        this._messages[index ?? index2] = message;

        this.addToMemberList(key);
        this.cleanseOutdatedData();
        this.updateDisplay(true);
    }

    /**
     * Clear data that's been outdated by time or missing message.
     */
    protected cleanseOutdatedData(): void {
        const current_time = Date.now();

        [ this.status, this.looking ].forEach(map =>
            map.forEach((i, key) => {
                // @ts-ignore Webpack TS :)
                if (!this._messages[i] || current_time - this._messages[i].time.getTime() > THIRTY_MINUTES_IN_MS)
                    this.removeCharacter(key);
            })
        );

        [ this.login, this.returned ].forEach(map =>
            map.forEach((i, key) => {
                // @ts-ignore Webpack TS :)
                if (!this._messages[i] || current_time - this._messages[i].time.getTime() > TWENTY_MINUTES_IN_MS)
                    this.removeCharacter(key);
            })
        );
    }

    async parse(_activity: Exclude<Interfaces.ActivityContext, { e: 'EBE' }>): Promise<void> {
    }; // placeholder; not yet needed

    // Noop placeholder
    async addMessage(_message: Interfaces.Message): Promise<void> {}
    //     // Judge for relevance.
    //     if (message.type === MessageType.Action) {
    //         log.debug('activity.addMessage.action', message);
    //     }
    //     if (message.type === MessageType.Bcast) {
    //         log.debug('activity.addMessage.bcast', message);
    //     }
    //     if (message.type === MessageType.Event) {
    //         log.debug('activity.addMessage.event', message);
    //     }
    //     if (message.type === MessageType.Message) {
    //         log.debug('activity.addMessage.message', message);
    //     }
    //     if (message.type === MessageType.Warn) {
    //         log.debug('activity.addMessage.warn', message);
    //     }

    //     this.safeAddMessage(message);
    //     if (this !== state.selectedConversation || !state.windowFocused)
    //         this.unread = Interfaces.UnreadState.Unread;
    // }
    close(): void {}                     // noop
    onHide(): void {}                    // noop
    protected doSend(): void {}          // noop
}

class State implements Interfaces.State {
    privateConversations: PrivateConversation[] = [];
    channelConversations: ChannelConversation[] = [];
    privateMap: {[key: string]: PrivateConversation | undefined} = {};
    channelMap: {[key: string]: ChannelConversation | undefined} = {};
    activityTab!: ActivityConversation;
    consoleTab!: ConsoleConversation;
    selectedConversation: Conversation = this.consoleTab;
    recent: Interfaces.RecentPrivateConversation[] = [];
    recentChannels: Interfaces.RecentChannelConversation[] = [];
    pinned!: {channels: string[], private: string[]};
    settings!: {[key: string]: Interfaces.Settings};
    modes!: {[key: string]: Channel.Mode | undefined};
    windowFocused = document.hasFocus();

    get hasNew(): boolean {
        return this.privateConversations.some(x => x.unread === Interfaces.UnreadState.Mention)
            || this.channelConversations.some(x => x.unread === Interfaces.UnreadState.Mention);
    }

    getPrivate(character: Character): PrivateConversation;
    getPrivate(character: Character, noCreate: boolean): PrivateConversation | undefined;
    getPrivate(character: Character, noCreate: boolean = false): PrivateConversation | undefined {
        const key = character.name.toLowerCase();

        let conv = state.privateMap[key];

        if (conv)
            return conv;

        if (noCreate)
            return;

        void core.cache.queueForFetching(character.name);

        conv = new PrivateConversation(character);

        this.privateConversations.push(conv);
        this.privateMap[key] = conv;

        // @ts-ignore Webpack TS says conv is possibly undefined.
        this.recent = this.recent.filter(c => c.character !== conv.name);

        if (this.recent.length >= 50) this.recent.pop();

        this.recent.unshift({character: conv.name});
        core.settingsStore.set('recent', this.recent); //tslint:disable-line:no-floating-promises

        return conv;
    }

    byKey(key: string): Conversation | undefined {
        if (key === '_')
            return this.consoleTab;

        key = key.toLowerCase();

        return key[0] === '#' ? this.channelMap[key.substring(1)] : this.privateMap[key];
    }

    async savePinned(): Promise<void> {
        this.pinned.channels = this.channelConversations.filter(x => x.isPinned).map(x => x.channel.id);
        this.pinned.private  = this.privateConversations.filter(x => x.isPinned).map(x => x.name);

        await core.settingsStore.set('pinned', this.pinned);
    }

    async saveModes(): Promise<void> {
        await core.settingsStore.set('modes', this.modes);
    }

    async setSettings(key: string, value: Interfaces.Settings): Promise<void> {
        this.settings[key] = value;
        await core.settingsStore.set('conversationSettings', this.settings);
    }

    show(conversation: Conversation): void {
        if(conversation === this.selectedConversation) return;

        this.selectedConversation.onHide();
        // "Unread messages" are messages you haven't read yet. (So clearing them should be UI based.)
        // conversation.unread = Interfaces.UnreadState.None;
        this.selectedConversation = conversation;
        EventBus.$emit('select-conversation', { conversation });
    }

    async reloadSettings(): Promise<void> {
        //tslint:disable:strict-boolean-expressions
        this.pinned = await core.settingsStore.get('pinned') || { private: [], channels: [] };
        this.modes  = await core.settingsStore.get('modes')  || {};

        for (const conversation of this.channelConversations)
            conversation._isPinned = this.pinned.channels.includes(conversation.channel.id);

        for (const conversation of this.privateConversations)
            conversation._isPinned = this.pinned.private.includes(conversation.name);

        this.recent         = await core.settingsStore.get('recent')         || [];
        this.recentChannels = await core.settingsStore.get('recentChannels') || [];

        const settings = <{[key: string]: ConversationSettings}> await core.settingsStore.get('conversationSettings') || {};

        for (const key in settings) {
            settings[key] = Object.assign(new ConversationSettings(), settings[key]);
            const conv = this.byKey(key);
            if (conv !== undefined) conv._settings = settings[key];
        }
        this.settings = settings;
        //tslint:enable
    }
}

let state: State;

async function addEventMessage(this: any, message: Interfaces.Message): Promise<void> {
    await state.consoleTab.addMessage(message);
    if(core.state.settings.eventMessages && state.selectedConversation !== state.consoleTab)
        await state.selectedConversation.addMessage(message);
}

/**
 * Tests whether a character is in your PMs or a friend/bookmark.
 * @param this Unused; object
 * @param character Character to test importance of
 * @returns true if character is friend, bookmark, or has an open private message chat.
 */
function isOfInterest(this: any, character: Character): boolean {
    return character.isFriend || character.isBookmarked || state.privateMap[character.name.toLowerCase()] !== undefined;
}

async function withNeutralVisibilityPrivateConversation(character: Character.Character,
                                                        cb: (p: PrivateConversation, c: Character.Character) => Promise<void>
                                                       ): Promise<void> {
    const isVisibleConversation = !!state.getPrivate(character, true);
    const conv = state.getPrivate(character);

    await cb(conv, character);

    if (!isVisibleConversation) {
        await conv.close();
    }
}

function shouldNotifyOnFriendLogin(): boolean {
    return core.state.settings.notifyFriendSignIn === Relation.Chooser.Friends
        || core.state.settings.notifyFriendSignIn === Relation.Chooser.Both;
}

function shouldNotifyOnBookmarkLogin(): boolean {
    return core.state.settings.notifyFriendSignIn === Relation.Chooser.Bookmarks
        || core.state.settings.notifyFriendSignIn === Relation.Chooser.Both;
}

/**
 * Test whether a user has superpowers in a given channel.
 * @param char Character to determine importance of
 * @param channel Channel to test user importance against
 * @returns True if character is of some importance in that room
 */
export function isImportantToChannel(char: Character.Character, channel: Channel.Channel): boolean {
    return char.isChatOp // Global operator
        || channel.opList.includes(char.name)
        || channel.owner === char.name;
}

/**
 * Tests whether someone has superpowers in any channel you're in.
 * @param fromChar Character who sent you a message
 * @returns True if character is important in any channel you're in.
 */
export function globallyImportant(fromChar: Character.Character): boolean {
    for (const channel of core.channels.joinedChannels) {
        if (isImportantToChannel(fromChar, channel))
            return true;
    }

    return false;
}

export async function shouldFilterPrivate(fromChar: Character.Character, originalMessage?: Message): Promise<boolean> {
    const cachedProfile = core.cache.profileCache.getSync(fromChar.name) || await core.cache.profileCache.get(fromChar.name);
    const firstTime = cachedProfile && !cachedProfile.match.autoResponded;

    if (
        !globallyImportant(fromChar) &&
        cachedProfile?.match.isFiltered &&
        core.state.settings.risingFilter.autoReply &&
        !cachedProfile.match.autoResponded
    ) {
        cachedProfile.match.autoResponded = true;

        await Conversation.conversationThroat(
            async() => {
                log.debug('filter.autoresponse', { name: fromChar.name });

                await Conversation.testPostDelay();

                // tslint:disable-next-line:prefer-template
                const message = {
                    recipient: fromChar.name,
                    message: '\n[sub][color=orange][b][AUTOMATED MESSAGE][/b][/color][/sub]\n' +
                      'Sorry, the player of this character is not interested in characters matching your profile.' +
                      `${core.state.settings.risingFilter.hidePrivateMessages ? ' They did not see your message. To bypass this warning, send your message again.' : ''}\n` +
                      '\n' +
                      ''
                };

                core.connection.send('PRI', message);
                core.cache.markLastPostTime();

                if (core.state.settings.logMessages) {
                    const logMessage = createMessage(Interfaces.Message.Type.Message, core.characters.ownCharacter,
                        message.message, new Date());

                    await withNeutralVisibilityPrivateConversation(
                      fromChar,
                      async(p) => {
                        // core.logs.logMessage(p, logMessage)
                        await p.addMessage(logMessage);
                      }
                    );
                }
            }
        );
    }

    if (
        !globallyImportant(fromChar) &&
        cachedProfile?.match.isFiltered &&
        core.state.settings.risingFilter.hidePrivateMessages &&
        firstTime // subsequent messages bypass this filter on purpose
    ) {
        if (core.state.settings.logMessages && originalMessage) {
            await withNeutralVisibilityPrivateConversation(
              fromChar,
              async p => core.logs.logMessage(p, originalMessage)
            );
        }

        return true;
    }

    return false;
}

/**
 * Determine if we need to filter this (site-moderated) channel
 * @param conv Conversation to test for smart filtering
 * @returns True if the channel will be filtered
 */
function filterPubChannels(conv: ChannelConversation): boolean {
    return core.state.settings.risingFilter.hidePublicChannelMessages
        && isChannel(conv)
        && conv.channel.owner === '';
}

/**
 * Determine if we need to filter this (user-moderated) channel
 * @param conv Conversation to test for smart filtering
 * @returns True if the channel will be filtered
 */
function filterPrivChannels(conv: ChannelConversation): boolean {
    return core.state.settings.risingFilter.hidePrivateChannelMessages
        && isChannel(conv)
        && conv.channel.owner !== '';
}

async function testSmartFilterForChannel(fromChar: Character.Character, conversation: ChannelConversation): Promise<boolean> {
    if (filterPubChannels(conversation) || filterPrivChannels(conversation)) {
        const storedProfile = await core.cache.profileCache.get(fromChar.name);

        if (storedProfile?.match.isFiltered && !isImportantToChannel(fromChar, conversation.channel)) {
            return true;
        }
    }

    return false;
}

export default function(this: any): Interfaces.State {
    state = new State();
    window.addEventListener('focus', () => {
        state.windowFocused = true;
        if(state.selectedConversation !== undefined!) state.selectedConversation.unread = Interfaces.UnreadState.None;
    });
    window.addEventListener('blur', () => {
        state.windowFocused = false;
        if(state.selectedConversation !== undefined!)
             state.selectedConversation.lastRead = state.selectedConversation.messages[state.selectedConversation.messages.length - 1];
    });
    const connection = core.connection;
    connection.onEvent('connecting', async(isReconnect) => {
        // We always have to clear the note structures.
        state.privateConversations.forEach(pm => pm.notes.uninit());

        state.channelConversations = [];
        state.channelMap = {};
        if(!isReconnect) {
            state.activityTab = new ActivityConversation();
            state.consoleTab = new ConsoleConversation();
            state.privateConversations = [];
            state.privateMap = {};
        } else state.consoleTab.unread = Interfaces.UnreadState.None;
        state.selectedConversation = core.state.generalSettings.defaultToHome
            ? state.activityTab
            : state.consoleTab;
        EventBus.$emit('select-conversation', { conversation: state.selectedConversation });
        await state.reloadSettings();
    });
    connection.onEvent('connected', (isReconnect) => {
        if(isReconnect) return;
        for(const item of state.pinned.private) state.getPrivate(core.characters.get(item));
        queuedJoin(state.pinned.channels.slice());
    });
    core.channels.onEvent(async(type, channel, member) => {
        if(type === 'join')
            if(member === undefined) {
                const conv = new ChannelConversation(channel);
                state.channelMap[channel.id] = conv;
                state.channelConversations.push(conv);
                const index = state.recentChannels.findIndex((c) => c.channel === channel.id);
                if(index !== -1) state.recentChannels.splice(index, 1);
                if(state.recentChannels.length >= 50) state.recentChannels.pop();
                state.recentChannels.unshift({channel: channel.id, name: conv.channel.name});
                core.settingsStore.set('recentChannels', state.recentChannels); //tslint:disable-line:no-floating-promises

                AdManager.onNewChannelAvailable(conv);
            } else {
                const conv = state.channelMap[channel.id];
                if(conv === undefined) return;
                if(conv.settings.joinMessages === Interfaces.Setting.False || conv.settings.joinMessages === Interfaces.Setting.Default &&
                    !core.state.settings.joinMessages) return;
                const text = l('events.channelJoin', `[user]${member.character.name}[/user]`);
                await conv.addMessage(new EventMessage(text));
            }
        else if(member === undefined) {
            const conv = state.channelMap[channel.id];
            if(conv === undefined) return;
            state.channelConversations.splice(state.channelConversations.indexOf(conv), 1);
            delete state.channelMap[channel.id];
            await state.savePinned();
            if(state.selectedConversation === conv) state.show(state.consoleTab);
        } else {
            const conv = state.channelMap[channel.id];
            if(conv === undefined) return;
            if(conv.settings.joinMessages === Interfaces.Setting.False || conv.settings.joinMessages === Interfaces.Setting.Default &&
                !core.state.settings.joinMessages) return;
            const text = l('events.channelLeave', `[user]${member.character.name}[/user]`);
            await conv.addMessage(new EventMessage(text));
        }
    });
    connection.onMessage('PRI', async(data, time) => {
        //state.activityTab.parse({ e: 'PRI', data, time });

        const char = core.characters.get(data.character);
        if(char.isIgnored) return connection.send('IGN', {action: 'notify', character: data.character});
        const message = createMessage(MessageType.Message, char, decodeHTML(data.message), time);

        if (await shouldFilterPrivate(char, message) === true) {
            return;
        }

        // This was never implemented, but it might be a worthwhile entry point.
        // It only ever had a hook in cache-manager.
        // EventBus.$emit('private-message', { message });

        const conv = state.getPrivate(char);
        await conv.addMessage(message);
    });
    connection.onMessage('MSG', async(data, time) => {
        // channel message... this DEFINITELY needs to be moved further down.
        //state.activityTab.parse({ e: 'MSG', data, time });

        const char = core.characters.get(data.character);
        if (char.isIgnored)
            return;

        const conversation = state.channelMap[data.channel.toLowerCase()];
        if (!conversation)
            return core.channels.leave(data.channel);

        if (await testSmartFilterForChannel(char, conversation))
            return;

        const message = createMessage(MessageType.Message, char, decodeHTML(data.message), time);
        await conversation.addMessage(message);
        EventBus.$emit('channel-message', { message, channel: conversation });

        const shouldNotifyOnFriendMessage = () => {
            if (!conversation)
                return false;

            return (conversation.settings.notifyOnFriendMessage === Relation.Chooser.Friends   ||
                    conversation.settings.notifyOnFriendMessage === Relation.Chooser.Both      )
                || (conversation.settings.notifyOnFriendMessage === Relation.Chooser.Default   &&
                    core.state.settings.notifyOnFriendMessage   === Relation.Chooser.Friends   ||
                    core.state.settings.notifyOnFriendMessage   === Relation.Chooser.Both      )
        }

        const shouldNotifyOnBookmarkMessage = () => {
            if (!conversation)
                return false;

            return ( conversation.settings.notifyOnFriendMessage === Relation.Chooser.Bookmarks ||
                     conversation.settings.notifyOnFriendMessage === Relation.Chooser.Both    )
                || ( conversation.settings.notifyOnFriendMessage === Relation.Chooser.Default   &&
                     core.state.settings.notifyOnFriendMessage   === Relation.Chooser.Bookmarks ||
                     core.state.settings.notifyOnFriendMessage   === Relation.Chooser.Both    )
        }

        const hilite_words = conversation.settings.highlightWords.slice();
        if (conversation.settings.defaultHighlights)
            hilite_words.push(...core.state.settings.highlightWords);

        if ((conversation.settings.highlight === Interfaces.Setting.Default && core.state.settings.highlight)
        ||  conversation.settings.highlight === Interfaces.Setting.True) {
            hilite_words.push(core.connection.character);
        }

        const words = hilite_words
            .map(e => e.replace(/[^\w]/gi, '\\$&'));
        const names = conversation.settings.highlightUsernames
            .map(e => e.replace(/[^\w]/gi, '\\$&'));

        const msg_results  = words.length > 0
                ? message.text.match(new RegExp(`\\b(${words.join('|')})\\b`, 'i'))
                : null;
        const name_results = names.length > 0
                ? data.character.match(new RegExp(`^(${names.join('|')})$`, 'i'))
                : null;

        let msg = null;

        if (name_results) {
            msg = {
                notify: l('chat.highlight.user', conversation.name),
                event: l('events.highlight.user', `[user]${data.character}[/user]`, `[session=${conversation.name}]${data.channel}[/session]`, message.text),
            }
        }
        else if (msg_results) {
            msg = {
                notify: l('chat.highlight', msg_results[0], conversation.name, message.text.length > 25 ? message.text.slice(0, 25).trim() + '...' : message.text),
                event: l('events.highlight', `[user]${data.character}[/user]`, msg_results[0], `[session=${conversation.name}]${data.channel}[/session]`),
            }
        };

        if (msg) {
            await core.notifications.notify(conversation, data.character, msg.notify, core.characters.getImage(data.character), 'attention');

            if (conversation !== state.selectedConversation || !state.windowFocused)
                conversation.unread = Interfaces.UnreadState.Mention;

            message.isHighlight = true;

            await state.consoleTab.addMessage(new EventMessage(msg.event, time));
        }
        else if (conversation.settings.notify === Interfaces.Setting.True
        || (shouldNotifyOnFriendMessage()   && core.characters.get(data.character.toLowerCase()).isFriend)
        || (shouldNotifyOnBookmarkMessage() && core.characters.get(data.character.toLowerCase()).isBookmarked)) {
            await core.notifications.notify(conversation, conversation.name, messageToString(message),
                core.characters.getImage(data.character), 'attention');

            if (conversation !== state.selectedConversation || !state.windowFocused)
                conversation.unread = Interfaces.UnreadState.Mention;
        }
    });
    connection.onMessage('LRP', async(data, time) => {
        const conv = state.channelMap[data.channel.toLowerCase()];
        if (!conv)
            return core.channels.leave(data.channel);

        const char = core.characters.get(data.character);
        if (char.isIgnored || core.state.hiddenUsers.includes(char.name))
            return;

        const msg = new Message(MessageType.Ad, char, decodeHTML(data.message), time);

        const selected = core.conversations.selectedConversation === conv;
        const p = await core.cache.resolvePScore(!selected, char, conv, msg);

        EventBus.$emit('channel-ad', { message: msg, channel: conv, profile: p });

        await conv.addMessage(msg);
    });
    connection.onMessage('RLL', async(data, time) => {
        const sender = core.characters.get(data.character);
        let text: string;
        if(data.type === 'bottle')
            text = l('chat.bottle', `[user]${data.target}[/user]`);
        else {
            const results = data.results.length > 1 ? `${data.results.join('+')} = ${data.endresult}` : data.endresult.toString();
            text = l('chat.roll', data.rolls.join('+'), results);
        }
        const message = new Message(MessageType.Roll, sender, text, time);
        if('channel' in data) {
            const channel = (<{channel: string}>data).channel.toLowerCase();
            const conversation = state.channelMap[channel];
            if(conversation === undefined) return core.channels.leave(channel);
            if(sender.isIgnored) return;
            if(data.type === 'bottle' && data.target === core.connection.character) {
                await core.notifications.notify(conversation, conversation.name, messageToString(message),
                    core.characters.getImage(data.character), 'attention');
                if(conversation !== state.selectedConversation || !state.windowFocused)
                    conversation.unread = Interfaces.UnreadState.Mention;
                message.isHighlight = true;
            }
            await conversation.addMessage(message);
        } else {
            if(sender.isIgnored) return;
            const char = core.characters.get(
                data.character === connection.character ? (<{recipient: string}>data).recipient : data.character);
            if(char.isIgnored) return connection.send('IGN', {action: 'notify', character: data.character});
            const conversation = state.getPrivate(char);
            await conversation.addMessage(message);
        }
    });
    connection.onMessage('NLN', async(data, time) => {
        const c = core.characters.get(data.identity);
        const interesting = isOfInterest(c);
        if (interesting) {
            const message = new EventMessage(l('events.login', `[user]${data.identity}[/user]`), time);
            await addEventMessage(message);

            const should_notify = shouldNotifyOnFriendLogin()   && c.isFriend
                               || shouldNotifyOnBookmarkLogin() && c.isBookmarked;
            if (should_notify) {
                await core.notifications.notify(state.consoleTab, data.identity, l('events.login', data.identity), core.characters.getImage(data.identity), 'silence');
            }
        }

        const conv = state.privateMap[data.identity.toLowerCase()];
        const relevant = (!core.state.settings.eventMessages || conv !== state.selectedConversation);
        if (conv && relevant) {
            const message = new EventMessage(l('events.login', `[user]${data.identity}[/user]`), time);
            await conv.addMessage(message);
        }
    });
    connection.onMessage('FLN', async(data, time) => {
        const interesting = isOfInterest(core.characters.get(data.character));
        if (interesting) {
            const message = new EventMessage(l('events.logout', `[user]${data.character}[/user]`), time);
            await addEventMessage(message);
        }

        const conv = state.privateMap[data.character.toLowerCase()];
        if (conv) {
            conv.typingStatus = 'clear';

            if (!core.state.settings.eventMessages || conv !== state.selectedConversation) {
                const message = new EventMessage(l('events.logout', `[user]${data.character}[/user]`), time);
                await conv.addMessage(message);
            }
        }
    });
    connection.onMessage('TPN', (data) => {
        const conv = state.privateMap[data.character.toLowerCase()];
        if (conv) {
            conv.typingStatus = data.status;
        }
        else if (data.status === 'typing' && core.state.settings.risingAdScore && !core.cache.profileCache.getSync(data.character)) {
            core.cache.addProfile(data.character.toLowerCase());
        }
    });
    connection.onMessage('CBU', async(data, time) => {
        const conv = state.channelMap[data.channel.toLowerCase()];
        if (!conv)
            return core.channels.leave(data.channel);

        const text = l('events.ban', conv.name, data.character, data.operator);
        conv.infoText = text;
        return addEventMessage(new EventMessage(text, time));
    });
    connection.onMessage('CKU', async(data, time) => {
        const conv = state.channelMap[data.channel.toLowerCase()];
        if (!conv)
            return core.channels.leave(data.channel);

        const text = l('events.kick', conv.name, data.character, data.operator);
        conv.infoText = text;
        return addEventMessage(new EventMessage(text, time));
    });
    connection.onMessage('CTU', async(data, time) => {
        const conv = state.channelMap[data.channel.toLowerCase()];
        if (!conv)
            return core.channels.leave(data.channel);

        const text = l('events.timeout', conv.name, data.character, data.operator, data.length.toString());
        conv.infoText = text;
        return addEventMessage(new EventMessage(text, time));
    });
    connection.onMessage('BRO', async(data, time) => {
        if(data.character !== undefined) {
            log.error('devtools.debug.BRO', {
                sender: data.character,
                msg:    data.message,
                time,
            });

            const content = decodeHTML(data.message.substring(data.character.length + 24));
            const char = core.characters.get(data.character);
            const message = new BroadcastMessage(l('events.broadcast', `[user]${data.character}[/user]`, content), char, time);

            //state.activityTab.parse({ e: 'BRO', data, time, message });
            await state.consoleTab.addMessage(message);

            await core.notifications.notify(state.consoleTab, l('events.broadcast.notification', data.character), content, core.characters.getImage(data.character), 'attention');

            for (const conv of state.channelConversations)
                await conv.addMessage(message);

            if (core.state.settings.showBroadcastsInPMs) {
                for (const conv of state.privateConversations)
                    await conv.addMessage(message);
            }
        }
        else {
            const message = new EventMessage(decodeHTML(data.message), time)
            //state.activityTab.parse({ e: 'BRO', data, time, message });
            return addEventMessage(message);
        }
    });
    connection.onMessage('CIU', async(data, time) => {
        //state.activityTab.parse({ e: 'CIU', data, time });

        const text = l('events.invite', `[user]${data.sender}[/user]`, `[session=${data.title}]${data.name}[/session]`);
        return addEventMessage(new EventMessage(text, time));
    });
    connection.onMessage('ERR', async(data, time) => {
        state.selectedConversation.errorText = data.message;
        return addEventMessage(new EventMessage(`[color=red]${l('events.error', data.message)}[/color]`, time));
    });

    connection.onMessage('IGN', async(data, time) => {
        if (data.action !== 'add' && data.action !== 'delete')
            return;

        const text = l(`events.ignore_${data.action}`, data.character);
        state.selectedConversation.infoText = text;
        return addEventMessage(new EventMessage(text, time));
    });
    connection.onMessage('RTB', async(data, time) => {
        //state.activityTab.parse({ e: 'RTB', data, time });

        logRTB.warn(`conversations.RTB.${data.type}`, { data, time });

        if (process.env.NODE_ENV === 'development') {
            const debug_string = Object.entries(data)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');

            await addEventMessage(new EventMessage(debug_string, time));
        }

        let url = 'https://www.f-list.net/';
        let text: string, character: string;

        if (data.type === 'comment') {
            switch(data.target_type) {
                case 'newspost':
                    url += `newspost/${data.target_id}/#Comment${data.id}`;
                    break;
                case 'bugreport':
                    url += `view_bugreport.php?id=${data.target_id}/#${data.id}`;
                    break;
                case 'changelog':
                    url += `log.php?id=${data.target_id}/#${data.id}`;
                    break;
                case 'feature':
                    url += `vote.php?id=${data.target_id}/#${data.id}`;
            }

            const key = data.parent_id
                ? 'events.rtbCommentReply'
                : 'events.rtbComment';

            text = l(key, `[user]${data.name}[/user]`, l(`events.rtbComment_${data.target_type}`), `[url=${url}]${data.target}[/url]`);

            character = data.name;
        }
        else if (data.type === 'note') {
            void core.siteSession.interfaces.notes.updateUnread();

            const convo = state.byKey(data.sender) as PrivateConversation | undefined;

            logNotes.debug('RTB.note.convo', { key: convo?.key, init: convo?.notes.initialized});

            if (convo?.notes.initialized) { // if not, when opening a PM it will be.
                core.siteSession.interfaces.notes.getLatestFrom(data.sender)
                    .then(res => convo.notes.add(res))
                    .catch(() => undefined);
            }

            text = l('events.rtb_note', `[user]${data.sender}[/user]`, `[url=${url}view_note.php?note_id=${data.id}]${data.subject}[/url]`);
            character = data.sender;

            await core.notifications.notify(state.consoleTab, character, text, core.characters.getImage(character), 'newnote');
        } else if(data.type === 'friendrequest') {
            core.siteSession.interfaces.noteChecker.incrementMessages();
            text = l(`events.rtb_friendrequest`, `[user]${data.name}[/user]`);
            character = data.name;
        } else {
            switch(data.type) {
                case 'grouprequest':
                    url += 'panel/group_requests.php';
                    break;
                case 'bugreport':
                    url += `view_bugreport.php?id=${data.id}`;
                    break;
                case 'helpdeskticket':
                    url += `view_ticket.php?id=${data.id}`;
                    break;
                case 'helpdeskreply':
                    url += `view_ticket.php?id=${data.id}`;
                    break;
                case 'featurerequest':
                    url += `vote.php?fid=${data.id}`;
                    break;
                default: //TODO
                    return;
            }
            text = l(`events.rtb_${data.type}`, `[user]${data.name}[/user]`,
                data.title !== undefined ? `[url=${url}]${data.title}[/url]` : url);
            character = data.name;
        }
        await addEventMessage(new EventMessage(text, time));
    });
    const sfcList: Interfaces.SFCMessage[] = [];
    connection.onMessage('SFC', async(data, time) => {
        let text: string, message: Interfaces.Message;
        if(data.action === 'report') {
            text = l('events.report', `[user]${data.character}[/user]`, decodeHTML(data.tab), decodeHTML(data.report));
            if(!data.old)
                await core.notifications.notify(state.consoleTab, data.character, text, core.characters.getImage(data.character), 'modalert');
            message = new EventMessage(text, time);
            safeAddMessage(sfcList, message, 500);
            (<Interfaces.SFCMessage>message).sfc = data;
        } else {
            text = l('events.report.confirmed', `[user]${data.moderator}[/user]`, `[user]${data.character}[/user]`);
            for (const item of sfcList) {
                if(item.sfc.logid === data.logid) {
                    item.sfc.confirmed = true;
                    break;
                }
            }
            message = new EventMessage(text, time);
        }
        return addEventMessage(message);
    });
    connection.onMessage('STA', async(data, time) => {
        const char = core.characters.get(data.character);
        const isSelf = data.character === core.connection.character;

        if (!isOfInterest(char))
            return;

        const l_msg: string[] = [];
        let key: string;

        if (isSelf) {
            key = data.statusmsg ? 'events.status.ownMessage' : 'events.status.own';
            l_msg.push(
                l(`status.${data.status}`),
                decodeHTML(data.statusmsg)
            );
        }
        else {
            key = data.statusmsg ? 'events.status.message' : 'events.status',
            l_msg.push(
                `[user]${data.character}[/user]`,
                l(`status.${data.status}`),
                decodeHTML(data.statusmsg)
            );
        }

        const text = l(key, ...l_msg);
        const message = new EventMessage(text, time);
        await addEventMessage(message);

        if (!isSelf) {
            const conv = state.privateMap[data.character.toLowerCase()];
            if (conv && (!core.state.settings.eventMessages || conv !== state.selectedConversation))
                await conv.addMessage(message);
        }
    });
    connection.onMessage('SYS', async(data, time) => {
        state.selectedConversation.infoText = data.message;
        return addEventMessage(new EventMessage(data.message, time));
    });
    connection.onMessage('UPT', async(data, time) =>
        addEventMessage(new EventMessage(
                            l('events.uptime',
                                data.startstring,
                                data.channels.toString(),
                                data.users.toString(),
                                data.accepted.toString(),
                                data.maxusers.toString()
                            ),
                            time,
                       ))
    );
    connection.onMessage('ZZZ', async(data, time) => {
        state.selectedConversation.infoText = data.message;
        return addEventMessage(new EventMessage(data.message, time));
    });
    return state;
}
