// SPDX-License-Identifier: AGPL-3.0-or-later
import core from '../chat/core';
import { methods } from '../site/character_page/data_store';
import {decodeHTML} from './common';
import {Character as Interfaces, Connection} from './interfaces';
import { Character as CharacterProfile } from '../site/character_page/interfaces';
import { ProfileCache } from '../learn/profile-cache';
import Vue from 'vue';
import { EventBus } from '../chat/preview/event-bus';
import l from '../chat/localize';

import NewLogger from '../helpers/log';
const logCG = NewLogger('custom-gender', () => core.state.generalSettings.argv.includes('--debug-custom-gender'));
const logConnecting = NewLogger('connecting', () => core.state.generalSettings.argv.includes('--debug-connecting'));

class Character implements Interfaces.Character {
    /**
     * Name; if character is created using state.get(name), character is created with server-case name.
     */
    name: string = '';
    gender: Interfaces.Gender = 'None';
    status: Interfaces.Status = 'offline';
    statusText = '';
    isFriend = false;
    isBookmarked = false;
    isChatOp = false;
    isIgnored = false;
    overrides: CharacterOverrides = {};

    constructor(name: string) {
        this.name = name;
    }
}

export interface CharacterOverrides {
    avatarUrl?: string;
    gender?: Interfaces.CustomGender;
    status?: Interfaces.Status;
}

class State implements Interfaces.State {
    /**
     * Collection of all logged in characters, plus once-logged in characters.
     * Theoretically can grow infinite.
     */
    characters: {[key: string]: Character | undefined} = {};

    ownCharacter: Character = new Character('');
    ownProfile?: CharacterProfile;

    /**
     * Your online friends.
     */
    friends: Character[] = [];

    /**
     * Your online bookmarks.
     */
    bookmarks: Character[] = [];

    /**
     * A list of character names (in lowercase)
     */
    ignoreList: Set<string> = new Set();

    /**
     * A list of character names (in lowercase)
     */
    opList: Set<string> = new Set();

    /**
     * Your entire freinds list.
     * A list of character names (in lowercase)
     */
    friendList: Set<string> = new Set();

    /**
     * Your entire bookmark list.
     * A list of character names (in lowercase)
     */
    bookmarkList: Set<string> = new Set();

    /**
     * Turns a potentially-invalid character name into a validation object.
     * @param name A potentially invalid character name
     * @returns A structure containing the input name, output name, a character object if that character is online, any errors with the original name.
     *
     * The error will be `undefined` if the player is online. The character will be `undefined` if the player is offline.
     */
    validateCharacter(name: string): Interfaces.ValidatedCharacter {
        let err: string | undefined;

        // If the character is online it doesn't matter how badly their name violatees the site's rules - they somehow managed to log in with it.
        const c = this.get(name);
        if (c.status !== "offline") {
            return {
                char: c,
                in:   name,
                out:  name
            };
        }

        const n = this.sanitize(name);

        if (name.length < 2)
            err = l('charName.empty');
        else if (name.charAt(0) === ' ' || name.charAt(name.length - 1) === ' ')
            err = l('charName.space');
        else if (name.length > 20) // Arbitrary
            err = l('charName.tooLong');
        else if (name !== n)
            err = l('charName.invalid');

        return { in: name, out: n, err: err };
    }

