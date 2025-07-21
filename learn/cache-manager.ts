import * as _ from 'lodash';
import core from '../chat/core';
import { ChannelAdEvent, ChannelMessageEvent, CharacterDataEvent, EventBus, SelectConversationEvent } from '../chat/preview/event-bus';
import { Conversation } from '../chat/interfaces';
import { methods } from '../site/character_page/data_store';
import { Character as ComplexCharacter } from '../site/character_page/interfaces';
import { AdCache } from './ad-cache';
import { ChannelConversationCache } from './channel-conversation-cache';
import { CharacterProfiler } from './character-profiler';
import { CharacterCacheRecord, ProfileCache } from './profile-cache';
import ChannelConversation = Conversation.ChannelConversation;
import Message = Conversation.Message;
import { Character as ChatCharacter } from '../fchat/interfaces';
import ChatMessage = Conversation.ChatMessage;
import { GeneralSettings } from '../electron/common';
import { Gender } from './matcher-types';
import { WorkerStore } from './store/worker';
import { PermanentIndexedStore } from './store/types';
import * as path from 'path';
import { lastElement } from '../helpers/utils';
// import * as electron from 'electron';

import Logger from 'electron-log/renderer';
const log = Logger.scope('cache-manager');

import { shouldFilterPrivate } from '../chat/conversations'; //tslint:disable-line:match-default-export-name


export interface ProfileCacheQueueEntry {
    name: string;
    key: string;
    added: Date;
    gender?: Gender;
    score: number;
    channelId?: string;
    retryCount: number;
}


export class CacheManager {
    // @ts-ignore
    private _isVue = true;

    private readonly startTime = new Date();

    static readonly PROFILE_QUERY_DELAY = 400; //1 * 1000;

    adCache: AdCache = new AdCache();
    profileCache: ProfileCache = new ProfileCache();
    channelConversationCache: ChannelConversationCache = new ChannelConversationCache();

    protected queue: ProfileCacheQueueEntry[] = [];

    protected profileTimer: NodeJS.Timeout | null = null;
    protected characterProfiler: CharacterProfiler | undefined;

    protected profileStore?: PermanentIndexedStore;

    protected lastPost: Date = new Date();

    protected lastFetch = Date.now();

    protected fetchLog: Record<string, number> = {};
    protected ongoingLog: Record<string, true> = {};

    protected isActiveTab = true;

    setTabActive(isActive: boolean): void {
      this.isActiveTab = isActive;

      if (this.isActiveTab) {
        void this.onSelectConversation({ conversation: core.conversations.selectedConversation });
      } else {
        void this.onSelectConversation({ conversation: null! });
      }
    }

    markLastPostTime(): void {
        this.lastPost = new Date();
    }

    getLastPost(): Date {
        return this.lastPost;
    }

    async queueForFetching(name: string, skipCacheCheck: boolean = false, channelId?: string): Promise<void> {
        if (!core.state.settings.risingAdScore) {
            return;
        }

        log.debug('profile.cache.queue', { name, skipCacheCheck, channelId, from: core.characters.ownCharacter.name });

        if (!skipCacheCheck) {
            const c = await this.profileCache.get(name);

            if (c) {
                this.updateAdScoringForProfile(c.character, c.match.matchScore, c.match.isFiltered);
                return;
            }
        }

        const key = ProfileCache.nameKey(name);

        if (!!_.find(this.queue, (q: ProfileCacheQueueEntry) => (q.key === key)))
            return;

        const entry: ProfileCacheQueueEntry = {
            name,
            key,
            channelId,
            added: new Date(),
            score: 0,
            retryCount: 0
        };

        this.queue.push(entry);

        // console.log('Added to queue', entry.name, entry.added.toISOString());
        // console.log('AddProfileForFetching', name, this.queue.length);
    }


    async fetchProfile(name: string): Promise<ComplexCharacter | null> {
        try {
            await methods.fieldsGet();

            const c = await methods.characterData(name, -1, true);
            const r = await this.profileCache.register(c);

            this.updateAdScoringForProfile(c, r.match.matchScore, r.match.isFiltered);

            return c;
        } catch (err) {
            console.error('Failed to fetch profile for cache', name, err);

            return null;
        }
    }


    updateAdScoringForProfile(c: ComplexCharacter, score: number, isFiltered: boolean): void {
        EventBus.$emit('character-score', { profile: c, score, isFiltered });

        this.scoreAllConversations(c.character.name, score, isFiltered);
        void this.respondToPendingRejections(c);
    }

    // Manage rejections in case we didn't have a score at the time we received the message
    async respondToPendingRejections(c: ComplexCharacter): Promise<void> {
      const char = core.characters.get(c.character.name);

      if (char && char.status !== 'offline') {
        const conv = core.conversations.getPrivate(char, true);

        if (conv && conv.messages.length > 0 && Date.now() - lastElement(conv.messages).time.getTime() < 5 * 60 * 1000) {
          const sessionMessages = conv.messages.filter(m => m.time.getTime() >= this.startTime.getTime());

          const allMessagesFromThem = sessionMessages
                // Update to `Object.hasOwn(m, 'sender')` once typescript stops being shit.
                .every(m => ('sender' in m) && m.sender.name === conv.character.name);

          if (sessionMessages.length > 0 && allMessagesFromThem) {
            await shouldFilterPrivate(char);
          }
        }
      }
    }

