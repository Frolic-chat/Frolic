import core from '../chat/core';
import { methods } from '../site/character_page/data_store';
import {decodeHTML} from './common';
import {Character as Interfaces, Connection} from './interfaces';
import { Character as CharacterProfile } from '../site/character_page/interfaces';
import Vue from 'vue';
import { EventBus } from '../chat/preview/event-bus';
import l from '../chat/localize';

class Character implements Interfaces.Character {
    gender: Interfaces.Gender = 'None';
    status: Interfaces.Status = 'offline';
    statusText = '';
    isFriend = false;
    isBookmarked = false;
    isChatOp = false;
    isIgnored = false;
    overrides: CharacterOverrides = {};

    constructor(public name: string) {
    }
}

export interface CharacterOverrides {
    avatarUrl?: string;
    gender?: Interfaces.Gender;
    status?: Interfaces.Status;
}

class State implements Interfaces.State {
    characters: {[key: string]: Character | undefined} = {};

    ownCharacter: Character = <any>undefined; /*tslint:disable-line:no-any*///hack
    ownProfile: CharacterProfile = <any>undefined; /*tslint:disable-line:no-any*///hack

    friends: Character[] = [];
    bookmarks: Character[] = [];
    ignoreList: string[] = [];
    opList: string[] = [];
    friendList: string[] = [];
    bookmarkList: string[] = [];

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
     * Attempt to format a name by F-List site rules.
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

    get(name: string): Character {
        // Avoid the complexity of converting to `Character | null`
        if (!name.trim()) name = 'Frolic Chat';
        //else       name = this.sanitize(name);

        const key = name.toLowerCase();
        let char = this.characters[key];

        if (!char) {
            char = new Character(name);

            char.isFriend     = this.friendList.includes(name);
            char.isBookmarked = this.bookmarkList.includes(name);
            char.isChatOp     = this.opList.includes(name);
            char.isIgnored    = this.ignoreList.includes(key);

            this.characters[key] = char;
        }

        return char;
    }

    setStatus(character: Character, status: Interfaces.Status, text: string): void {
        if(character.status === 'offline' && status !== 'offline') {
            if(character.isFriend) this.friends.push(character);
            if(character.isBookmarked) this.bookmarks.push(character);
        } else if(status === 'offline' && character.status !== 'offline') {
            if(character.isFriend) this.friends.splice(this.friends.indexOf(character), 1);
            if(character.isBookmarked) this.bookmarks.splice(this.bookmarks.indexOf(character), 1);
        }
        character.status = status;
        character.statusText = decodeHTML(text);
    }

    setOverride(name: string, type: 'avatarUrl', value: string | undefined): void;
    setOverride(name: string, type: 'gender', value: Interfaces.Gender | undefined): void;
    setOverride(name: string, type: 'status', value: Interfaces.Status | undefined): void;
    setOverride(name: string, type: keyof CharacterOverrides, value: any): void {
        const char = this.get(name);

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
    let reconnectStatus: Connection.ClientCommands['STA'];
    connection.onEvent('connecting', async(isReconnect) => {
        state.friends   = [];
        state.bookmarks = [];

        state.bookmarkList = (await connection.queryApi<{ characters: string[] }>('bookmark-list.php')).characters;
        state.friendList   = (await connection.queryApi<{ friends: {source: string, dest: string, last_online: number}[] }>('friend-list.php'))
                .friends.map(x => x.dest);

        if (isReconnect && (<Character | undefined>state.ownCharacter) !== undefined)
            reconnectStatus = {status: state.ownCharacter.status, statusmsg: state.ownCharacter.statusText};

        for (const key in state.characters) {
            const character = state.characters[key]!;
            character.isFriend     = state.friendList.includes(character.name);
            character.isBookmarked = state.bookmarkList.includes(character.name);
            character.status = 'offline';
            character.statusText = '';
        }
    });
    connection.onEvent('connected', async(isReconnect) => {
        if (!isReconnect)
            return;

        connection.send('STA', reconnectStatus);

        Object.keys(state.characters)
            .filter(k => state.characters[k])
            .forEach(k => {
                const char = state.characters[k]!;
                char.isIgnored = state.ignoreList.includes(k);
                char.isChatOp  = state.opList.includes(char.name);
            });
    });
    connection.onMessage('IGN', (data) => {
        switch(data.action) {
        case 'init':
            state.ignoreList = data.characters.slice();
            break;
        case 'add':
            state.ignoreList.push(data.character.toLowerCase());
            state.get(data.character).isIgnored = true;
            break;
        case 'delete':
            state.ignoreList.splice(state.ignoreList.indexOf(data.character.toLowerCase()), 1);
            state.get(data.character).isIgnored = false;
        }
    });
    connection.onMessage('ADL', (data) => {
        state.opList = data.ops.slice();
    });
    connection.onMessage('LIS', (data) => {
        for (const char of data.characters) {
            const character = state.get(char[0]);
            character.gender = char[1];
            state.setStatus(character, char[2], char[3]);
        }
    });
    connection.onMessage('FLN', (data) => {
        state.setStatus(state.get(data.character), 'offline', '');
    });
    connection.onMessage('NLN', async(data) => {
        const character = state.get(data.identity);

        if (data.identity === connection.character) {
            state.ownCharacter = character;

            await state.resolveOwnProfile();

            // tslint:disable-next-line no-unnecessary-type-assertion
            core.cache.setProfile(state.ownProfile as CharacterProfile);

            EventBus.$emit('own-profile-update', { profile: state.ownProfile });
        }

        character.name = data.identity;
        character.gender = data.gender;
        state.setStatus(character, data.status, '');
    });
    connection.onMessage('STA', (data) => {
        state.setStatus(state.get(data.character), data.status, data.statusmsg);
    });
    connection.onMessage('AOP', (data) => {
        state.opList.push(data.character);
        const char = state.get(data.character);
        char.isChatOp = true;
    });
    connection.onMessage('DOP', (data) => {
        state.opList.splice(state.opList.indexOf(data.character), 1);
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
                state.bookmarkList.push(data.name);
                character.isBookmarked = true;
                if (character.status !== 'offline') state.bookmarks.push(character);
                break;
            case 'trackrem':
                state.bookmarkList.splice(state.bookmarkList.indexOf(data.name), 1);
                character.isBookmarked = false;
                if (character.status !== 'offline') state.bookmarks.splice(state.bookmarks.indexOf(character), 1);
                break;
            case 'friendadd':
                if (character.isFriend)
                    return;

                state.friendList.push(data.name);
                character.isFriend = true;
                if (character.status !== 'offline') state.friends.push(character);
                break;
            case 'friendremove':
                state.friendList.splice(state.friendList.indexOf(data.name), 1);
                character.isFriend = false;
                if (character.status !== 'offline') state.friends.splice(state.friends.indexOf(character), 1);
        }
    });
    return state;
}
