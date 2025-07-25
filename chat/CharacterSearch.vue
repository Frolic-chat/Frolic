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
            <div class="debug" v-show="false">
              <textarea v-model="debugSearchJson"></textarea>
              <button class="btn" @click.prevent="debugUpdateResults()">{{l('characterSearch.update')}}</button>
            </div>

            <h4 v-if="hasReceivedResults">
                {{ l('characterSearch.results', results.length) }}
                <span v-if="resultsPending > 0" class="pending">{{ l('characterSearch.scoring', resultsPending) }} <i class="fas fa-circle-notch fa-spin search-spinner"></i></span>
            </h4>
            <h4 v-else>{{l('characterSearch.searching')}}</h4>

            <div v-for="record in results" :key="record.character.name" class="search-result" :class="'status-' + record.character.status">
                <template v-if="record.character.status === 'looking'" v-once>
                    <img :src="characterImage(record.character.name)" v-if="showAvatars"/>
                    <user :character="record.character" :showStatus="true" :match="shouldShowMatch" :avatar="false"></user>
                    <bbcode :text="record.character.statusText" class="status-text"></bbcode>
                </template>
                <template v-else v-once>
                  <user :character="record.character" :showStatus="true" :match="shouldShowMatch" :avatar="shouldShowAvatar"></user>
                  <bbcode :text="record.character.statusText" v-if="!!record.character.statusText" class="status-text"></bbcode>
                </template>
            </div>
        </div>
    </modal>
</template>