    /**
     * Attempt to format a name by F-List site rules, allowing for moderators to have custom names that violate the norm.
     * @param name A potentially invalid character name
     * @returns A modified name put through various sanitizers to try to reach a username that could be created on the site.
     */
    private sanitize(name: string): string {
        return name
                .replace(/([^\x00-\x7F]|[{}\[\]<>\(\);\\"'`&\|$@%*])/g, '')
                .trim().substring(0, 20).trim();
        /** Sanitizes:
         * Non-ASCII characters
         * Common code blocks   {} [] <> ()
         * Quotations:          " ' `
         * Escape:              \ ; & |
         * Misc:                $ @ % *
         * I'm sure there's one I forgot and someone will crash the server with it.
         *
         * F-List character names follow certain restrictions:
         * [a-zA-Z _ -] and 20 characters maximum;
         * But we mostly care about reducing errors writing to filesystems.
         */
    }

    get(name: string, useStore = true): Character {
        // Avoid the complexity of converting to `Character | null`
        if (!name.trim()) name = 'Frolic Chat';
        //else       name = this.sanitize(name);

        const key = name.toLowerCase();
        let char = this.characters[key];

        if (!char) {
            char = new Character(name);

            char.isFriend     = this.friendList.has(name);
            char.isBookmarked = this.bookmarkList.has(name);
            char.isChatOp     = this.opList.has(name);
            char.isIgnored    = this.ignoreList.has(key);

            this.characters[key] = char;

            if (useStore && !Object.keys(char.overrides).length && core.cache.profileCache) {
                void core.cache.profileCache.getCachedOverrides(name)
                    .then(o => {
                        if (o && char && !Object.keys(char.overrides).length)
                            ProfileCache.applyOverrides(name, o);
                    });
            }
        }

        return char;
    }

    /**
     * An async version of getting a chat character where we wait for the overrides to resolve.
     * @param name
     * @param useStore
     * @returns
     */
    async getAsync(name: string, useStore = true): Promise<Character> {
        const char = this.get(name, false);

        if (useStore && !Object.keys(char.overrides).length && core.cache.profileCache) {
            await core.cache.profileCache.getCachedOverrides(name)
                .then(o => { if (o) ProfileCache.applyOverrides(name, o) });
        }

        return char;
    }

    getImage(character: string | Character): string {
        if (typeof character === 'string') {
            // The most official username regex from Maya herself.
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(character))
                return '#';

            const c = this.get(character);
            return c.overrides.avatarUrl || `https://static.f-list.net/images/avatar/${character.toLowerCase()}.png`
        }
        else {
            return character.overrides.avatarUrl || `https://static.f-list.net/images/avatar/${character.name.toLowerCase()}.png`
        }
    }

    /**
     * Gets a full gender object even if you don't use a custom gender; filling in your default gender info if you don't use custom.
     *
     * Needs to be filled in to acquire the match criteria for default genders.
     *
     * You should directly access the `overrides.gender` object if you only want the override.
     * @param character
     * @returns
     */
    getGender(character: string | Interfaces.Character): Interfaces.CustomGender {
        const r: Interfaces.CustomGender = {
            string:   '',
            match:    [],
            mismatch: [],
            version:   1,
        };

        let c: Interfaces.Character;

        if (typeof character === 'string') {
            // The most official username regex from Maya herself.
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(character))
                return r;

            c = this.get(character);
        }
        else {
            c = character;
        }

        r.string = c.overrides.gender?.string || c.gender;

        if (c.overrides.gender?.match)
            r.match = c.overrides.gender.match;

        if (c.overrides.gender?.mismatch)
            r.mismatch = c.overrides.gender.mismatch;

        return r;
    }

    /**
     * Get a characters gender string; custom if they use one, or f-list gender if they don't.
     *
     * You should directly access the `overrides.gender` object if you only want the override.
     * @param character
     * @returns
     */
    getGenderString(character: string | Interfaces.Character): string {
        let c: Interfaces.Character;

        if (typeof character === 'string') {
            // The most official username regex from Maya herself.
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(character))
                return '';

            c = this.get(character);
        }
        else {
            c = character;
        }

        return c.overrides.gender?.string || c.gender;
    }

