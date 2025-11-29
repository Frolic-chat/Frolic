<template>
<collapse :action="analyze" btnClass="btn-secondary" ref="collapse">
<template v-slot:header>
    <span>
        {{ hook }}
    </span>
    <span v-if="lastRun">
        Last run: {{ lastRun }}
    </span>
</template>
<template v-slot:button>
    <span>
        <span v-if="!analyzing && recommendations && !recommendations.length" class="text-success fa-solid fa-circle-check"></span>
        <span v-else class="fa-solid fa-user-md"></span>
        <span class="ml-1 d-none d-md-inline" style="white-space: normal;">{{ title }}</span>
        <span class="ml-2 d-inline d-md-none" style="white-space: normal;">{{ title }}</span>
    </span>
</template>
<template v-slot:default>
    <template v-if="analyzing || recommendations"><!-- class="profile-analysis-wrapper" -->
        <div v-if="!analyzing && recommendations && !recommendations.length" class="card-text">
            <h3>{{ good }}</h3>
            <p>{{ noImprovements }}</p>
        </div>

        <div v-else-if="analyzing" class="card-text">
            <p>{{ hook }}</p>
            <p>&nbsp;</p>
            <p>{{ goal }}</p>
            <p>&nbsp;</p>
            <h3>{{ working }}</h3>
        </div>

        <div v-else-if="!analyzing && recommendations && recommendations.length" class="card-text profile-analysis-results">
            <p>{{ recc }}</p>
            <ul class="list-group list-group-flush">
                <li v-for="r in recommendations" class="recommendation list-group-item py-2 mx-2" :class="{
                    'list-group-item-danger':    r.level === 'critical',
                    'list-group-item-warning':   r.level === 'note',
                    'list-group-item-secondary': r.level !== 'critical' && r.level !== 'note',
                 }">
                    <h3 class="mb-0">{{r.title}}</h3>
                    <p>{{r.desc}}</p>
                    <p class="more-info" v-if="r.helpUrl">
                        <a :href="r.helpUrl" class="btn mx-auto my-2" :class="{
                            'btn-outline-danger':    r.level === 'critical',
                            'btn-outline-warning':   r.level === 'note',
                            'btn-outline-secondary': r.level !== 'critical' && r.level !== 'note',
                        }">
                            {{ heresHow }}
                            <span class="fa-solid fa-up-right-from-square ml-2"></span>
                        </a>
                    </p>
                </li>
            </ul>
        </div>
    </template>
</template>
</collapse>
</template>
<script lang="ts">
import { Component } from '@f-list/vue-ts';
import Vue from 'vue';

import Collapse from '../../components/collapse.vue';

import { ProfileRecommendation, ProfileRecommendationAnalyzer } from './profile-recommendation';
import { CharacterAnalysis } from '../matcher';

import core from '../../chat/core';
import { methods } from '../../site/character_page/data_store';
import l from '../../chat/localize';

@Component({
    components: {
        collapse: Collapse,
    }
})
export default class ProfileAnalysis extends Vue {
    recommendations: ProfileRecommendation[] | null = null;
    analyzing = false;
    lastRun: string = '';

    title          = l('chat.helper');
    hook           = l('phelper.hook');
    heresHow       = l('phelper.heresHow');
    good           = l('phelper.good');
    noImprovements = l('phelper.noImprovements');
    goal           = l('phelper.goal');
    working        = l('phelper.working');
    recc           = l('phelper.recommendations');

    /**
     * Analyze and report on a character. Currently only useful to analyze yourself.
     */
    async analyze(character?: string): Promise<void> {
        (this.$refs['collapse'] as Collapse).open();

        if (!character)
            character = core.characters.ownProfile?.character.name;

        if (!character)
            return;

        this.analyzing = true;
        this.recommendations = null;

        const d = new Date();
        this.lastRun = '';

        try {
            const char = await methods.characterData(character, undefined, true);
            const matcher = new CharacterAnalysis(char.character);
            const analyzer = new ProfileRecommendationAnalyzer(matcher);

            this.recommendations = await analyzer.analyze();

            //this.lastRun = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            this.lastRun = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        catch {
            // Stop displaying outdated report
            this.recommendations = null;
        }
        finally {
            this.analyzing = false;
        }
    }
}
</script>
<style lang="scss">
.profile-analysis-results {
    li {
        line-height: 1.25;
    }
}
</style>
