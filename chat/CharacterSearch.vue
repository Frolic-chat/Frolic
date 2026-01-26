<template>
    <modal :action="l('characterSearch.action')" @submit.prevent="submit()" dialogClass="w-100"
        :buttonText="state === 'results' ? l('characterSearch.again') : undefined" class="character-search">
        <div v-if="options && state === 'search'">
            <div v-show="error" class="alert alert-danger">{{error}}</div>

            <filterable-select v-model="data.kinks" :multiple="true" :placeholder="l('general.filter')"
                :title="l('characterSearch.kinks')" :filterFunc="filterKink" :options="options.kinks">
                <template v-slot="s">{{s.option.name}}</template>
            </filterable-select>

            <template v-for="item in listItems">
                <filterable-select v-model="data[item]" :multiple="true" :placeholder="l('general.filter')" :title="l('characterSearch.' + item)" :options="options[item]" :key="item">
                </filterable-select>
            </template>

            <filterable-select v-model="data.species" class="species-filter" :filterFunc="filterSpecies" :multiple="true" :placeholder="l('general.filter')"
                :title="l('characterSearch.species')" :options="options.species">
                <template v-slot="s">{{s.option.shortName}} <small>{{s.option.details}}</small></template>
            </filterable-select>

            <div v-if="searchString" class="search-string">
                {{l('characterSearch.pending')}} <span>{{searchString}}</span>
            </div>

            <div class="btn-group">
                <button class="btn btn-outline-secondary" @click.prevent="showHistory()">{{l('characterSearch.history')}}</button>
                <button class="btn btn-outline-secondary" @click.prevent="reset()">{{l('characterSearch.reset')}}</button>
            </div>

            <search-history ref="searchHistory" :callback="updateSearch" :curSearch="data"></search-history>
        </div>
        <div v-else-if="state === 'results'" class="results">

            <h4 v-if="hasReceivedResults">
                {{ l('characterSearch.results', results.length) }}
                <span v-if="resultsPending > 0" class="pending">{{ l('characterSearch.scoring', resultsPending) }} <i class="fas fa-circle-notch fa-spin search-spinner"></i></span>
            </h4>
            <h4 v-else>{{l('characterSearch.searching')}}</h4>

            <div v-for="record in results" :key="record.character.name" class="search-result" :class="'status-' + record.character.status">
                <template v-if="record.character.status === 'looking'" v-once>
                    <img :src="characterImage(record.character.name)" v-if="showAvatars"/>
                    <user :character="record.character" :showStatus="true" :match="shouldShowMatch" :hide="true" :avatar="false"></user>
                    <bbcode :text="record.character.statusText" class="status-text"></bbcode>
                </template>
                <template v-else v-once>
                  <user :character="record.character" :showStatus="true" :match="shouldShowMatch" :hide="true" :avatar="shouldShowAvatar"></user>
                  <bbcode :text="record.character.statusText" v-if="!!record.character.statusText" class="status-text"></bbcode>
                </template>
            </div>
        </div>
    </modal>
</template>

<script lang="ts">
import { Component, Hook, Watch } from '@frolic/vue-ts';
import Axios from 'axios';
import {BBCodeView} from '../bbcode/view';
import CustomDialog from '../components/custom_dialog';
import FilterableSelect from '../components/FilterableSelect.vue';
import Modal from '../components/Modal.vue';
import core from './core';
import { Character, Connection, ExtendedSearchData, SearchData, SearchKink, SearchSpecies } from './interfaces';
import l from './localize';
import UserView from './UserView.vue';
import EventBus from './preview/event-bus';
import type { CharacterScoreEvent } from './preview/event-bus';
import CharacterSearchHistory from './CharacterSearchHistory.vue';
import { Matcher } from '../learn/matcher';
import {
    nonAnthroSpecies,
    Species,
    speciesMapping,
    speciesNames
} from '../learn/matcher-types';
import { CharacterCacheRecord } from '../learn/profile-cache';

