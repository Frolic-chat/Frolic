// SPDX-License-Identifier: AGPL-3.0-or-later
import * as Electron from 'electron';
import core from '../chat/core';
import { EventBus } from '../chat/preview/event-bus';
import { AsyncCache } from './cache';

import type { PermanentIndexedStore, CharacterOverridesBatch } from './store/types';
import type { CharacterOverrides } from '../fchat/characters';

import type { Character as ComplexCharacter, CharacterGroup, Guestbook } from '../site/character_page/interfaces';
import type { Character as CharacterPage, CharacterImage, SimpleCharacter } from '../interfaces';
import type { Character } from '../fchat/interfaces';
import { Conversation } from '../chat/interfaces';
import { Matcher, MatchReport } from './matcher';
import { Scoring, CustomGender } from './matcher-types';

import { matchesSmartFilters } from './filter/smart-filter';
import { getAsNumber } from '../helpers/utils';


import NewLogger from '../helpers/log';
const logC = NewLogger('custom-gender', () => core.state.generalSettings.argv.includes('--debug-custom-gender'));
const logCache = NewLogger('cache', () => core.state.generalSettings.argv.includes('--debug-cache'));
const logPhelper = NewLogger('profile-helper', () => core.state.generalSettings.argv.includes('--debug-cache'));


export interface MetaRecord {
    images: CharacterImage[] | null;
    groups: CharacterGroup[] | null;
    friends: SimpleCharacter[] | null;
    guestbook: Guestbook | null;
    lastMetaFetched: Date | null;
}

export interface CountRecord {
    groupCount: number | null;
    friendCount: number | null;
    guestbookCount: number | null;
    lastCounted: number | null;
}

export interface CharacterMatchSummary {
    matchScore: number;
    // dimensionsAtScoreLevel: number;
    // dimensionsAboveScoreLevel: number;
    // totalScoreDimensions: number;
    searchScore: number;
    isFiltered: boolean;
    autoResponded?: boolean;
}

/**
 * The "cache record" holds information about when the character was added to the cache. This information can be useful for deciding when to refresh a character profile or to remove them entirely.
 */
export interface CharacterCacheRecord {
    character: ComplexCharacter;
    lastFetched: Date;
    added: Date;
    // counts?: CountRecord;
    match: CharacterMatchSummary;
    meta?: MetaRecord;
}

const validInlineTags = [ 'hqp', 'fcg' ] as const;
export type InlineTagProtocol = typeof validInlineTags[number];

export interface InlineTag {
    type: InlineTagProtocol;
    value: string;
}

export class ProfileCache extends AsyncCache<CharacterCacheRecord> {
    constructor() {
        super();
        EventBus.$on('friend-list',        l => this.setFriendCount(l.length));
        EventBus.$on('bookmark-list',      l => this.setBookmarkCount(l.length));
        EventBus.$on('settings-from-main', s => this.setSettingsCount(s.profileCacheEntries));
        // Trigger on PM open/close, channel join/leave; remove from recalc when you do.

        logCache.debug('ProfileCache.constructor', this.MAX_CACHE_SIZE);
    }
    protected store?: PermanentIndexedStore;

    MAX_CACHE_SIZE = 50;
    protected readonly MAX_CACHE_BUFFER    = 100; // buffer bad decisions
    protected          friend_cache_size   =  10; // heuristic
    protected          bookmark_cache_size = 100; // heuristic
    protected          channel_cache_size  = 300; // heuristic
    protected          user_cache_size     = 500; // default

    protected recalcCacheSize() {
        // Move update check out once we actually check for channel/pm updates.
        // - PM open/close
        // - Channel join/leave
        // - Channel mode change? Happen often enough to matter?
        this.setChannelCount([ ...core.conversations.channelConversations, ...core.conversations.privateConversations ]);

        this.MAX_CACHE_SIZE = this.MAX_CACHE_BUFFER + this.friend_cache_size + this.bookmark_cache_size + this.channel_cache_size + this.user_cache_size;

        logCache.debug('ProfileCache.recalcCacheSize', this.MAX_CACHE_SIZE);
    }

