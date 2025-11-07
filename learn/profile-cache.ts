import core from '../chat/core';
import {Character as ComplexCharacter, CharacterGroup, Guestbook} from '../site/character_page/interfaces';
import { AsyncCache } from './async-cache';
import { EventBus } from '../chat/preview/event-bus';
import { Matcher, MatchReport } from './matcher';
import { PermanentIndexedStore } from './store/types';
import { CharacterImage, SimpleCharacter } from '../interfaces';
import { Scoring } from './matcher-types';
import { matchesSmartFilters } from './filter/smart-filter';
import * as remote from '@electron/remote';
import { Character } from '../fchat/interfaces';
import { getAsNumber } from '../helpers/utils';

import NewLogger from '../helpers/log';
const log = NewLogger('profile-cache', () => process.env.NODE_ENV === 'development');

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
    protected store?: PermanentIndexedStore;

    protected lastFetch = Date.now();


    setStore(store: PermanentIndexedStore): void {
        this.store = store;
    }


    onEachInMemory(cb: (c: CharacterCacheRecord, key: string) => void): void {
        Object.entries(this.cache).forEach(([k, v]) => cb(v, k));
    }


    /**
     * Query the cache for a player record, returning immediately. Fails with `null` if the character hasn't been cached. Use {@link get | `get` (async)} if you want to reach deeper and get the profile from the disk-backed store and cache it in readily-accessible memory.
     *
     * This method does **NOT** query the server for the character.
     * @param name Character to query the cache for
     * @returns Character profile if it's cached; null otherwise
     */
    getSync(name: string): CharacterCacheRecord | null {
        const key = AsyncCache.nameKey(name);

        if (key in this.cache)
            return this.cache[key];

        return null;
    }


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
        const key = AsyncCache.nameKey(name);

        // This portion is identical to the sync version.
        if (key in this.cache)
            return this.cache[key];

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
            await this.store.updateProfileMeta(name, meta.images, meta.guestbook, meta.friends, meta.groups);
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
            const [, type, value] = match;

            if (validInlineTags.find(tag => type === tag)) {
                results.push({
                    type:  type.toLowerCase() as typeof validInlineTags[number],
                    value: value,
                });
            }
        }

        if (results.some(e => e.type === 'hqp')) {
            log.verbose('Very cool portrait! From desc:', description.slice(0, 100));
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
            return {
                string:   parts.display || '',
                match:    parts.match?.split(',').map(e => getAsNumber(e) ?? 0) ?? [], // Sanitize
                mismatch: parts.mismatch?.split(',').map(e => getAsNumber(e) ?? 0) ?? [], // Sanitize
                version:  getAsNumber(parts.v) ?? 0,
            }
        }
        else {
            return null;
        }
    }


    updateOverrides(c: ComplexCharacter): void {
        const unparsed = ProfileCache.getOverridesFromDescription(c.character.description);
        unparsed.forEach(({type, value }) => {
            if (type === 'hqp') {
                // If we got this far, it's okay to overwrite with undefined.
                const parsed = ProfileCache.parsePortraitURL(value);
                if (ProfileCache.isSafePortraitURL(parsed)) { // domain check
                    core.characters.setOverride(c.character.name, 'avatarUrl', parsed);

                    if (c.character.name === core.characters.ownCharacter.name) {
                        const parent = remote.getCurrentWindow().webContents;
                        parent.send('update-avatar-url', c.character.name, parsed);
                    }

                    log.debug('portrait.hq.url', { name: c.character.name, url: parsed });
                }
                else {
                    log.warn('portrait.hq.invalid.domain', {
                        name: c.character.name,
                        url: parsed,
                    });
                }
            }
            else if (type === 'fcg') {
                const parsed = ProfileCache.parseGenderTag(value);
                if (parsed) {
                    core.characters.setOverride(c.character.name, 'gender', parsed);

                    log.verbose(`${c.character.name} is ${parsed.string}, which is a very cool gender!`);
                }
            }
        })
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

        log.debug('dev.phelper.color.matches', matches);

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
        const k = AsyncCache.nameKey(c.character.name);
        const match = ProfileCache.match(c);
        let score = (!match || match.score === null) ? Scoring.NEUTRAL : match.score;

        if (score === 0) {
            log.verbose('cache.profile.store.zero.score', { name: c.character.name });
        }

        this.updateOverrides(c);

        // const totalScoreDimensions = match ? Matcher.countScoresTotal(match) : 0;
        // const dimensionsAtScoreLevel = match ? (Matcher.countScoresAtLevel(match, score) || 0) : 0;
        // const dimensionsAboveScoreLevel = match ? (Matcher.countScoresAboveLevel(match, Math.max(score, Scoring.WEAK_MATCH))) : 0;
        const risingFilter = core.state.settings.risingFilter;
        const isFiltered = matchesSmartFilters(c.character, risingFilter);

        const penalty = (isFiltered && risingFilter.penalizeMatches) ? -5 : (!isFiltered && risingFilter.rewardNonMatches) ? 2 : 0;

        if (isFiltered && risingFilter.penalizeMatches) {
            score = Scoring.MISMATCH;
        }

        const searchScore = match
            ? Matcher.calculateSearchScoreForMatch(score, match, penalty)
            : 0;

        const matchDetails = { matchScore: score, searchScore, isFiltered };

        if ((this.store) && (!skipStore)) {
            await this.store.storeProfile(c);
        }

        if (k in this.cache) {
            const rExisting = this.cache[k];

            rExisting.character = c;
            rExisting.lastFetched = new Date();
            rExisting.match = matchDetails;

            return rExisting;
        }

        const rNew = {
            character: c,
            lastFetched: new Date(),
            added: new Date(),
            match: matchDetails
        };

        this.cache[k] = rNew;

        EventBus.$emit('character-score', { profile: c, score, isFiltered });

        return rNew;
    }


    static match(c: ComplexCharacter): MatchReport | null {
        const you = core.characters.ownProfile;

        if (!you) {
            return null;
        }

        return Matcher.identifyBestMatchReport(you.character, c.character);
    }
}
