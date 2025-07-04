import * as _ from 'lodash';

import core from '../chat/core';
import {Character as ComplexCharacter, CharacterGroup, Guestbook} from '../site/character_page/interfaces';
import { AsyncCache } from './async-cache';
import { Matcher, MatchReport } from './matcher';
import { PermanentIndexedStore } from './store/types';
import { CharacterImage, SimpleCharacter } from '../interfaces';
import { Scoring } from './matcher-types';
import { matchesSmartFilters } from './filter/smart-filter';
import * as remote from '@electron/remote';

import Logger from 'electron-log/renderer';
const log = Logger.scope('profile-cache');

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

export interface CharacterCacheRecord {
    character: ComplexCharacter;
    lastFetched: Date;
    added: Date;
    // counts?: CountRecord;
    match: CharacterMatchSummary;
    meta?: MetaRecord;
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


    getSync(name: string): CharacterCacheRecord | null {
        const key = AsyncCache.nameKey(name);

        if (key in this.cache)
            return this.cache[key];

        return null;
    }


    async get(name: string, skipStore: boolean = false, _fromChannel?: string): Promise<CharacterCacheRecord | null> {
        const key = AsyncCache.nameKey(name);

        if (key in this.cache)
            return this.cache[key];

        if (!this.store || skipStore)
            return null;

        // if (false) {
        //     log.info(`Retrieve '${name}' for channel '${fromChannel}, gap: ${(Date.now() - this.lastFetch)}ms`);
        //     this.lastFetch = Date.now();
        // }

        const pd = await this.store.getProfile(name);

        if (!pd)
            return null;

        const cacheRecord = await this.register(pd.profileData, true);

        cacheRecord.lastFetched = new Date(pd.lastFetched * 1000);
        cacheRecord.added = new Date(pd.firstSeen * 1000);

        cacheRecord.meta = {
            lastMetaFetched: pd.lastMetaFetched ? new Date(pd.lastMetaFetched * 1000) : null,
            groups: pd.groups,
            friends: pd.friends,
            images: pd.images,
            guestbook: pd.guestbook
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

        if (!record) {
            // coward's way out
            return;
        }

        record.meta = meta;

        if (this.store) {
            await this.store.updateProfileMeta(name, meta.images, meta.guestbook, meta.friends, meta.groups);
        }
    }

    static isSafeRisingPortraitURL(url: string): boolean {
        if (url.match(/^https?:\/\/static\.f-list\.net\//i)) {
            return true;
        }

        if (url.match(/^https?:\/\/([a-z0-9\-.]+\.)?imgur\.com\//i)) {
            return true;
        }

        if (url.match(/^https?:\/\/([a-z0-9\-.]+\.)?freeimage\.host\//i)) {
            return true;
        }

        if (url.match(/^https?:\/\/([a-z0-9\-.]+\.)?iili\.io\//i)) {
            return true;
        }

        if (url.match(/^https?:\/\/([a-z0-9\-.]+\.)?redgifs\.com\//i)) {
            return true;
        }

        if (url.match(/^https?:\/\/([a-z0-9\-.]+\.)?e621\.net\//i)) {
            return true;
        }

        return false;
    }

    static detectRisingPortraitURL(description: string): string | null {
        if (!core.state.settings.risingShowHighQualityPortraits) {
            return null;
        }

        const match = description.match(/\[url=(.*?)]\s*?Rising\s*?Portrait\s*?\[\/url]/i);

        if (match && match[1]) {
            return match[1].trim();
        }

        return null;
    }

    updateOverrides(c: ComplexCharacter): void {
        const avatarUrl = ProfileCache.detectRisingPortraitURL(c.character.description);

        if (avatarUrl) {
            if (!ProfileCache.isSafeRisingPortraitURL(avatarUrl)) {
                log.info('portrait.hq.invalid.domain', { name, url: avatarUrl });
                return;
            }

            if (c.character.name === core.characters.ownCharacter.name) {
                const parent = remote.getCurrentWindow().webContents;

                parent.send('update-avatar-url', c.character.name, avatarUrl);
            }

            log.info('portrait.hq.url', { name: c.character.name, url: avatarUrl });
            core.characters.setOverride(c.character.name, 'avatarUrl', avatarUrl);
        }
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

    async register(c: ComplexCharacter, skipStore: boolean = false): Promise<CharacterCacheRecord> {
        const k = AsyncCache.nameKey(c.character.name);
        const match = ProfileCache.match(c);
        let score = (!match || match.score === null) ? Scoring.NEUTRAL : match.score;

        if (score === 0) {
            log.info('cache.profile.store.zero.score', { name: c.character.name });
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