    async addProfile(character: string | ComplexCharacter): Promise<void> {
        if (typeof character === 'string') {
            log.silly('Learn discover', character);

            await this.queueForFetching(character);
            return;
        }

        await this.profileCache.register(character);
    }


    /*
     * Preference in order (plan):
     *   + has messaged me
     *   + bookmarked / friend
     *
     *   + genders I like
     *   + looking
     *   + online
     *
     *   - busy
     *   - DND
     *   - away
     */
    consumeNextInQueue(): ProfileCacheQueueEntry | null {
        if (this.queue.length === 0) {
            return null;
        }

        // re-score
        this.queue.forEach((e: ProfileCacheQueueEntry) => e.score = this.calculateScore(e));

        this.queue = _.sortBy(this.queue, 'score');

        log.debug('QUEUE', _.map(this.queue, (q) => `${q.name}: ${q.score}`));

        const entry = this.queue.pop() as ProfileCacheQueueEntry;

        if (entry) {
          // just in case - remove duplicates
          this.queue = this.queue.filter(q => q.name !== entry.name);
        }

        log.debug('PopFromQueue', entry.name, this.queue.length);

        return entry;
    }

    calculateScore(e: ProfileCacheQueueEntry): number {
        return this.characterProfiler ? this.characterProfiler.calculateInterestScoreForQueueEntry(e) : 0;
    }

    private on_character_data = async(data: CharacterDataEvent) => {
      // this promise is intentionally NOT chained
      // tslint:disable-next-line: no-floating-promises
      this.onCharacterData(data);
    }
    private on_channel_message = async(data: ChannelMessageEvent) => {
      // this promise is intentionally NOT chained
      // tslint:disable-next-line: no-floating-promises
      this.onChannelMessage(data);
    };
    private on_channel_ad = async(data: ChannelAdEvent) => {
      // this promise is intentionally NOT chained
      // tslint:disable-next-line: no-floating-promises
      this.onChannelAd(data);
    };
    private on_select_conversation = async(data: SelectConversationEvent) => {
      // this promise is intentionally NOT chained
      // tslint:disable-next-line: no-floating-promises
      this.onSelectConversation(data);
    };
    private on_conversation_load_more = async(data: SelectConversationEvent) => {
      // this promise is intentionally NOT chained
      // tslint:disable-next-line: no-floating-promises
      this.onLoadMoreConversation(data);
    };

    async start(settings: GeneralSettings, skipFlush: boolean): Promise<void> {
        await this.stop();

        this.profileStore = await WorkerStore.open(
          path.join(/*electron.remote.app.getAppPath(),*/ 'storeWorkerEndpoint.js')
        ); // await IndexedStore.open();

        this.profileCache.setStore(this.profileStore);

        if (!skipFlush) {
          await this.profileStore.flushProfiles(settings.risingCacheExpiryDays);
        }

        EventBus.$on('character-data',          this.on_character_data);
        EventBus.$on('channel-message',         this.on_channel_message);
        EventBus.$on('channel-ad',              this.on_channel_ad);
        EventBus.$on('select-conversation',     this.on_select_conversation);
        EventBus.$on('conversation-load-more',  this.on_conversation_load_more);
        // EventBus.$on('private-message', (data: PrivateMessageEvent) => {}); // Never used.


        const scheduleNextFetch = () => {
            this.profileTimer = setTimeout(
                async() => {
                    // const d = Date.now();
                    const next = this.consumeNextInQueue();

                    if (next) {
                        // console.log('Next in queue', next.name, (Date.now() - d) / 1000.0);

                        try {
                            let skipFetch = false;

                            if (
                              (next.name in this.ongoingLog) ||
                              ((next.name in this.fetchLog) && (Date.now() - this.fetchLog[next.name] < 120000))
                            ) {
                              skipFetch = true;
                            }

                            // tslint:disable-next-line: binary-expression-operand-order
                            if ((false) && (next)) {
                              console.log(`Fetch '${next.name}' for channel '${next.channelId}', gap: ${(Date.now() - this.lastFetch)}ms`);
                              this.lastFetch = Date.now();
                            }

                            if (!skipFetch) {
                              this.ongoingLog[next.name] = true;

                              await this.fetchProfile(next.name);

                              this.fetchLog[next.name] = Date.now();
                            }

                            // just in case - remove duplicates
                            this.queue = _.filter(this.queue, (q) => q.name !== next.name);
                            delete this.ongoingLog[next.name];
                        } catch (err) {
                            console.error('Profile queue error', err);

                            delete this.ongoingLog[next.name];

                            next.retryCount += 1;

                            if (next.retryCount < 10) {
                              this.queue.push(next); // return to queue
                            }
                        }

                        // console.log('Completed', next.name, (Date.now() - d) / 1000.0);
                    }

                    scheduleNextFetch();
                },
                CacheManager.PROFILE_QUERY_DELAY
            );
        };

        scheduleNextFetch();
    }