import NewLogger from '../helpers/log';
const log = NewLogger('search');

type Options = {
    kinks: SearchKink[],
    listitems: {id: string, name: string, value: string}[]
};

let options: Options | undefined;

interface SearchResult {
    character: Character;
    profile: CharacterCacheRecord | null;
}

function sort(resultX: SearchResult, resultY: SearchResult): number {
    const x = resultX.character;
    const y = resultY.character;

    if (x.status === 'looking' && y.status !== 'looking')
        return -1;

    if (x.status !== 'looking' && y.status === 'looking')
        return 1;

    const xc = core.cache.profileCache.getSync(x.name);
    const yc = core.cache.profileCache.getSync(y.name);

    if (xc && !yc)
        return -1;

    if (!xc && yc)
        return 1;

    if (xc && yc) {
        if (xc.match.matchScore > yc.match.matchScore)
            return -1;

        if (xc.match.matchScore < yc.match.matchScore)
            return 1;

        if (xc.match.searchScore > yc.match.searchScore)
            return -1;

        if (xc.match.searchScore < yc.match.searchScore)
            return 1;
    }

    return x.name.localeCompare(y.name);
}

@Component({
    components: {
        modal: Modal,
        user: UserView,
        'filterable-select': FilterableSelect,
        bbcode: BBCodeView(core.bbCodeParser),
        'search-history': CharacterSearchHistory,
    }
})
export default class CharacterSearch extends CustomDialog {
    l = l;
    kinksFilter = '';
    error = '';
    results: SearchResult[] = [];
    resultsPending = 0;
    characterImage = (c: string) => core.characters.getImage(c);
    options!: ExtendedSearchData;
    shouldShowMatch = true;
    state = 'search';
    hasReceivedResults = false;
    shouldShowAvatar = false;

    private countUpdater?: ResultCountUpdater;

    data: ExtendedSearchData = {
        kinks:          [],
        genders:        [],
        orientations:   [],
        languages:      [],
        furryprefs:     [],
        roles:          [],
        positions:      [],
        species:        [],
        bodytypes:      [],
    };

    listItems: ReadonlyArray<keyof SearchData> = [
        'genders', 'orientations', 'languages', 'furryprefs', 'roles', 'positions', 'bodytypes'
    ]; // SearchData is correct

    searchString = '';

    scoreWatcher: ((event: CharacterScoreEvent) => void) | null = null;

    @Hook('created')
    async created(): Promise<void> {
        if (!options)
            options = <Options | undefined>(await Axios.get('https://www.f-list.net/json/api/mapping-list.php')).data;

        if (!options)
            return;

        this.options = Object.freeze({
            kinks: options.kinks
                .sort((a, b) => a.name.localeCompare(b.name)),
            genders: options.listitems
                .filter(x => x.name === 'gender')
                .map(x => x.value),
            orientations: options.listitems
                .filter(x => x.name === 'orientation')
                .map(x => x.value),
            languages: options.listitems
                .filter(x => x.name === 'languagepreference')
                .map(x => x.value),
            furryprefs: options.listitems
                .filter(x => x.name === 'furrypref')
                .map(x => x.value),
            roles: options.listitems
                .filter(x => x.name === 'subdom')
                .map(x => x.value),
            positions: options.listitems
                .filter(x => x.name === 'position')
                .map(x => x.value),
            species: this.getSpeciesOptions(),
            bodytypes: options.listitems
                .filter(x => x.name === 'bodytype')
                .map(x => x.value),
        });


        this.countUpdater = new ResultCountUpdater(names => {
            this.resultsPending = this.countPendingResults(names);

            if (!this.resultsPending)
                this.countUpdater?.stop();

            this.resort();
        });
    }