    protected setFriendCount(n: number) {
        if (n >= 0) this.friend_cache_size = n;
        else        this.friend_cache_size = 0;

        this.recalcCacheSize();
    }

    protected setBookmarkCount(n: number) {
        if (n >= 0) this.bookmark_cache_size = n;
        else        this.bookmark_cache_size = 0;

        this.recalcCacheSize();
    }

    setChannelCount(conversations: Conversation[]) {  // Scale per-channel.
        this.channel_cache_size = conversations.reduce(
            (count, conv) => {
                if (Conversation.isPrivate(conv))
                    return count + 1;

                if (Conversation.isChannel(conv)) {
                    switch (conv.mode) {
                    case 'chat': return count +  40;
                    case 'ads':  return count +  60;
                    case 'both': return count + 100;
                    }
                }

                return count;
            },
            0
        );

        //this.recalcCacheSize();
    }

    protected setSettingsCount(n: number) {
        if (n >= 0) this.user_cache_size = n;
        else        this.user_cache_size = 0;

        this.recalcCacheSize();
    }

    protected lastFetch = Date.now();

    setStore(store: PermanentIndexedStore): void {
        this.store = store;
    }

    onEachInMemory(cb: (c: CharacterCacheRecord, key: string) => void): void {
        // @ts-ignore Webpack TS.
        this.cache.entries().forEach(([k, v]) => cb(v, k));
    }

    /**
     * Query the cache for a player record, returning immediately. Fails with `null` if the character hasn't been cached. Use {@link get | `get` (async)} if you want to reach deeper and get the profile from the disk-backed store and cache it in readily-accessible memory.
     *
     * This method does **NOT** query the server for the character.
     * @param name Character to query the cache for
     * @returns Character profile if it's cached; null otherwise
     */
    // getSync(name: string): CharacterCacheRecord | null;

    /**
     * Asynchronously gets a character from the in-memory cache, or from the PermanentIndexedStore if it's not in memory. Then register it with the matcher (was matcher data not saved before...?).
     *
     * This method does **NOT** query the server for the character.
     *
     * This function could use some adjustment to ensure it always runs async, as "potentially async" is bad control flow design. Please remove this comment line when you do so. :)
     * @param name Character to retrieve
     * @param skipStore Return negative if the character isn't in the cache
     * @param _fromChannel Unused
     * @returns Preferably a character; null if not in cache and `skipStore`; null if profile is not in the store
     */
    async get(name: string, skipStore: boolean = false, _fromChannel?: string): Promise<CharacterCacheRecord | null> {
        const v = super.getSync(AsyncCache.nameKey(name));
        if (v)
            return v;

        if (!this.store || skipStore)
            return null;

        const profile_data = await this.store.getProfile(name);
        if (!profile_data)
            return null;

        const cacheRecord = await this.register(profile_data.profileData, true);

        cacheRecord.lastFetched = new Date(profile_data.lastFetched * 1000);
        cacheRecord.added = new Date(profile_data.firstSeen * 1000);

        cacheRecord.meta = {
            lastMetaFetched: profile_data.lastMetaFetched ? new Date(profile_data.lastMetaFetched * 1000) : null,
            groups: profile_data.groups,
            friends: profile_data.friends,
            images: profile_data.images,
            guestbook: profile_data.guestbook
        };

        /* cacheRecord.counts = {
            lastCounted: pd.lastCounted,
            groupCount: pd.groupCount,
            friendCount: pd.friendCount,
            guestbookCount: pd.guestbookCount
        }; */

        return cacheRecord;
    }


    // async registerCount(name: string, counts: CountRecord): Promise<void> {
    //     const record = await this.get(name);
    //
    //     if (!record) {
    //         // coward's way out
    //         return;
    //     }
    //
    //     record.counts = counts;
    //
    //     if (this.store) {
    //         await this.store.updateProfileCounts(name, counts.guestbookCount, counts.friendCount, counts.groupCount);
    //     }
    // }


