// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CharacterOverrides } from '../../../fchat/characters';

class Character {
    constructor(name: string) { this.name = name.toLowerCase(); }
    name: string;
    overrides: CharacterOverrides = {};
}
// characters: {[key: string]: Character | undefined} = {};
const state = {
    characters: new Map<string, Character>(),
}
export const core = {
    characters: {
        /**
         *
         */
        get(name: string) {
            const n = name.toLowerCase();

            const c = state.characters.get(n);
            if (c) {
                return c;
            }
            else {
                const char = new Character(n);
                state.characters.set(n, char);
                return char;
            }
        },
        /**
         * An async version of getting a chat character where we wait for the overrides to resolve.
         * @param name
         * @param useStore
         * @returns
         */
        // async getAsync(name: string, useStore = true): Promise<Character> {
        //     const char = this.get(name, false);

        //     if (useStore && !Object.keys(char.overrides).length && core.cache.profileCache) {
        //         await core.cache.profileCache.getCachedOverrides(name)
        //             .then(o => { if (o) ProfileCache.applyOverrides(name, o) });
        //     }

        //     return char;
        // },
    },
}
export default core;