    @Hook('mounted')
    mounted(): void {
        core.connection.onMessage('ERR', data => {
            this.state = 'search';

            switch(data.number) {
                case 18:
                    this.error = l('characterSearch.error.noResults');
                    break;
                case 50:
                    this.error = l('characterSearch.error.throttle');
                    break;
                case 72:
                    this.error = l('characterSearch.error.tooManyResults');
            }
        });

        core.connection.onMessage('FKS', async data => {
            const results = data.characters
                .map(x => ({ character: core.characters.get(x), profile: null }))
                .filter(x => !x.character.isIgnored && !core.state.hiddenUsers.includes(x.character.name))
                .filter(x => this.isSpeciesMatch(x) && this.isBodyTypeMatch(x) && !this.isSmartFiltered(x))
                .sort(sort);

            // pre-warm cache
            for (const c of results)
                await core.cache.profileCache.get(c.character.name);

            this.resultsPending = this.countPendingResults(undefined, results);

            this.countUpdater?.start();

            // this is done LAST to force Vue to wait with rendering
            this.hasReceivedResults = true;
            this.results = results;

            this.resort(results);
        });

        if (this.scoreWatcher) {
            log.warn('characterSearch.scoreWatcher.exists.mounted', "This should never fire!");
            EventBus.$off('character-score', this.scoreWatcher);
        }

        this.scoreWatcher = ({ profile }) => {
            if (this.state === 'results' && this.results.find(s => s.character.name === profile.character.name))
                this.countUpdater?.requestUpdate(profile.character.name);
        };

        EventBus.$on('character-score', this.scoreWatcher);
    }

    @Hook('beforeDestroy')
    beforeDestroy(): void {
        if (this.scoreWatcher) {
            EventBus.$off('character-score', this.scoreWatcher);

            this.scoreWatcher = null;
        }

        this.countUpdater?.stop();
    }

    @Watch('data', { deep: true })
    onDataChange(): void {
        this.searchString = (Object.values(this.data) as ExtendedSearchData[keyof ExtendedSearchData])
                .flat()
                .map(v => typeof v === 'string' ? v : v.name)
                .join(', ');
    }

    private resort(results = this.results) {
        this.results = results
                .filter(x => this.isSpeciesMatch(x) && this.isBodyTypeMatch(x) && !this.isSmartFiltered(x))
                .sort(sort);
    }

    /**
     * Return true if the character's species matches your search query. Characters who's profile information hasn't loaded yet return true for some reason.
     * @param result Character from search results
     */
    isSpeciesMatch(result: SearchResult): boolean {
        if (this.data.species.length === 0)
            return true;

        const knownCharacter = core.cache.profileCache.getSync(result.character.name);
        if (!knownCharacter)
            return true;

        // optimization
        result.profile = knownCharacter;

        const isSearchingForAnthro = !!this.data.species.find(s => s.id === Species.Anthro);
        const isSearchingForHuman = !!this.data.species.find(s => s.id === Species.Human);

        const species = Matcher.species(knownCharacter.character.character);

        // returns TRUE if we're only searching for humans -- we suck at identifying humans
        if (!species)
            return isSearchingForHuman && this.data.species.length === 1;

        return isSearchingForAnthro && !nonAnthroSpecies.includes(species)
            || !!this.data.species.find(s => s.id === species);
    }

    /**
     * Return true if the character's bodytype matches your search query. Characters who's profile information hasn't loaded yet return false for some reason.
     * @param result Character from search results
     */
    isBodyTypeMatch(result: SearchResult): boolean {
        if (this.data.bodytypes.length === 0)
            return true;

        const knownCharacter = core.cache.profileCache.getSync(result.character.name);
        if (!knownCharacter)
            return false;

        result.profile = knownCharacter;

        const bodytypeId = result.profile.character.character.infotags[51]?.list;
        if (bodytypeId === undefined)
            return false;

        const bodytype = options!.listitems
                .filter(x => x.name === 'bodytype')
                .find(x => +x.id === bodytypeId);

        return bodytype
            ? this.data.bodytypes.includes(bodytype.value)
            : false;
    }