<script lang="ts">
    import { Component, Hook, Watch } from '@f-list/vue-ts';
    import Axios from 'axios';
    import {BBCodeView} from '../bbcode/view';
    import CustomDialog from '../components/custom_dialog';
    import FilterableSelect from '../components/FilterableSelect.vue';
    import Modal from '../components/Modal.vue';
    import {characterImage} from './common';
    import core from './core';
    import { Character, Connection, ExtendedSearchData, SearchData, SearchKink, SearchSpecies } from './interfaces';
    import l from './localize';
    import UserView from './UserView.vue';
    import {EventBus, CharacterScoreEvent} from './preview/event-bus';
    import CharacterSearchHistory from './CharacterSearchHistory.vue';
    import { Matcher } from '../learn/matcher';
    import {
      kinkMatchScoreMap,
      kinkMatchWeights,
      nonAnthroSpecies,
      Species,
      speciesMapping,
      speciesNames
    } from '../learn/matcher-types';
    import { CharacterCacheRecord } from '../learn/profile-cache';
    import Bluebird from 'bluebird';

    import Logger from 'electron-log/renderer';
    const log = Logger.scope('CharacterSearch');

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

        if(x.status === 'looking' && y.status !== 'looking') return -1;
        if(x.status !== 'looking' && y.status === 'looking') return 1;

        const xc = core.cache.profileCache.getSync(x.name);
        const yc = core.cache.profileCache.getSync(y.name);

        if(xc && !yc) {
            return -1;
        }

        if(!xc && yc) {
            return 1;
        }

        if(xc && yc) {
            if(xc.match.matchScore > yc.match.matchScore)
                return -1;

            if(xc.match.matchScore < yc.match.matchScore)
                return 1;

            if(xc.match.searchScore > yc.match.searchScore)
              return -1;

            if(xc.match.searchScore < yc.match.searchScore)
              return 1;
        }

        if(x.name < y.name)
          return -1;

        if(x.name > y.name)
          return 1;

        return 0;
    }


    @Component({
        components: {modal: Modal, user: UserView, 'filterable-select': FilterableSelect, bbcode: BBCodeView(core.bbCodeParser), 'search-history': CharacterSearchHistory}
    })
    export default class CharacterSearch extends CustomDialog {
        l = l;
        kinksFilter = '';
        error = '';
        results: SearchResult[] = [];
        resultsPending = 0;
        characterImage = characterImage;
        options!: ExtendedSearchData;
        shouldShowMatch = true;
        state = 'search';
        hasReceivedResults = false;
        shouldShowAvatar = false;

        debugSearchJson = JSON.stringify(
          {
            scoreMap: kinkMatchScoreMap,
            weights: kinkMatchWeights
          },
          null,
          2
        );

        private countUpdater?: ResultCountUpdater;

        data: ExtendedSearchData = {
            kinks: [],
            genders: [],
            orientations: [],
            languages: [],
            furryprefs: [],
            roles: [],
            positions: [],
            species: [],
            bodytypes: []
        };

        listItems: ReadonlyArray<keyof SearchData> = [
            'genders', 'orientations', 'languages', 'furryprefs', 'roles', 'positions', 'bodytypes'
        ]; // SearchData is correct

        searchString = '';

        // tslint:disable-next-line no-any
        scoreWatcher: ((event: CharacterScoreEvent) => void) | null = null;

        @Hook('created')
        async created(): Promise<void> {
            if(options === undefined)
                options = <Options | undefined>(await Axios.get('https://www.f-list.net/json/api/mapping-list.php')).data;
            if(options === undefined) return;
            this.options = Object.freeze({
                kinks: options.kinks.sort((x, y) => (x.name < y.name ? -1 : (x.name > y.name ? 1 : 0))),
                genders: options.listitems.filter((x) => x.name === 'gender').map((x) => x.value),
                orientations: options.listitems.filter((x) => x.name === 'orientation').map((x) => x.value),
                languages: options.listitems.filter((x) => x.name === 'languagepreference').map((x) => x.value),
                furryprefs: options.listitems.filter((x) => x.name === 'furrypref').map((x) => x.value),
                roles: options.listitems.filter((x) => x.name === 'subdom').map((x) => x.value),
                positions: options.listitems.filter((x) => x.name === 'position').map((x) => x.value),
                species: this.getSpeciesOptions(),
                bodytypes: options.listitems.filter((x) => x.name === 'bodytype').map((x) => x.value)
            });


            this.countUpdater = new ResultCountUpdater(
                (names: string[]) => {
                    log.debug('characterSearch.resultCountUpdater.callback', this.resultsPending);

                    this.resultsPending = this.countPendingResults(names);

                    if (this.resultsPending === 0) {
                      this.countUpdater?.stop();
                    }

                    this.resort();
                }
            );
        }


        async debugUpdateResults(): Promise<void> {
          if (this.state !== 'results') {
            return;
          }

          const data = JSON.parse(this.debugSearchJson);

          Object.assign(kinkMatchScoreMap, data.scoreMap);
          Object.assign(kinkMatchWeights, data.weights);

          core.cache.profileCache.clear();

          const results = this.results;

          this.results = [];

          await Bluebird.delay(10);

          // pre-warm cache
          await Bluebird.mapSeries(
            results,
            (c) => core.cache.profileCache.get(c.character.name)
          );

          this.resultsPending = this.countPendingResults(undefined, results);

          this.countUpdater?.start();
          this.resort(results);

          console.log('Done!');
        }

        @Hook('mounted')
        mounted(): void {
            core.connection.onMessage('ERR', (data) => {
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

            core.connection.onMessage('FKS', async (data) => {
                const results = data.characters.map((x) => ({ character: core.characters.get(x), profile: null }))
                    .filter((x) => core.state.hiddenUsers.indexOf(x.character.name) === -1 && !x.character.isIgnored)
                    .filter((x) => this.isSpeciesMatch(x) && this.isBodyTypeMatch(x) && !this.isSmartFiltered(x))
                    .sort(sort);

                // pre-warm cache
                await Bluebird.mapSeries(
                  results,
                  (c) => core.cache.profileCache.get(c.character.name)
                );

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

            // tslint:disable-next-line no-unsafe-any no-any
            this.scoreWatcher = e => {
                // console.log('scoreWatcher', event);

                if (this.state === 'results' && e.profile && this.results.find(s => s.character.name === e.profile.character.name))
                    this.countUpdater?.requestUpdate(e.profile.character.name);
            };

            EventBus.$on('character-score', this.scoreWatcher);
        }


        @Hook('beforeDestroy')
        beforeDestroy(): void {
            if (this.scoreWatcher) {
                log.info('characterSearch.scoreWatcher.exists.beforeDestroy', "This should only fire on logout!!!");
                EventBus.$off('character-score', this.scoreWatcher);

                this.scoreWatcher = null;
            }

            this.countUpdater?.stop();
        }


        @Watch('data', { deep: true })
        onDataChange(): void {
          this.searchString = Object.values(this.data)
                  .flat()
                  .map(v => v?.name ?? v)
                  .join(', ');
        }

        private resort(results = this.results) {
          this.results = (results
                  .filter(x => this.isSpeciesMatch(x) && this.isBodyTypeMatch(x) && !this.isSmartFiltered(x)) as SearchResult[])
                  .sort(sort);
        }


        isSpeciesMatch(result: SearchResult): boolean {
          if (this.data.species.length === 0) {
            return true;
          }

          const knownCharacter = core.cache.profileCache.getSync(result.character.name);

          if (!knownCharacter) {
            return true;
          }

          // optimization
          result.profile = knownCharacter;

          const isSearchingForAnthro = (!!this.data.species.find(s => s.id === Species.Anthro));
          const isSearchingForHuman = (!!this.data.species.find(s => s.id === Species.Human));

          const species = Matcher.species(knownCharacter.character.character);

          if (!species) {
            // returns TRUE if we're only searching for humans -- we suck at identifying humans
            return ((isSearchingForHuman) && (this.data.species.length === 1));
          }

          return (isSearchingForAnthro && !nonAnthroSpecies.includes(species))
            // || ((isSearchingForMammal) && (_.indexOf(mammalSpecies, s.id) >= 0))
            || !!this.data.species.find(s => s.id === species);
        }

        isBodyTypeMatch(result: SearchResult) {
            if (this.data.bodytypes.length === 0) return true

            const knownCharacter = core.cache.profileCache.getSync(result.character.name)
            if (!knownCharacter) {
                log.warn('characterSearch.resort.notKnown', result.character.name, 'This should never occur, since we warmed the cache.');
                return false
            }

            result.profile = knownCharacter

            const bodytypeId = result.profile.character.character.infotags[51]?.list
            if (bodytypeId === undefined)
                return false

            const bodytype = options!.listitems
                    .filter(x => x.name === 'bodytype')
                    .find(x => +x.id === bodytypeId);

            return bodytype && this.data.bodytypes.includes(bodytype.value);
        }

        isSmartFiltered(result: SearchResult) {
          if (!core.state.settings.risingFilter.hideSearchResults) {
            return false;
          }

          return !!result.profile?.match.isFiltered;
        }

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
                                id: speciesId
                            };
                        }

                        const speciesName = Species[speciesId];

                        return {
                            details,
                            keywords: `${speciesName}s: ${keywordsStr}`,
                            name: `${speciesName}s (species)`,
                            shortName: `${speciesName}s`,
                            id: speciesId
                        };
                    });

            return species.sort((a, b) => a.name.localeCompare(b.name));
        }


        countPendingResults(names?: string[], results = this.results): number {
            return results.reduce((accum: number, result: SearchResult) => {
                if (!!result.profile)
                    return accum;

                if (!names || names.includes(result.character.name))
                    result.profile = core.cache.profileCache.getSync(result.character.name);

                return !!result.profile ? accum : accum + 1;
            },
            0);
        }


        filterKink(filter: RegExp, kink: SearchKink): boolean {
            if(this.data.kinks.length >= 5)
                return this.data.kinks.includes(kink);
            return filter.test(kink.name);
        }


        filterSpecies(filter: RegExp, species: SearchSpecies): boolean {
            return filter.test(species.keywords);
        }

        get showAvatars(): boolean {
            return core.state.settings.showAvatars;
        }


        reset(): void {
            this.data = {kinks: [], genders: [], orientations: [], languages: [], furryprefs: [], roles: [], positions: [], species: [], bodytypes: []};
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

            log.debug('updateSearch.data.preUpdate', this.data);

            this.data = Object.entries(data)
                    .reduce((acc, [k, v]) => {
                        // `Object.entries()` broadens these types, so restrict them again.
                        const category = k as keyof ExtendedSearchData;
                        const content = v as ExtendedSearchData[typeof category];

                        // @ts-ignore This works fine because category and content are derived from the same k:v in `data` so you'll never assign the wrong value to key. Feel free to rephrase this so there's no typing errors... if you can do that.
                        acc[category] = content.map(selection => {
                            const jsonSelection = JSON.stringify(selection);
                            // @ts-ignore Old TS in webpack hates this: `find` might be different for each array type. Mordern TS doesn't complain.
                            const v = this.options[category].find(opt => JSON.stringify(opt) === jsonSelection);

                            return v || selection;
                        });

                        return acc;
                    },
                    {} as ExtendedSearchData);

            log.debug('updateSearch.data.postUpdate', this.data);
        }

        submit(): void {
            if(this.state === 'results') {
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

            for(const key in this.data) {
                const item = this.data[<keyof SearchData>key]; // SearchData is correct
                if(item.length > 0 && key !== 'bodytypes')
                    data[key] = key === 'kinks' ? (<SearchKink[]>item).map((x) => x.id) : (<string[]>item);
            }

            core.connection.send('FKS', data);

            // tslint:disable-next-line
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

      constructor(private callback: (names: string[]) => void) {
        log.debug('characterSearch.resultCountUpdater.registered', { cb: this.callback.toString() });
      }


      requestUpdate(name: string): void {
        this.updatedNames.push(name);
      }


        start() {
            this.timerId = setInterval(
            () => {
                log.debug('resultCountUpdater.tick', { timerId: this.timerId });

                this.callback(this.updatedNames);

                if (this.updatedNames.length)
                    this.updatedNames = [];
                },
                250
            );

            log.debug('resultCountUpdater.start', this.timerId);
        }


      stop() {
        log.debug('characterSearch.resultCountUpdater.stop', 'Trying...', this.timerId);

        if (this.timerId) {
            log.debug('characterSearch.resultCountUpdater.stop', 'Stopped!', this.timerId);
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
