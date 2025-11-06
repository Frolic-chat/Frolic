<template>
    <div :class="[ tagClasses, overrides.classes ]">
        <span class="infotag-label">{{ overrides.name || infotag.name }}: </span>
        <span v-if="infotag.infotag_group !== contactGroupId" class="infotag-value">{{ overrides.value || value }}</span>
        <span v-else class="infotag-value">
            <a :href="contactLink">{{ contactValue }}</a>
        </span>
    </div>
</template>

<script lang="ts">
    interface InfotagOverrides {
        classes?: string | string[] | Record<string, boolean>,
        name?:    string,
        value?:   string,
    }
    import { Component, Prop, Watch } from '@f-list/vue-ts';
    import Vue from 'vue';
    import core from '../../chat/core';
    import {CharacterInfotag, Infotag, ListItem} from '../../interfaces';
    import {formatContactLink, formatContactValue} from './contact_utils';
    import {Store} from './data_store';
    import {CONTACT_GROUP_ID} from './interfaces';
    import { MatchReport } from '../../learn/matcher';
    import { CssClassMap } from './match-report.vue';
    import { TagId } from '../../learn/matcher-types';

    import NewLogger from '../../helpers/log';
    const logG = NewLogger('custom-gender');

    @Component
    export default class InfotagView extends Vue {
        @Prop({required: true})
        readonly infotag!: Infotag;

        @Prop({required: true})
        readonly data!: CharacterInfotag;

        @Prop({required: true})
        private readonly characterMatch!: MatchReport;

        @Prop({ default: () => ({}) })
        readonly overrides!: InfotagOverrides;

        @Watch('overrides')
        reportOverrides() {
            logG.debug(`Overrides for infotag ${this.infotag.name} updated.`);
        }

        readonly contactGroupId = CONTACT_GROUP_ID;

        get tagClasses(): CssClassMap {
            const styles: CssClassMap = {
                infotag: true
            };

            // console.log(`Infotag ${this.infotag.id}: ${this.infotag.name}`, core.state.settings.risingAdScore, this.characterMatch);
            const id = parseInt(this.infotag.id as any, 10);

            if ((core.state.settings.risingAdScore) && (this.characterMatch)) {
                // console.log('MATCH');

                const scores = this.theirInterestIsRelevant(id)
                    ? this.characterMatch.them.scores
                    : (this.yourInterestIsRelevant(id) ? this.characterMatch.you.scores : null);

                // console.log('SCORES', scores);

                if (scores) {
                    const score = scores[id];

                    styles[score.getRecommendedClass()] = true;
                    styles['match-score'] = true;
                }
            }

            return styles;
        }

        theirInterestIsRelevant(id: number): boolean {
            return ((id === TagId.FurryPreference) || (id === TagId.Orientation) || (id === TagId.SubDomRole) || (id === TagId.Position) || (id === TagId.PostLength));
        }

        yourInterestIsRelevant(id: number): boolean {
            return ((id === TagId.Gender) || (id === TagId.Age) || (id === TagId.Species) || (id === TagId.BodyType));
        }

        get contactLink(): string | undefined {
            return formatContactLink(this.infotag, this.data.string!);
        }

        get contactValue(): string {
            return formatContactValue(this.infotag, this.data.string!);
        }

        get value(): string {
            switch(this.infotag.type) {
                case 'text':
                    return this.data.string!;
                case 'number':
                    if(this.infotag.allow_legacy && !this.data.number)
                        return this.data.string !== undefined ? this.data.string : '';
                    return this.data.number!.toPrecision();
            }
            const listitem = <ListItem | undefined>Store.shared.listItems[this.data.list!];
            if(typeof listitem === 'undefined')
                return '';
            return listitem.value;
        }
    }
</script>

<style lang="scss">
.quick-info-block .infotag.custom-gender {
    border: 1px solid;
    border-image: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet) 1;
}
</style>