    async registerMeta(name: string, meta: MetaRecord): Promise<void> {
        const record = await this.get(name);

        if (!record)
            return; // coward's way out

        record.meta = meta;

        if (this.store) {
            await this.store?.updateProfileMeta(name, meta.images, meta.guestbook, meta.friends, meta.groups);
        }
    }

    /**
     * Returns unparsed results as { type: protocol, value: unsanitizedString }.
     * hqp: [i=hqp://UrlWOutHttps]
     * fcg: [i=fcg://display=The Wind;match=554;mismatch=;v=1]
     * @param description
     * @returns Unsanitized results in tuples.
     */
    static getOverridesFromDescription(description: string): InlineTag[] {
        const query = /\[i=([a-z0-9]+):\/\/([^\]]+)]/gi;
        const results: InlineTag[] = [];

        for (const match of description.matchAll(query)) {
            const [ , type, value ] = match;

            if (validInlineTags.find(tag => type === tag)) {
                results.push({
                    type:  type.toLowerCase() as typeof validInlineTags[number],
                    value: value,
                });
            }
        }

        if (results.some(e => e.type === 'hqp')) {
            logC.verbose('Very cool portrait! From desc:', description.slice(0, 100));
        }
        else {
            const match = description.match(/\[url=([^\]]+)]\s*?Rising\s*?Portrait\s*?\[\/url]/i);

