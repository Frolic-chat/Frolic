<template>
<div class="character-kinks-block" @contextmenu="contextMenu" @touchstart="contextMenu" @touchend="contextMenu">
  <div class="compare-highlight-block d-flex justify-content-between">
    <div class="expand-custom-kinks-block form-inline">
      <button class="btn btn-primary" :disabled="loading" @click="toggleExpandedCustomKinks">
        {{ (expandedCustoms ? 'Collapse' : 'Expand') }} Custom Kinks
      </button>
    </div>

    <div v-if="shared.authenticated" class="quick-compare-block form-inline">
      <character-select v-model="characterToCompare"></character-select>
      <button class="btn btn-outline-secondary" :disabled="loading || !characterToCompare" @click="compareKinks()">
        {{ compareButtonText }}
      </button>
    </div>

    <div class="form-inline">
      <select v-model="highlightGroup" class="form-control">
        <option :value="undefined">
          None
        </option>
        <option v-for="group in kinkGroups" v-if="group" :key="group.id" :value="group.id">
          {{ group.name }}
        </option>
      </select>
    </div>
  </div>
  <div class="form-row mt-3" :class="{ highlighting: !!highlightGroup }">
    <div class="col-sm-6 col-lg-3 kink-block-favorite">
      <div class="card bg-light">
        <div class="card-header">
          <h4>Favorites</h4>
        </div>
        <div class="card-body">
          <kink v-for="kink in groupedKinks['fave']" :key="kink.key" :kink="kink" :highlights="highlighting" :expandedCustom="expandedCustoms" :comparisons="comparison"></kink>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-lg-3 kink-block-yes">
      <div class="card bg-light">
        <div class="card-header">
          <h4>Yes</h4>
        </div>
        <div class="card-body">
          <kink v-for="kink in groupedKinks['yes']" :key="kink.key" :kink="kink" :highlights="highlighting" :expandedCustom="expandedCustoms" :comparisons="comparison"></kink>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-lg-3 kink-block-maybe">
      <div class="card bg-light">
        <div class="card-header">
          <h4>Maybe</h4>
        </div>
        <div class="card-body">
          <kink v-for="kink in groupedKinks['maybe']" :key="kink.key" :kink="kink" :highlights="highlighting" :expandedCustom="expandedCustoms" :comparisons="comparison"></kink>
        </div>
      </div>
    </div>
    <div class="col-sm-6 col-lg-3 kink-block-no">
      <div class="card bg-light">
        <div class="card-header">
          <h4>No</h4>
        </div>
        <div class="card-body">
          <kink v-for="kink in groupedKinks['no']" :key="kink.key" :kink="kink" :highlights="highlighting" :expandedCustom="expandedCustoms" :comparisons="comparison"></kink>
        </div>
      </div>
    </div>
  </div>
  <context-menu v-if="shared.authenticated && !oldApi" ref="context-menu" prop-name="custom"></context-menu>
</div>
</template>

<script lang="ts">
import { Component, Prop, Watch, Hook } from '@frolic/vue-ts';
import Vue from 'vue';
import core from '../../chat/core';
import type { Kink, KinkChoice, KinkGroup } from '../../interfaces';
import * as Utils from '../utils';
import CopyCustomMenu from './copy_custom_menu.vue';
import { methods, Store } from './data_store';
import type { Character, CharacterKink, DisplayKink } from './interfaces';
import KinkView from './kink.vue';

@Component({
    components: {
        'context-menu': CopyCustomMenu,
        kink:           KinkView,
    },
})
export default class CharacterKinksView extends Vue {
    @Prop({ required: true })
    readonly character!: Character;
    @Prop
    readonly oldApi?: true;
    @Prop({ required: true })
    readonly autoExpandCustoms!: boolean;

    shared = Store;
    characterToCompare = Utils.settings.defaultCharacter;
    highlightGroup: number | undefined;

    loading = false;
    comparing = false;
    highlighting: { [key: string]: boolean } = {};
    comparison:   { [key: string]: KinkChoice } = {};

    expandedCustoms = false;

    toggleExpandedCustomKinks(): void {
        this.expandedCustoms = !this.expandedCustoms;
    }

    // iterateThroughAllKinks(c: Character, cb: (

    resolveKinkChoice(c: Character, kinkValue: KinkChoice | number | undefined): KinkChoice | null {
        if (typeof kinkValue === 'string')
            return kinkValue;

        if (typeof kinkValue === 'number') {
            const custom = c.character.customs[kinkValue];

            if (custom)
                return custom.choice;
        }

        return null;
    }

    convertCharacterKinks(c: Character): CharacterKink[] {
        return Object.entries(c.character.kinks)
            .map(([ kinkId, kinkValue ]) => {
                const resolvedChoice = this.resolveKinkChoice(c, kinkValue);

                if (!resolvedChoice)
                    return null;

                return {
                    id:     Number(kinkId),
                    choice: resolvedChoice,
                };
            })
            .filter((v): v is NonNullable<typeof v> => v !== null);
    }