    /**
     * Return true if the character in your search result matches any of your smart filters. Characters who haven't been through the matcher won't be filtered.
     * @param result Character from search results
     */
    isSmartFiltered(result: SearchResult): boolean {
        return core.state.settings.risingFilter.hideSearchResults
            && !!result.profile?.match.isFiltered;
    }

    /**
     * Saturate the species dropdown menu with species data from the matcher.
     */
    getSpeciesOptions(): SearchSpecies[] {
        const species = Object.entries(speciesMapping)
            .map(([k, v]) => {
                // More `Object.entries()` broadening types again. Sigh...
                const speciesId = Number(k) as keyof typeof speciesMapping;
                const keywords = v as typeof speciesMapping[typeof speciesId];

                const keywordsStr = `${keywords.join(', ')}`;
                const details = `${keywordsStr.substring(0, 24)}...`;

                if (speciesId in speciesNames) {
                    const name = speciesNames[speciesId][0].toUpperCase() + speciesNames[speciesId].substring(1);

                    return {
                        details,
                        keywords: `${name}: ${keywordsStr}`,
                        name: `${name} (species)`,
                        shortName: name,
                        id: speciesId,
                    };
                }

                const speciesName = Species[speciesId];

                return {
                    details,
                    keywords: `${speciesName}s: ${keywordsStr}`,
                    name: `${speciesName}s (species)`,
                    shortName: `${speciesName}s`,
                    id: speciesId,
                };
            });

        return species.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Count the number of character's whos profiles haven't been cached. Used during the result-parsing loop.
     * @param names Explicit character names from the results to check profile data for
     * @param results Entire search results; used when `names` is not provided
     * @returns Number of characters in search results with no cached profile
     */
    countPendingResults(names?: string[], results = this.results): number {
        return results.reduce((accum, result) => {
            const char = result.character.name;
            if (result.profile)
                return accum;

            if (!names || names.includes(char)) {
                result.profile = core.cache.profileCache.getSync(char);

                if (!result.profile)
                    core.cache.addProfile(char);
                else
                    return accum;
            }

            return accum + 1;
        },
        0);
    }

    filterKink(filter: RegExp, kink: SearchKink): boolean {
        if (this.data.kinks.length >= 5)
            return this.data.kinks.includes(kink);
        else
            return filter.test(kink.name);
    }

    filterSpecies(filter: RegExp, species: SearchSpecies): boolean {
        return filter.test(species.keywords);
    }

    get showAvatars(): boolean {
        return core.state.settings.showAvatars;
    }

    reset(): void {
        this.data = { kinks: [], genders: [], orientations: [], languages: [], furryprefs: [], roles: [], positions: [], species: [], bodytypes: [] };
    }

    /**
     * I don't think this can ever actually pass undefined (can you hit the "select" button
     * with nothing selected?), but I don't actually care to do the work to fix anything.
     * @param data Entry from the history - the data will fill the fields on the search form.
     */
    updateSearch(data?: ExtendedSearchData): void {
        log.debug('updateSearch.datacheck', data);

        if (!data)
            return;

        this.data = Object.entries(data)
            .reduce((acc, [k, v]) => {
                // `Object.entries()` broadens these types, so restrict them again.
                const category = k as keyof ExtendedSearchData;
                const content = v as ExtendedSearchData[typeof category];

                // @ts-ignore This works fine because category and content are derived from the same k:v in `data` so you'll never assign the wrong value to key. Feel free to rephrase this so there's no typing errors... if you can do that.
                acc[category] = content.map(selection => {
                    const jsonSelection = JSON.stringify(selection);

                    const v = this.options[category].find(opt => JSON.stringify(opt) === jsonSelection);

                    return v || selection;
                });

                return acc;
            },
            {} as ExtendedSearchData);
    }

    submit(): void {
        if (this.state === 'results') {
            this.results = [];
            this.hasReceivedResults = false;
            this.countUpdater?.stop();
            this.state = 'search';
            return;
        }

        this.shouldShowMatch = core.state.settings.risingComparisonInSearch;
        this.shouldShowAvatar = core.state.settings.risingShowPortraitInMessage;

        this.results = [];
        this.state = 'results';
        this.error = '';

        const data: Connection.ClientCommands['FKS'] & {[key: string]: (string | number)[]} = {kinks: []};

        for (const key in this.data) {
            const item = this.data[<keyof SearchData>key]; // SearchData is correct
            if (item.length > 0 && key !== 'bodytypes') {
                data[key] = key === 'kinks'
                    ? (<SearchKink[]>item).map(x => x.id)
                    : (<string[]>item);
            }
        }

        core.connection.send('FKS', data);

        this.updateSearchHistory(this.data);
    }

    showHistory(): void {
        (<CharacterSearchHistory>this.$refs.searchHistory).show();
    }

    async updateSearchHistory(data: ExtendedSearchData): Promise<void> {
        const dataStr = JSON.stringify(data, null, 0);

        const filteredHistory = ((await core.settingsStore.get('searchHistory')) || [])
            .filter(h => JSON.stringify(h, null, 0) !== dataStr)
            .map(h => ({ species: [], ...h }));

        const newHistory = [data]
            .concat(filteredHistory)
            .slice(0, 15);

        await core.settingsStore.set('searchHistory', newHistory);
    }
}


class ResultCountUpdater {
    // @ts-ignore
    private _isVue = true;