            if (match?.[1].trim())
                results.push({
                    type:  'hqp',
                    value: match[1],
                });
        }

        return results;
    }

    static isSafePortraitURL(url: string): boolean {
        if (url.match(/^https:\/\/(?:static\.f-list\.net|(?:[a-zA-Z0-9\-.]+\.)?(?:imgur\.com|freeimage\.host|iili\.io|redgifs\.com|e621\.net))\//)) {
            return true;
        }
        else {
            return false;
        }
    }

    /**
     *
     * @param value
     * @returns
     */
    static parsePortraitURL(value: string): string {
        if (!core.state.settings.risingShowHighQualityPortraits)
            return '';

        value = value.trim().replace(/^(\w+:\/\/)?/, 'https://');

        return value;
    }

    /**
     * Expects to handle: `display=The Wind;match=554;mismatch=;v=1`
     * @param value
     * @returns
     */
    static parseGenderTag(value: string): Character.CustomGender | null {
        const parts = Object.fromEntries(
            value.split(/\s*;\s*/)
                .map(p => {
                    const i = p.indexOf('=');

                    if (i === -1)
                        return [ '', '' ] as [ string, string ];

                    return [ p.slice(0, i).trim(), p.slice(i+1).trim() ] as [ string, string ];
                })
                .filter(e => e[0] && e[1])
        );

        if (getAsNumber(parts.v) === 1) {
            const valid_genders = Object.values(CustomGender.KinkMap) as number[];

            return {
                string:   parts.display?.slice(0, 21) || '',
                version:  1,
                match:    parts.match?.split(',')
                    .map(e => getAsNumber(e) ?? 0)
                    .filter(n => valid_genders.includes(n))
                        ?? [], // If no 'match' provided
                mismatch: parts.mismatch?.split(',')
                    .map(e => getAsNumber(e) ?? 0)
                    .filter(n => valid_genders.includes(n))
                        ?? [], // If no 'mismatch' provided
            }
        }
        else {
            return null;
        }
    }

    /**
     * Overrides are generated by this function in `ProfileCache.register`, which takes a completed profile and gleans matcher information.
     *
     * Similarly, when you load a profile from the disk-backed store, it's put through `ProfileCache.register`, and this function is run.
     *
     * So when is appropriate to manually load overrides?
     * @param c A character profile - this could easily be reduced to just use the character page
     */
    static updateOverrides(c: CharacterPage): boolean {
        const unparsed = ProfileCache.getOverridesFromDescription(c.description);
        const overrides: CharacterOverrides = {};

        unparsed.forEach(({type, value }) => {
            if (type === 'hqp') {
                const url = ProfileCache.parsePortraitURL(value);

                if (ProfileCache.isSafePortraitURL(url)) { // domain check
                    overrides.avatarUrl = url;

                    if (c.name === core.characters.ownCharacter.name)
                        Electron.ipcRenderer.send('update-avatar-url', c.name, url);

                    logCache.debug('portrait.hq.url', { name: c.name, url: url });
                }
                else {
                    logCache.info('portrait.hq.invalid.domain', {
                        name: c.name,
                        url: url,
                    });
                }
            }
            else if (type === 'fcg') {
                const parsed = ProfileCache.parseGenderTag(value);
                if (parsed) {
                    overrides.gender = parsed;

                    logC.verbose(`${c.name} is ${parsed.string}, which is a very cool gender!`);
                }
            }
        });

        if (Object.keys(overrides).length) {
            ProfileCache.applyOverrides(c.name, overrides);
            return true;
        }

        return false;
    }

    /**
     * Apply overrides to the chat character.
     * @param char Name of character or chat character object
     * @param o Overrides object
     */
    static applyOverrides(char: string | Character, o: CharacterOverrides): void {
        const name = typeof char === 'string' ? char : char.name;

        logC.debug(`Applying overrides to character ${name}.`, o);

        Object.entries(o).forEach(([k, v]) =>
            core.characters.setOverride(name, k as keyof CharacterOverrides, v)
        );
    }

    /**
     * Designed to be run when loading a new chat character into memory, or any other scenario where you know they aren't loaded yet but need them to be. The idea of this method is to load lightweight data in situations where loading a full profile into memory would be wasteful.
     *
     * Do your own checks as to whether or not you actually need to load overrides before running this.
     *
     * Loading a profile already parses overrides from profile data, so this should not be used in that situation.
     * @param name character name
     */
    async getCachedOverrides(name: string): Promise<CharacterOverrides | undefined> {
        const o = await this.store?.getOverrides(name);
        if (!o)
            return;

        const { id, lastFetched, ...rest } = o;
        if (!Object.keys(o).length)
            return;

        logC.debug(`Overrides fetched from store for ${name}`, rest);

        return rest;
    }

    async getBatchOfOverrides(names: string[]): Promise<CharacterOverridesBatch | undefined> {
        const ooo = await this.store?.getOverridesBatch(names);

        if (!ooo || !Object.keys(ooo).length) // no maidens???
            return;

        return ooo;
    }

    static invalidColorCodes(description: string): string | null {
        const matches = [ ...description.matchAll(/\[color=([^\]]+)\]/g) ];

        if (!matches)
            return null;

        /**
         * Color regexes are available in CoreBBCodeParser in bbcode/core.ts.
         * In fact, there's probably a way to reuse those.
         */
        const valid_colors = ['red', 'blue', 'white', 'yellow', 'pink', 'gray', 'green', 'orange', 'purple', 'black', 'brown', 'cyan'];
        const invalid: string[] = [];

        logPhelper.debug('dev.phelper.color.matches', matches);

        for (const match of matches) {
            if (!valid_colors.includes(match[1]) && !invalid.includes(match[1]))
                invalid.push(match[1]);
        }

        return (invalid.length > 0)
            ? invalid.join(', ')
            : null;
    }

    /**
     * Register the profile with the in-memory cache and (by default) the disk-backed store; putting it through the matcher and smart filters in the process.
     * @param c Response from "character profile" API request
     * @param skipStore (Default: false) Don't add the updated character to the store
     * @returns Character with match details
     */
    async register(c: ComplexCharacter, skipStore: boolean = false): Promise<CharacterCacheRecord> {
        const updatedOverrides = ProfileCache.updateOverrides(c.character);

        const [ myOverrides, theirOverrides ] = await Promise.all([
            core.characters.getAsync(core.characters.ownCharacter.name).then(c => c.overrides),
            core.characters.getAsync(c.character.name).then(c => c.overrides),
        ])

        const match = ProfileCache.match(c, myOverrides, theirOverrides);
        let score = (!match || match.score === null) ? Scoring.NEUTRAL : match.score;

        if (score === 0)
            logCache.verbose('cache.profile.store.zero.score', { name: c.character.name });

        // const totalScoreDimensions = match ? Matcher.countScoresTotal(match) : 0;
        // const dimensionsAtScoreLevel = match ? (Matcher.countScoresAtLevel(match, score) || 0) : 0;
        // const dimensionsAboveScoreLevel = match ? (Matcher.countScoresAboveLevel(match, Math.max(score, Scoring.WEAK_MATCH))) : 0;
        const risingFilter = core.state.settings.risingFilter;
        const isFiltered = matchesSmartFilters(c.character, risingFilter);

        const penalty = (isFiltered && risingFilter.penalizeMatches) ? -5 : (!isFiltered && risingFilter.rewardNonMatches) ? 2 : 0;

        if (isFiltered && risingFilter.penalizeMatches)
            score = Scoring.MISMATCH;

        const searchScore = match
            ? Matcher.calculateSearchScoreForMatch(score, match, penalty)
            : 0;

        const matchDetails = { matchScore: score, searchScore, isFiltered };

        if (this.store && !skipStore) {
            await this.store.storeProfile(c);

            if (updatedOverrides) {
                const ch = core.characters.get(c.character.name);
                await this.store.storeOverrides(ch.name, ch.overrides);
            }
        }

        const k = AsyncCache.nameKey(c.character.name);

        if (this.cache.has(k)) {
            const rExisting = this.cache.get(k)!;

            rExisting.character = c;
            rExisting.lastFetched = new Date();
            rExisting.match = matchDetails;

            return rExisting;
        }

        const rNew = {
            character: c,
            lastFetched: new Date(),
            added: new Date(),
            match: matchDetails,
        };

        this.update(k, rNew);
        this.evictOutdated({ chatChar: (name: string) => core.characters.get(name), privates: core.conversations.privateConversations });

        EventBus.$emit('character-score', { profile: c, score, isFiltered });

        return rNew;
    }

    static match(subject: ComplexCharacter, sourceOverrides: CharacterOverrides, subjectOverrides: CharacterOverrides): MatchReport | null {
        const source = core.characters.ownProfile;
        if (!source)
            return null;

        return Matcher.identifyBestMatchReport(source.character, subject.character, sourceOverrides, subjectOverrides);
    }

    /**
     * Cache override: We want to keep some profiles, actually.
     * @returns
     */
    async evictOutdated(options?: { chatChar?: (name: string) => Character, privates?: Conversation.PrivateConversation[] | ReadonlyArray<Conversation.PrivateConversation> }): Promise<boolean> {
        await Promise.resolve(); // no-op await if necessary

        /**
         * Disable for now.
         */
        // const exceeded = !!this.MAX_CACHE_SIZE && this.cache.size > this.MAX_CACHE_SIZE;
        const exceeded = false;

        if (exceeded) {
            const i = this.cache.keys();
            while (this.cache.size > this.MAX_CACHE_SIZE) {
                const { value: k, done } = i.next();
                if (done)
                    return false;

                if (k !== undefined) {
                    const v = this.cache.get(k)!;
                    const c = options?.chatChar?.(k);
                    const active_in_pm = options?.privates?.find(c => c.key === k);

                    const relevant = active_in_pm
                                  || (c?.isBookmarked || c?.isFriend) && c.status !== 'offline'
                                  || v.character.is_self;

                    if (relevant) {
                        logCache.silly('ProfileCache.evictOutdated.skipRelevant', k);
                    }
                    else {
                        logCache.debug('ProfileCache.evictOutdated.delete', k);
                        this.cache.delete(k);
                    }
                }
            }
        }

        return exceeded;
    }
}