    /**
     * Reactive-style character status updater. All status changes should go through here.
     *
     * The date object is used during broadcast of the friend/bookmark status-change event; so don't provide a date if you don't want to trigger activity listeners.
     *
     * Don't forget to call this anytime you set your own status.
     * @param character Chat character
     * @param status new status; `character.status` is the old status.
     * @param text new status message; `character.statusText` is the old status message.
     * @param date date if received from date-based event (server message, for example)
     */
    setStatus(character: Character,
              newStatus: Interfaces.Status,
              text: string,
              options?: {
                  isReconnect?: boolean,
                  date?: Date,
                  emitEvents?: boolean,
             }): void {
        const emit = options?.emitEvents ?? true;

        if (character.isFriend) {
            if ((character.status === 'offline' || options?.isReconnect) && newStatus !== 'offline') {
                this.friends.push(character);

                if (emit)                   EventBus.$emit('friend-list', state.friends);
                if (emit && options?.date)  EventBus.$emit('activity-friend-login', { character, date: options.date });
            }
            else if ((character.status !== 'offline' || options?.isReconnect) && newStatus === 'offline') {
                const i = this.friends.indexOf(character);
                if (i >= 0) this.friends.splice(i, 1);

                if (emit)                   EventBus.$emit('friend-list', state.friends);
                if (emit && options?.date)  EventBus.$emit('activity-friend-logout', { character, date: options.date });
            }
            else if (options?.date) {
                EventBus.$emit('activity-friend-status', {
                    character,
                    status:       newStatus,
                    statusmsg:    text,
                    oldStatus:    character.status,
                    oldStatusMsg: character.statusText,
                    date:         options?.date,
                });
            }
        }
        else if (character.isBookmarked) {
            if ((character.status === 'offline' || options?.isReconnect) && newStatus !== 'offline') {
                this.bookmarks.push(character);

                if (emit)                   EventBus.$emit('bookmark-list', state.bookmarks);
                if (emit && options?.date)  EventBus.$emit('activity-bookmark-login', { character, date: options?.date });
            }
            else if ((character.status !== 'offline' || options?.isReconnect) && newStatus === 'offline') {
                const i = this.bookmarks.indexOf(character);
                if (i >= 0) this.bookmarks.splice(i, 1);

                if (emit)                   EventBus.$emit('bookmark-list', state.bookmarks);
                if (emit && options?.date)  EventBus.$emit('activity-bookmark-logout', { character, date: options?.date });
            }
            else if (options?.date) {
                EventBus.$emit('activity-bookmark-status', {
                    character,
                    status:       newStatus,
                    statusmsg:    text,
                    oldStatus:    character.status,
                    oldStatusMsg: character.statusText,
                    date:         options?.date,
                });
            }
        }

        character.status = newStatus;
        character.statusText = decodeHTML(text);
    }

    setOverride(name: string, type: 'avatarUrl', value: string | undefined): void;
    setOverride(name: string, type: 'gender', value: Interfaces.CustomGender | undefined): void;
    setOverride(name: string, type: 'status', value: Interfaces.Status | undefined): void;
    setOverride(name: string, type: keyof CharacterOverrides, value: CharacterOverrides[keyof CharacterOverrides]): void;
    setOverride(name: string, type: keyof CharacterOverrides, value: CharacterOverrides[keyof CharacterOverrides]): void {
        const char = this.get(name, false);

        if (['avatarUrl', 'gender', 'status'].includes(type)) // runtime safety
            Vue.set(char.overrides, type, value);
    }

    async resolveOwnProfile(): Promise<void> {
        await methods.fieldsGet();

        this.ownProfile = await methods.characterData(this.ownCharacter.name, -1, false);
    }
}

let state: State;

