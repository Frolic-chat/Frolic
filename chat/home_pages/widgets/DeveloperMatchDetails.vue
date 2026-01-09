<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<collapse :initial="yohhlrf" @open="toggle.devMatchDetails = false" @close="toggle.devMatchDetails = true" :action="copyToClipboard">
    <template v-slot:header>
        Match Details
    </template>
    <template v-slot:button v-if="bestMatchReport">
            <span>
                <span class="fa-solid fa-copy mr-1"></span>Copy
            </span>
    </template>
    <template v-slot:default>
        <div class="d-flex flex-column">
            <div class="text-xl-center text-justify font-italic">This tool reveals the inner machinations of the Rising matchmaker. If you report an issue with matchmaking or ads, you may be asked to provide this information to help find the cause of the issue.</div>
            <hr class="my-3">
            <h5 v-if="bestMatchReport" class="text-center">
                {{ bestMatchReport.you.you.name }} <-> {{ bestMatchReport.them.you.name }}
            </h5>

            <textarea v-if="bestMatchReport" id="devtool-match-results-printable" ref="matchReportPrintArea">
                {{ bestMatchReportPrintable }}
            </textarea>
            <div v-else>
                <h5 class="text-center">Loading...</h5>
            </div>
        </div>
    </template>
</collapse>
</template>

<script lang="ts">
import { Component, Prop, Hook, Watch } from '@f-list/vue-ts';
import Vue from 'vue';

import Collapse from '../../../components/collapse.vue';

//import * as Electron from 'electron';
import core from '../../core';
import EventBus, { CharacterScoreEvent } from '../../preview/event-bus';
import { Matcher } from '../../../learn/matcher';

import type { Conversation } from '../../interfaces';
import type { MatchReport } from '../../../learn/matcher';
import type { CharacterCacheRecord } from '../../../learn/profile-cache';

// import NewLogger from '../../../helpers/log';
// const log = NewLogger('home');

/**
 * The flow:
 * On created or conversation change, dispatch a profile request to the character of the conversation. The profile may be returned and evaluated immediately.
 *
 * If it is returned async, we watch for profile-scoring returns. There doesn't seem to be a cache
 */
@Component({
    components: {
        'collapse': Collapse,
    }
})
export default class MatchDetailsDeveloperDisplay extends Vue {
    @Prop({ required: true })
    readonly conversation!: Conversation.PrivateConversation;

    profileCache: CharacterCacheRecord | null = null;

    bestMatchReport: MatchReport | null = null;

    @Hook('created')
    created() {
        EventBus.$on('character-score', this.onCharacterScore);
        this.fetchProfile(this.conversation.character.name);
    }

    @Hook('beforeDestroy')
    beforeDestroy() {
        EventBus.$off('character-score', this.onCharacterScore);
    }

    @Watch('conversation')
    onConversationChanged() {
        this.profileCache = null;
        this.fetchProfile(this.conversation.character.name);
    }

    onCharacterScore = (s: CharacterScoreEvent) => {
        const key = s.profile.character.name.toLowerCase();

        if (key === this.conversation.character.name.toLowerCase())
            this.fetchProfile(this.conversation.character.name);
    }

    fetchProfile(c: string) {
        this.profileCache = core.cache.profileCache.getSync(c);

        if (this.profileCache)
            this.onProfileCacheUpdate();
    }

    onProfileCacheUpdate() {
        if (!core.characters.ownProfile || !this.profileCache) // ts safety
            return;

        this.bestMatchReport = Matcher.identifyBestMatchReport(core.characters.ownProfile.character, this.profileCache.character.character, core.characters.ownCharacter.overrides, this.conversation.character.overrides);
    }


    copyToClipboard() {
        const printable_match_report = (this.$refs['matchReportPrintArea'] as HTMLTextAreaElement)?.value;
        if (!printable_match_report)
            return;

        void navigator.clipboard.writeText(printable_match_report);
        // Electron.clipboard.writeText(printable_match_report);
    }

    get bestMatchReportPrintable(): string | undefined {
        if (!this.bestMatchReport)
            return undefined;

        const { details, score, themMultiSpecies, youMultiSpecies, merged } = this.bestMatchReport;
        var { character, ...your_analysis  } = this.bestMatchReport.you.yourAnalysis;
        var { character, ...their_analysis } = this.bestMatchReport.you.theirAnalysis;

        return JSON.stringify(
            {
                details,
                score,
                merged,
                you: '',
                youMultiSpecies,  your_analysis,
                them: this.bestMatchReport.you.them.name,
                themMultiSpecies, their_analysis
            },
            undefined,
            4
        );
    }


    get yohhlrf() { return this.toggle.devMatchDetails ?? true }
    toggle = core.runtime.userToggles;
}
</script>

<style lang="scss">
#devtool-match-results-printable {
    width: 100%;
    max-height: calc(1.5em * 20);

    field-sizing: content;
    resize: none;
}
</style>