    async onCharacterData(data: CharacterDataEvent): Promise<void> {
      await this.addProfile(data.profile);
    }


    async onChannelMessage(data: ChannelMessageEvent): Promise<void> {
        const message = data.message;
        const channel = data.channel;

        this.channelConversationCache.register(
            {
                name: message.sender.name,
                channelName : channel.name,
                datePosted: message.time,
                message: message.text
            }
        );

        // await this.addProfile(message.sender.name);
    }


    async onChannelAd(data: ChannelAdEvent): Promise<void> {
        const message = data.message;
        const channel = data.channel;

        this.adCache.register({
            name: message.sender.name,
            channelName : channel.name,
            datePosted: message.time,
            message: message.text
        });

        if (!data.profile
        &&  core.conversations.selectedConversation === data.channel
        &&  this.isActiveTab) {
            await this.queueForFetching(message.sender.name, true, data.channel.channel.id);
        }

        // this.addProfile(message.sender.name);
    }


    async onLoadMoreConversation(data: SelectConversationEvent): Promise<void> {
      await this.onSelectConversation(data);
    }


    async onSelectConversation(data: SelectConversationEvent): Promise<void> {
        // Check we are working with a channel conversation.
        const conversation = data.conversation;
        const channel = (conversation as ChannelConversation | null)?.channel;
        const channelId = channel?.id ?? '<missing>';

        // Remove unfinished fetches related to other channels
        this.queue = this.queue.filter(q => q.channelId === channelId);

        if (!channel)
            return;

        const checkedNames: Record<string, boolean> = {};

        // Add fetchers for unknown profiles in ads
        await Promise.all(conversation!.messages
                .filter(m => {
                    if (m.type !== Message.Type.Ad)
                        return false;

                    if (m.sender.name in checkedNames)
                        return false;

                    checkedNames[m.sender.name] = true;
                    return true;
                })
                .map(async m => {
                    // m must be ChatMessage because `m.type === Ad`.
                    const chatMessage = m as ChatMessage;

                    if (chatMessage.score)
                        return;

                    const p = await this.resolvePScore(false, chatMessage.sender, conversation as ChannelConversation, chatMessage, true);

                    if (!p)
                        await this.queueForFetching(chatMessage.sender.name, true, channel.id);
                })
        );
    }


    async resolvePScore(skipStore: boolean,
                        char: ChatCharacter,
                        conv: ChannelConversation,
                        msg?: Message,
                        populateAll: boolean = true
                       ): Promise<CharacterCacheRecord | undefined> {
      if (!core.characters.ownProfile)
          return undefined;

      // this is done here so that the message will be rendered correctly when cache is hit
      let p = await core.cache.profileCache.get(char.name, skipStore, conv.channel.name) ?? undefined;

      if (p && msg) {
          msg.score = p.match.matchScore;
          msg.filterMatch = p.match.isFiltered;

          if (populateAll) this.scoreAllConversations(char.name, p.match.matchScore, p.match.isFiltered);
      }

      // Undefined return is legacy code and should be updated to just use null.
      return p;
    }

    // private normalAction(msg: Message): msg is ChatMessage {
    //     return msg.type !== Message.Type.Event // No `sender`.
    //         && msg.type !== Message.Type.Ad    // Already handled.
    //         && msg.type !== Message.Type.Bcast // Do not decorate broadcasts.
    //         && msg.type !== Message.Type.Warn;  // Do not decorate warnings.
    // }


    // tslint:disable-next-line: prefer-function-over-method
    public scoreAllConversations(characterName: string, score: number, isFiltered: boolean): void {
        // Actually none of this seems to change anything with ads or messages.
        core.conversations.channelConversations.forEach(ch => {
            ch.messages.forEach(m => {
                if (m.type === Message.Type.Ad && m.sender.name === characterName) {
                    // console.log('Update score', score, ch.name, m.sender.name, m.text, m.id);

                    m.score = score;
                    m.filterMatch = isFiltered;
                }
                // This is called when you reset your settings.
                // else if (this.normalAction(m) && m.sender.name === characterName) {
                //     m.score = score;
                //     m.filterMatch = isFiltered;
                // }
            });
        });
    }


    async stop(): Promise<void> {
        if (this.profileTimer) {
            clearTimeout(this.profileTimer);
            this.profileTimer = null;
        }

        if (this.profileStore) {
            await this.profileStore.stop();
        }

        // should do some $off here?
        EventBus.$off('character-data',         this.on_character_data);
        EventBus.$off('channel-message',        this.on_channel_message);
        EventBus.$off('channel-ad',             this.on_channel_ad);
        EventBus.$off('select-conversation',    this.on_select_conversation);
        EventBus.$off('conversation-load-more', this.on_conversation_load_more);
    }


    setProfile(c: ComplexCharacter): void {
        this.characterProfiler = new CharacterProfiler(c, this.adCache);
    }
}