export default function(this: void, connection: Connection): Interfaces.State {
    state = new State();

    let reconnectStatus: Connection.ClientCommands['STA'] | undefined = undefined;

    connection.onEvent('connecting', async (isReconnect) => {
        logConnecting.debug('characters.connecting', { isReconnect });

        state.friends   = [];
        state.bookmarks = [];

        const bm_list = (await connection.queryApi<{ characters: string[] }>('bookmark-list.php')).characters;
        const fr_list = (await connection.queryApi<{ friends: {source: string, dest: string, last_online: number}[] }>('friend-list.php')).friends.map(x => x.dest);

        logConnecting.debug('characters.default.onEvent.connecting.fr_bm_list', { fr: fr_list, bm: bm_list });

        state.bookmarkList = new Set(bm_list);
        state.friendList   = new Set(fr_list);

        EventBus.$emit('bookmark-list', state.bookmarks);
        EventBus.$emit('friend-list',   state.friends);

        if (isReconnect && state.ownCharacter.name !== '') {
            reconnectStatus = {
                status: state.ownCharacter.status,
                statusmsg: state.ownCharacter.statusText,
            };
        }

        // This is exclusively for reconnect; state.character is empty on first connect.
        // Normally I'd replace it with destruction of the character holder and do a full refresh on 'LIS' but reconnect-time is a factor in getting back into RP.
        for (const key in state.characters) {
            const character = state.characters[key];

            if (character) {
                character.isFriend     = state.friendList.has(key);
                character.isBookmarked = state.bookmarkList.has(key);
                character.status = 'offline';
                character.statusText = '';
            }
            else {
                logConnecting.warn('characters.connecting.voiding.noCharacter', key);
            }
        }
    });
    connection.onEvent('connected', async (isReconnect) => {
        if (!isReconnect)
            return;

        if (reconnectStatus)
            connection.send('STA', reconnectStatus);

        for (const key in state.characters) {
            const character = state.characters[key];

            if (character) {
                character.isIgnored = state.ignoreList.has(key);
                character.isChatOp  = state.opList.has(key);
            }
        }
    });
    connection.onMessage('IGN', (data) => {
        switch(data.action) {
        case 'init':
            state.ignoreList = new Set(data.characters);
            break;
        case 'add':
            state.ignoreList.add(data.character.toLowerCase());
            state.get(data.character).isIgnored = true;
            break;
        case 'delete':
            state.ignoreList.delete(data.character.toLowerCase());
            state.get(data.character).isIgnored = false;
        }
    });
    connection.onMessage('ADL', (data) => {
        state.opList = new Set(data.ops);
    });
    connection.onMessage('CON', (data) => {
        logConnecting.silly(`characters.CON.${data.count}`);
    });
    connection.onMessage('LIS', (data) => {
        logConnecting.silly('characters.LIS', data.characters.length);

        for (const char of data.characters) {
            const character = state.get(char[0], false);
            character.gender = char[1];
            state.setStatus(character, char[2], char[3]);
        }

        core.cache.profileCache.getBatchOfOverrides(
            data.characters.map(([ name ]) => name)
        ).then(everyonesOverrides => {
            const count = everyonesOverrides ? Object.keys(everyonesOverrides).length : 0;
            logCG.debug(`On LIS, querying for ${data.characters.length} characters, for which only ${count} had entries in the db.`);

            if (everyonesOverrides) {
                Object.entries(everyonesOverrides).forEach(([ char, indexedOverride ]) => {
                    const c = state.characters[char];
                    if (c && !Object.keys(c.overrides).length) {
                        for (const [i, v] of Object.entries(indexedOverride))
                            state.setOverride(char, i as keyof CharacterOverrides, v);
                    }
                });
            }
        });
    });
    connection.onMessage('FLN', (data, date) => {
        state.setStatus(state.get(data.character), 'offline', '', { date });
    });
    connection.onMessage('NLN', async(data, date) => {
        const character = state.get(data.identity);

        if (data.identity === connection.character) {
            state.ownCharacter = character;

            await state.resolveOwnProfile();

            if (state.ownProfile) {
                core.cache.setProfile(state.ownProfile);

                EventBus.$emit('own-profile-update', { profile: state.ownProfile });
            }
            // What should we do if we fail to resolve our own profile? Force disconnect?
        }

        character.name = data.identity;
        character.gender = data.gender;
        state.setStatus(character, data.status, '', { date });
    });
    connection.onMessage('STA', (data, date) => {
        state.setStatus(state.get(data.character), data.status, data.statusmsg, { date });
    });
    connection.onMessage('AOP', (data) => {
        state.opList.add(data.character.toLowerCase());
        const char = state.get(data.character);
        char.isChatOp = true;
    });
    connection.onMessage('DOP', (data) => {
        state.opList.delete(data.character.toLowerCase());
        const char = state.get(data.character);
        char.isChatOp = false;
    });
    connection.onMessage('RTB', (data) => {
        if (data.type !== 'trackadd' && data.type !== 'trackrem' && data.type !== 'friendadd' && data.type !== 'friendremove') {
            return;
        }

        const character = state.get(data.name);

        switch(data.type) {
            case 'trackadd':
                state.bookmarkList.add(data.name.toLowerCase());
                character.isBookmarked = true;

                if (character.status !== 'offline')
                    state.bookmarks.push(character);

                EventBus.$emit('bookmark-list', state.bookmarks);
                break;
            case 'trackrem':
                state.bookmarkList.delete(data.name.toLowerCase());
                character.isBookmarked = false;

                if (character.status !== 'offline')
                    state.bookmarks.splice(state.bookmarks.indexOf(character), 1);

                EventBus.$emit('bookmark-list', state.bookmarks);
                break;
            case 'friendadd':
                if (character.isFriend)
                    return;

                state.friendList.add(data.name.toLowerCase());
                character.isFriend = true;

                if (character.status !== 'offline') {
                    state.friends.push(character);
                    EventBus.$emit('friend-list',   state.friends);
                }

                break;
            case 'friendremove':
                state.friendList.delete(data.name.toLowerCase());
                character.isFriend = false;

                if (character.status !== 'offline') {
                    state.friends.splice(state.friends.indexOf(character), 1);
                    EventBus.$emit('friend-list', state.friends);
                }

                break;
        }
    });
    return state;
}