    async compareKinks(overridingCharacter?: Character, forced: boolean = false): Promise<void> {
        if ((this.comparing) && (!forced)) {
            this.comparison = {};
            this.comparing = false;
            this.loading = false;
            return;
        }

        try {
            this.loading = true;
            this.comparing = true;

            const kinks = overridingCharacter
                ? this.convertCharacterKinks(overridingCharacter)
                : await methods.kinksGet(this.characterToCompare);

            const to_assign: { [key: number]: KinkChoice } = {};
            for (const kink of kinks)
                to_assign[kink.id] = kink.choice;
            this.comparison = to_assign;
        }
        catch(e) {
            this.comparing = false;
            this.comparison = {};
            Utils.ajaxError(e, 'Unable to get kinks for comparison.');
        }
        this.loading = false;
    }

    @Watch('highlightGroup')
    highlightKinks(group: number | null): void {
        this.highlighting = {};
        if (group === null)
            return;

        const to_assign: { [key: string]: boolean } = {};

        for (const id in Store.shared.kinks) {
            const kink = Store.shared.kinks[id];
            if (kink.kink_group === group)
                to_assign[id] = true;
        }
        this.highlighting = to_assign;
    }

    @Hook('mounted')
    async mounted(): Promise<void> {
        // TODO: Fix character can be undefined.
        if (this.character?.is_self)
            return;

        this.expandedCustoms = this.autoExpandCustoms;

        if (core.state.settings.risingAutoCompareKinks)
            await this.compareKinks(core.characters.ownProfile, true);
    }

    @Watch('character')
    async characterChanged(): Promise<void> {
        if (this.character?.is_self)
            return;

        this.expandedCustoms = this.autoExpandCustoms;

        if (core.state.settings.risingAutoCompareKinks)
            await this.compareKinks(core.characters.ownProfile, true);
    }

    get kinkGroups(): KinkGroup[] {
        const groups = Store.shared.kinkGroups;

        // What is the point of filtering for undefined when the interface doesn't allow there to be any?
        return Object.values(groups)
            .filter(g => g)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    get compareButtonText(): string {
        if (this.loading)
            return 'Loading...';
        return this.comparing ? 'Clear' : 'Compare';
    }

    get groupedKinks(): { [key in KinkChoice]: DisplayKink[] } {
        const kinks = Store.shared.kinks;
        const characterKinks = this.character.character.kinks;
        const characterCustoms = this.character.character.customs;
        const displayCustoms: { [key: string]: DisplayKink | undefined } = {};
        const outputKinks: { [key: string]: DisplayKink[] } = { fave: [], yes: [], maybe: [], no: [] };
        const makeKink = (kink: Kink): DisplayKink => ({
            id:          kink.id,
            name:        kink.name,
            description: kink.description,
            group:       kink.kink_group,
            isCustom:    false,
            hasSubkinks: false,
            ignore:      false,
            subkinks:    [],
            key:         kink.id.toString(),
        });
        const kinkSorter = (a: DisplayKink, b: DisplayKink) => {
            if (this.character.settings.customs_first && a.isCustom !== b.isCustom)
                return a.isCustom < b.isCustom ? 1 : -1;

            if (a.name === b.name)
                return 0;
            return a.name < b.name ? -1 : 1;
        };

        for (const id in characterCustoms) {
            const custom = characterCustoms[id]!;
            displayCustoms[id] = {
                id:          custom.id,
                name:        custom.name,
                description: custom.description,
                choice:      custom.choice,
                group:       -1,
                isCustom:    true,
                hasSubkinks: false,
                ignore:      false,
                subkinks:    [],
                key:         `c${custom.id}`,
            };
        }

        for (const kinkId in characterKinks) {
            const kinkChoice = characterKinks[kinkId]!;
            const kink = <Kink | undefined>kinks[kinkId];
            if (kink === undefined) continue;
            const newKink = makeKink(kink);
            if (typeof kinkChoice === 'number' && typeof displayCustoms[kinkChoice] !== 'undefined') {
                const custom = displayCustoms[kinkChoice]!;
                newKink.ignore = true;
                custom.hasSubkinks = true;
                custom.subkinks.push(newKink);
            }
            if (!newKink.ignore)
                outputKinks[kinkChoice].push(newKink);
        }

        for (const customId in displayCustoms) {
            const custom = displayCustoms[customId];

            if (custom?.hasSubkinks)
                custom.subkinks.sort(kinkSorter);

            if (custom?.choice)
                outputKinks[<string>custom.choice].push(custom);
        }

        for (const choice in outputKinks)
            outputKinks[choice].sort(kinkSorter);

        return <{ [key in KinkChoice]: DisplayKink[] }>outputKinks;
    }

    contextMenu(event: TouchEvent): void {
        if (this.shared.authenticated && !this.oldApi)
            (this.$refs['context-menu'] as CopyCustomMenu).outerClick(event);
    }
}
</script>
