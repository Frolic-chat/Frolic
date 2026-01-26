<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="body">
    <div v-for="key in characterStrings" :key="key" class="row">
        <label :for="`devtools-search-${key}`" class="col-auto">
            {{ key }}
        </label>

        <div class="col">
            <input type="text" :value="searchStrings[key]" @input="setText(key, $event.target.value)" :id="`devtools-search-${key}`" class="form-control"></input>
        </div>
    </div>

    <div v-for="key in characterBools" :key="key" class="row">
        <div class="col">
            <input type="checkbox" @change="setChecked(key, $event.target.checked)" :id="`devtools-search-${key}`" class="form-control"/>
        </div>

        <label :for="`devtools-search-${key}`" class="col-auto">
            {{ key }}
        </label>
    </div>

    <div class="row">
        <button @click="runSearch()" class="col-auto ml-auto btn btn-primary">
            Search
        </button>
    </div>

    <h5 class="text-center">{{ results.length }} results</h5>
     <div class="d-flex flex-grow-1" style="overflow: auto">
        <div class="results row flex-wrap">
            <div v-for="char in results" :key="char.name" class="col-auto d-flex flex-column">
                <user :character="char" :showStatus="true" :match="true"></user>
                <div>
                    <span class="text-success">{{ char.isFriend ? '1' : '0' }}</span>
                    <span class="text-info">{{ char.isBookmarked ? '1' : '0' }}</span>
                    <span class="text-warning">{{ char.isChatOp ? '1' : '0' }}</span>
                    <span class="text-danger">{{ char.isIgnored ? '1' : '0' }}</span>
                </div>
                <div>
                    {{  char.overrides ? Object.values(char.overrides).join(', ') : 'No overrides.' }}
                </div>
            </div>
        </div>
     </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@frolic/vue-ts';

import UserView from '../chat/UserView.vue';

import core from '../chat/core';
import { Character } from '../fchat';

import NewLogger from '../helpers/log';
const log = NewLogger('devtools');

@Component({
    components: {
        user: UserView,
    }
})
export default class Search extends Vue {
    /**
     * Each Character has:
     * string: name, gender, status, statusText,
     * bools:  isFriend, isBookmarked, isChatOp, isIgnored,
     * extra:  overrides
     */

    // Unfortunately the character list isn't revealed publicly, so we will force-read it.
    characterList = (core.characters as Character.State & { characters: { [key: string]: Character | undefined } }).characters;

    readonly characterStrings = [ 'name', 'gender', 'status', 'statusText' ] as const;
    readonly characterBools   = [ 'isFriend', 'isBookmarked', 'isChatOp', 'isIgnored' ] as const;

    searchStrings: Record<Search['characterStrings'][number], string> = {
        gender:     '',
        name:       '',
        status:     '',
        statusText: '',
    };

    searchBools: Record<Search['characterBools'][number], boolean> = {
        isFriend:       false,
        isBookmarked:   false,
        isChatOp:       false,
        isIgnored:      false,
    };

    setChecked(key: keyof Search['searchBools'], value: boolean) {
        log.debug('Search.setChecked', { from: this.searchBools[key], to: value });

        this.searchBools[key] = value;
    }

    setText(key: keyof Search['searchStrings'], value: string | undefined) {
        log.debug('Search.setChecked', { from: this.searchStrings[key], to: value });

        this.searchStrings[key] = value?.trim() ?? '';
    }


    canceled = false;
    results: Character[] = [];

    async runSearch() {
        // Abort if not enough info filled in.
        // ...

        this.canceled = false;
        const BATCH_SIZE = 500;

        await Promise.resolve(); // no-op await

        // UI -> current search
        const string_criteria = structuredClone(this.searchStrings);
        const bool_criteria   = structuredClone(this.searchBools);

        const chars = Object.values(this.characterList);
        const results: Character[] = [];

        const process = async (start: number = 0) => {
            if (this.canceled)
                return;

            log.debug(`Search.runSearch.${start}`);

            const stop = start + BATCH_SIZE;

            CharacterSearch:
            // Break at every failure of desired context;
            // no failure = add to results
            for (let i = start; i < stop; i++) {
                const char = chars[i];
                if (!char) // ts
                    continue;

                // Must match all checked boxes.
                for (const key in bool_criteria) {
                    // We want but don't have
                    if (bool_criteria[key as keyof typeof bool_criteria] && !char[key as keyof Character])
                        continue CharacterSearch;
                }

                // Provided strings must match.
                for (const key in string_criteria) {
                    const search_req = string_criteria[key as keyof typeof string_criteria];
                    // We want...
                    if (search_req) {
                        const value = char[key as keyof Character];

                        // ... but don't have.
                        if (typeof value !== 'string' || !value.toLowerCase().includes(search_req.toLowerCase()))
                            continue CharacterSearch;
                    }
                }

                results.push(char);
            }

            if (stop < chars.length && !this.canceled)
                process(stop);
        }

        process();

        this.$set(this, 'results', results);
    }
}
</script>

<style lang="css">
#body {
    display: flex;
    flex-direction: column;

    /* .row {
        width: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        align-items:     flex-start;
        justify-content: space-around;
    } */
}
</style>