    private updatedNames: string[] = [];

    private timerId?: NodeJS.Timeout;

    constructor(private callback: (names: string[]) => void) {}

    requestUpdate(name: string): void {
        this.updatedNames.push(name);
    }

    start() {
        this.timerId = setInterval(
            () => {
                this.callback(this.updatedNames);

                if (this.updatedNames.length)
                    this.updatedNames = [];
            },
            250
        );

        log.debug('resultCountUpdater.start', this.timerId);
    }

    stop() {
        if (this.timerId) {
            log.debug('characterSearch.resultCountUpdater.stop', this.timerId);
            clearInterval(this.timerId);
            delete this.timerId;
        }
    }
}
</script>

<style lang="scss">
    .character-search {
        .species-filter {
          small {
            color: var(--tabSecondaryFgColor)
          }
        }

        .dropdown {
            margin-bottom: 10px;
        }

        .results {
            // .user-view {
            //     // display: block;
            // }
            & > .search-result {
                clear: both;
            }
            & > .status-looking {
                margin-bottom: 5px;
                min-height: 50px;

              .status-text {
                display: block;
              }
            }

            & > .status-offline,
            & > .status-online,
            & > .status-away,
            & > .status-idle,
            & > .status-busy,
            & > .status-dnd,
            & > .status-crown {
              overflow: hidden;
              width: 100%;
              height: 2em;
              padding-top: 5px;

              .user-avatar {
                max-width: 2em;
                max-height: 2em;
                min-width: 2em;
                min-height: 2em;
                margin-top: -5px;
              }

              .status-text {
                opacity: 0.75;
                padding-left: 4px;
                display: inline-flex;
              }
            }

            img {
                float: left;
                margin-right: 5px;
                width: 50px;
            }

            .search-result:nth-child(2n) {
                background-color: rgba(0,0,0, 0.15);
            }
        }

        .search-string {
            margin-bottom: 1rem;
            margin-top: 1rem;
            margin-left: 0.5rem;
            font-size: 80%;
        }

        .search-string span {
            font-weight: bold;
        }

        .pending {
            float: right;
            color: var(--gray);
            font-size: 80%;
        }

        // .search-spinner {
        //     // float: right;
        // }
    }
</style>
