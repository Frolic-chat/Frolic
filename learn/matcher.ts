// SPDX-License-Identifier: AGPL-3.0-or-later
import { Character, CharacterInfotag, KinkChoice } from '../interfaces';
import type { CharacterOverrides } from '../fchat/characters';

// Because matcher is loaded in the worker, we can't rely on anything that chains into core, so we must use a custom log implementation for the portion in worker. This is just NewLogger without defaults dependent on `core`.
import Logger from 'electron-log';
const we_care_about_matcher_logging = false;
const in_renderer = self.document !== undefined;
const log = {
    l:       Logger.scope('Matcher'),
    cond:    () => we_care_about_matcher_logging && in_renderer,
    debug:   (...args: any) => { if (log.cond()) log.l.debug(...args)   },
    error:   (...args: any) => { if (log.cond()) log.l.error(...args)   },
    info:    (...args: any) => { if (log.cond()) log.l.info(...args)    },
    log:     (...args: any) => { if (log.cond()) log.l.log(...args)     },
    silly:   (...args: any) => { if (log.cond()) log.l.silly(...args)   },
    verbose: (...args: any) => { if (log.cond()) log.l.verbose(...args) },
    warn:    (...args: any) => { if (log.cond()) log.l.warn(...args)    },
};

import anyAscii from 'any-ascii';

import { Store } from '../site/character_page/data_store';

import {
    BodyType,
    bodyTypeKinkMapping,
    fchatGenderMap,
    FurryPreference,
    Gender,
    genderKinkStringMap,
    genderToKinkMap,
    kinkToGenderMap,
    Kink,
    KinkBucketScore,
    kinkComparisonExclusionGroups,
    kinkComparisonExclusions,
    kinkComparisonSwaps,
    kinkMapping,
    kinkMatchScoreMap,
    kinkMatchWeights,
    KinkPreference,
    nekoMap,
    likelyHuman,
    mammalSpecies,
    nonAnthroSpecies,
    Orientation,
    Position,
    PostLengthPreference,
    postLengthPreferenceMapping,
    postLengthPreferenceScoreMapping,
    Scoring,
    Species,
    SpeciesMap,
    speciesMapping,
    SpeciesMappingCache,
    speciesNames,
    SubDomRole,
    TagId,
} from './matcher-types';

export interface MatchReport {
    _isVue: true;
    you: MatchResult;
    them: MatchResult;
    youMultiSpecies: boolean;
    themMultiSpecies: boolean;
    merged: MatchResultScores;
    score: Scoring | null;
    details: MatchScoreDetails;
}

export interface MatchResultCharacterInfo {
    species: Species | null;
    gender: Gender | null;
    orientation: Orientation | null;
}

export interface MatchResultScores {
    // String keys fix Object.entries() broken inference
    readonly [key: string]: Score;
    [key: number]: Score;
    [TagId.Gender]: Score;
    [TagId.Age]: Score;
    [TagId.Species]: Score;
    [TagId.Kinks]: Score;
}

export type OmittedScores = TagId[];

/**
 * totalScoreDimensions is a metric of how filled-out each of your profiles are. Big number means you both filled out your profiles substantially.
 * The dimensionsAtScoreLevel is a metric of consistency.
 * There's also an "above level score" used in the search results matcher (which applies additional penalties to generate your search-matching score)
 */
export interface MatchScoreDetails {
    totalScoreDimensions: number;
    dimensionsAtScoreLevel: number;
}

export interface MatchResult {
    you: Character,
    them: Character,
    scores: MatchResultScores;
    info: MatchResultCharacterInfo;
    total: number;

    yourAnalysis: CharacterAnalysis;
    theirAnalysis: CharacterAnalysis;
}


export interface ScoreClassMap {
    [key: number]: string;
}

const scoreClasses: ScoreClassMap = {
    [Scoring.MATCH]:         'match',
    [Scoring.WEAK_MATCH]:    'weak-match',
    [Scoring.NEUTRAL]:       'neutral',
    [Scoring.WEAK_MISMATCH]: 'weak-mismatch',
    [Scoring.MISMATCH]:      'mismatch',
};

const scoreIcons: ScoreClassMap = {
    [Scoring.MATCH]:         'fas fa-heart',
    [Scoring.WEAK_MATCH]:    'fas fa-thumbs-up',
    [Scoring.NEUTRAL]:       'fas fa-meh',
    [Scoring.WEAK_MISMATCH]: 'fas fa-question-circle',
    [Scoring.MISMATCH]:      'fas fa-heart-broken',
};

const scoreIconsLite: ScoreClassMap = {
    [Scoring.MATCH]:         'fa-regular fa-heart',
    [Scoring.WEAK_MATCH]:    'fa-regular fa-thumbs-up',
    [Scoring.NEUTRAL]:       'fa-regular fa-meh',
    [Scoring.WEAK_MISMATCH]: 'fa-regular fa-question-circle',
    [Scoring.MISMATCH]:      'fa-regular fa-heart-broken',
};

export class Score {
    readonly score: Scoring;
    readonly description: string;
    readonly shortDesc: string;

    constructor(score: Scoring, description: string = '', shortDesc: string = '') {
        if (score !== Scoring.NEUTRAL && description === '')
            throw new Error('Description must be provided if score is not neutral');

        this.score = score;
        this.description = description;
        this.shortDesc = shortDesc;
    }

    getRecommendedClass(): string {
        return Score.getClasses(this.score);
    }

    getRecommendedIcon(): string {
        return Score.getIcon(this.score);
    }

    static getClasses(score: Scoring): string {
        return scoreClasses[score];
    }

    static getIcon(score: Scoring): string {
        return scoreIcons[score];
    }

    static getIconLite(score: Scoring): string {
        return scoreIconsLite[score];
    }
}

export interface CharacterAnalysisVariation {
    readonly character: Character;
    readonly analysis: CharacterAnalysis;
}

export class CharacterAnalysis {
    readonly character: Character;

    readonly gender: Gender[] | null;
    readonly orientation: Orientation | null;
    readonly species: Species | null;
    readonly furryPreference: FurryPreference | null;
    readonly age: number | null;
    readonly subDomRole: SubDomRole | null;
    readonly position: Position | null;
    readonly postLengthPreference: PostLengthPreference | null;
    readonly bodyType: BodyType | null;

    /** In addition to use in the matcher, `isAnthro` is also used by smartfilters to filter anthros. */
    readonly isAnthro: boolean;
    /** In addition to use in the matcher, `isHuman` is also used by smartfilters to filter anthros. */
    readonly isHuman: boolean;
    /** In addition to use in the matcher, `isKemonomimi` is also used by smartfilters to filter anthros, as well as in the character preview to display species. */
    readonly isKemonomimi: boolean;
    readonly isMammal: boolean;

    /**
     * Checks both species and body type to determine if you qualify as both (Kemonomimi). It is used by species in the likelyHuman SpeciesMap, and in smart filters to test human/anthro filters against kemonomimi.
     */
    readonly tiltHuman: boolean;

    constructor(c: Character, overrides: CharacterOverrides = {}) {
        this.character = c;

        if (overrides.gender?.match.length) {
            this.gender = overrides.gender.match
                .map(k => kinkToGenderMap[k])
                .filter((g): g is Gender => g !== undefined); // Imagine having to spell it out. Nice, TS.
        }
        else {
            const r = Matcher.getTagValueList(TagId.Gender, c);
            this.gender = r ? [ r ] : null;
        }

        this.orientation =          Matcher.getTagValueList(TagId.Orientation, c);
        this.species =              Matcher.species(c);
        this.furryPreference =      Matcher.getTagValueList(TagId.FurryPreference, c);
        this.subDomRole =           Matcher.getTagValueList(TagId.SubDomRole, c);
        this.position =             Matcher.getTagValueList(TagId.Position, c);
        this.postLengthPreference = Matcher.getTagValueList(TagId.PostLength, c);
        this.bodyType =             Matcher.getTagValueList(TagId.BodyType, c);

        this.age = Matcher.age(c);

        if (this.species) {
            this.isAnthro =     Matcher.isAnthro(c, this.species);
            this.isHuman =      Matcher.isHuman(c, this.species);
            this.isKemonomimi = Matcher.isKemonomimi(c, this.species);
            this.isMammal =     Matcher.isMammal(c, this.species);
        }
        else {
            this.isAnthro =     false;
            this.isHuman =      false;
            this.isKemonomimi = false;
            this.isMammal =     false;

        }

        this.tiltHuman = this.isKemonomimi ? Matcher.tiltHuman(c) : false;
    }
}


/**
 * Answers the question: What YOU think about THEM
 * Never what THEY think about YOU
 *
 * So, when comparing two characters, you have to run it twice (you, them / them, you)
 * to get the full picture
 */
export class Matcher {
    readonly you:  Character;
    readonly them: Character;

    readonly yourAnalysis:  CharacterAnalysis;
    readonly theirAnalysis: CharacterAnalysis;

    constructor(source: Character, subject: Character, options?: { sourceAnalysis?: CharacterAnalysis, subjectAnalysis?: CharacterAnalysis, sourceOverrides?: CharacterOverrides, subjectOverrides?: CharacterOverrides }) {
        this.you  = source;
        this.them = subject;

        this.yourAnalysis  = options?.sourceAnalysis  || new CharacterAnalysis(source, options?.sourceOverrides);
        this.theirAnalysis = options?.subjectAnalysis || new CharacterAnalysis(subject, options?.subjectOverrides);
    }

    static generateReport(source: Character, subject: Character, sourceOverrides?: CharacterOverrides, subjectOverrides?: CharacterOverrides): MatchReport {
        const sourceAnalysis  = new CharacterAnalysis(source, sourceOverrides);
        const subjectAnalysis = new CharacterAnalysis(subject, subjectOverrides);

        const youThem = new Matcher(source,  subject, { sourceAnalysis, subjectAnalysis });
        const themYou = new Matcher(subject, source,  { sourceAnalysis: subjectAnalysis, subjectAnalysis: sourceAnalysis });

        const youThemMatch = youThem.match('their');
        const themYouMatch = themYou.match('your');

        const report: MatchReport = {
            _isVue: true,
            you:  youThemMatch,
            them: themYouMatch,
            youMultiSpecies:  false,
            themMultiSpecies: false,
            merged: Matcher.mergeResults(youThemMatch, themYouMatch),
            score: null,
            details: {
                totalScoreDimensions: 0,
                dimensionsAtScoreLevel: 0,
            },
        };

        report.score = Matcher.calculateReportScore(report);

        report.details.totalScoreDimensions = Matcher.countScoresTotal(report);
        report.details.dimensionsAtScoreLevel = Matcher.countScoresAtLevel(report, report.score) || 0;

        // log.debug('report.generate', report);

        return report;
    }

    static identifyBestMatchReport(source: Character, subject: Character, sourceOverrides: CharacterOverrides, subjectOverrides: CharacterOverrides): MatchReport {
        //const reportStartTime = Date.now();

        const yourCharacterAnalyses  = Matcher.generateAnalysisVariations(source,  sourceOverrides);
        const theirCharacterAnalyses = Matcher.generateAnalysisVariations(subject, subjectOverrides);

        let bestScore: Scoring | null = null;
        let bestScoreLevelCount = -10000;
        let bestReport: MatchReport;

        for (const yourAnalysis of yourCharacterAnalyses) {
            for (const theirAnalysis of theirCharacterAnalyses) {
                const youThem = new Matcher(
                    yourAnalysis.character, theirAnalysis.character,
                    { sourceAnalysis: yourAnalysis.analysis, subjectAnalysis: theirAnalysis.analysis });
                const themYou = new Matcher(
                    theirAnalysis.character, yourAnalysis.character,
                    { sourceAnalysis: theirAnalysis.analysis, subjectAnalysis: yourAnalysis.analysis });

                const youThemMatch = youThem.match('their');
                const themYouMatch = themYou.match('your');

                const report: MatchReport = {
                    _isVue: true,
                    you: youThemMatch,
                    them: themYouMatch,
                    youMultiSpecies: yourCharacterAnalyses.length > 1,
                    themMultiSpecies: theirCharacterAnalyses.length > 1,
                    merged: Matcher.mergeResults(youThemMatch, themYouMatch),
                    score: null,
                    details: {
                        totalScoreDimensions: 0,
                        dimensionsAtScoreLevel: 0,
                    },
                };

                report.score = Matcher.calculateReportScore(report);

                const scoreLevelCount = Matcher.countScoresAtLevel(report, report.score);

                report.details.totalScoreDimensions = Matcher.countScoresTotal(report);
                report.details.dimensionsAtScoreLevel = scoreLevelCount || 0;

                function scoreBeatsCurrent(s: Scoring, bs: Scoring, level: number, bl: number): boolean {
                    return s >= bs
                        && s * level > bl;
                }

                if (bestScore === null
                || report.score !== null && scoreLevelCount !== null
                && scoreBeatsCurrent(report.score, bestScore, scoreLevelCount, bestScoreLevelCount)) {
                    bestScore = report.score;
                    bestScoreLevelCount = scoreLevelCount !== null && report.score !== null
                        ? report.score * scoreLevelCount
                        : -1000;
                    bestReport = report;
                }
            }
        }

        // log.debug(
        //     'report.identify.best', {
        //         buildTime: Date.now() - reportStartTime,
        //         variations: yourCharacterAnalyses.length * theirCharacterAnalyses.length,
        //         report: bestReport!,
        //     }
        // );

        return bestReport!;
    }


    private static mergeResultScores(scores: MatchResultScores, results: MatchResultScores): void {
        Object.entries(scores)
            .forEach(([category, categoryScore]) => {
                if (categoryScore.score !== Scoring.NEUTRAL && (!(category in results) || categoryScore.score < results[category].score))
                    results[Number(category)] = categoryScore;
            });
    }


    static mergeResults(you: MatchResult, them: MatchResult): MatchResultScores {
        const results: MatchResultScores = {} as any;

        Matcher.mergeResultScores(you.scores,  results);
        Matcher.mergeResultScores(them.scores, results);

        return results;
    }


    static generateAnalysisVariations(c: Character, overrides: CharacterOverrides): CharacterAnalysisVariation[] {
        const speciesOptions = Matcher.getAllSpeciesAsStr(c);

        if (speciesOptions.length === 0)
            speciesOptions.push('');

        return speciesOptions.map(
            species => {
                const nc = {...c, infotags: {...c.infotags, [TagId.Species]: {string: species}}};

                return { character: nc, analysis: new CharacterAnalysis(nc, overrides) };
            }
        );
    }

    static calculateReportScore(m: MatchReport): Scoring | null {
        const yourScores =  Object.values(m.you.scores);
        const theirScores = Object.values(m.them.scores);

        const finalScore = [...yourScores, ...theirScores]
                .reduce(
                    (accum: Scoring | null, score: Score) => {
                        if (accum === null)
                            return score.score !== Scoring.NEUTRAL ? score.score : null;

                        return score.score === Scoring.NEUTRAL ? accum : Math.min(accum, score.score);
                    },
                    null
                );

        // Manage edge cases where high score may not be ideal
        if (finalScore !== null && finalScore > 0) {

            // Not enough information for accurate score
            if (yourScores.length === 0 || theirScores.length === 0) {
                return Scoring.NEUTRAL;
            }

            // Only neutral scores given
            if ( yourScores.every(n => n.score === Scoring.NEUTRAL)
            ||  theirScores.every(n => n.score === Scoring.NEUTRAL))
                return Scoring.NEUTRAL;
        }

        log.silly('matcher.score.final', {
            finalscore: finalScore,
            you: m.you.total,
            them: m.them.total,
            combined: m.you.total + m.them.total,
            mult: m.you.total * m.them.total,
        });

        return finalScore === null ? Scoring.NEUTRAL : finalScore;
    }

    match(pronoun: string): MatchResult {
        const data: MatchResult = {
            you:  this.you,
            them: this.them,

            yourAnalysis:  this.yourAnalysis,
            theirAnalysis: this.theirAnalysis,

            total: 0,

            scores: {
                [TagId.Gender]:          this.resolveGenderorOrientationScore(),
                [TagId.Age]:             this.resolveAgeScore(),
                [TagId.Species]:         this.resolveSpeciesOrFurryPreferenceScore(),
                [TagId.SubDomRole]:      this.resolveSubDomScore(),
                [TagId.Kinks]:           this.resolveKinkScore(pronoun),
                [TagId.PostLength]:      this.resolvePostLengthScore(),
                [TagId.Position]:        this.resolvePositionScore(),
                [TagId.BodyType]:        this.resolveBodyTypeScore(),
            },

            info: {
                species:     Matcher.species(this.you),
                gender:      Matcher.getTagValueList(TagId.Gender,      this.you),
                orientation: Matcher.getTagValueList(TagId.Orientation, this.you),
            },
        };


        data.total = Object.keys(data.scores)
                .reduce((accum: number, key: string) => accum + data.scores[Number(key)].score, 0);

        return data;
    }

    private resolveOrientationScore(): Score {
        const nb_rating = Matcher.getKinkPreference(this.theirAnalysis.character, Kink.Nonbinary);
        const tg_rating = Matcher.getKinkPreference(this.theirAnalysis.character, Kink.Transgenders);

        let rating = nb_rating;

        if (!tg_rating)
            rating = nb_rating;
        else if (!nb_rating)
            rating = tg_rating;
        else if (tg_rating > nb_rating)
            rating = tg_rating;

        return Matcher.scoreOrientationByGender({
            gender:      this.yourAnalysis.gender,
            orientation: this.yourAnalysis.orientation,
        }, {
            gender: this.theirAnalysis.gender,
            nonbinary: rating ? rating > 0 : false,
        });
    }


    static scoreOrientationByGender(you: { gender: Gender[] | null, orientation: Orientation | null }, them: { gender: Gender[] | null, nonbinary: boolean }): Score {
        function doesntHaveGender(g: Gender[] | null): g is null {
            return !g
                || g.length === 1 && g[0] === Gender.None;
        }

        function lovesEveryone(o: Orientation | null): boolean {
            return o === null
                || o === Orientation.Pansexual
                || o === Orientation.Asexual
                || o === Orientation.Unsure;
        }

        if (doesntHaveGender(you.gender) || doesntHaveGender(them.gender) || lovesEveryone(you.orientation))
            return new Score(Scoring.NEUTRAL);

        const yourConcrete  = Matcher.excludeNebulousGenders(...you.gender);
        const theirConcrete = Matcher.excludeNebulousGenders(...them.gender);
        if (!yourConcrete.length || !theirConcrete.length)
            return new Score(Scoring.NEUTRAL);

        if (you.orientation === Orientation.Gay && yourConcrete.some(g => theirConcrete.includes(g)))
            return new Score(Scoring.MATCH, 'Loves <span>same sex</span> partners');

        if (you.orientation === Orientation.BiFemalePreference && theirConcrete.includes(Gender.Female))
            return new Score(Scoring.MATCH, 'Loves <span>female</span> partners');
        if (you.orientation === Orientation.BiMalePreference   && theirConcrete.includes(Gender.Male))
            return new Score(Scoring.MATCH, 'Loves <span>male</span> partners');

        // CIS
        const theirCisGender = Matcher.isCisGender(...you.gender);
        const yourCisGender  =  them.nonbinary
            ? Matcher.translateNbToCis(...you.gender)
            : Matcher.isCisGender(...them.gender);

        if (theirCisGender && yourCisGender) {
            if (yourCisGender === theirCisGender) { // Gay cis
                // same sex CIS
                if (you.orientation === Orientation.Straight)
                    return new Score(Scoring.MISMATCH, 'No <span>same sex</span> partners');

                if (you.orientation === Orientation.Gay
                ||  you.orientation === Orientation.Bisexual
                ||  you.orientation === Orientation.Pansexual
                ||  you.orientation === Orientation.BiFemalePreference && theirCisGender === Gender.Female
                ||  you.orientation === Orientation.BiMalePreference   && theirCisGender === Gender.Male)
                    return new Score(Scoring.MATCH, 'Loves <span>same sex</span> partners');

                if (you.orientation === Orientation.BiCurious
                || you.orientation === Orientation.BiFemalePreference && theirCisGender === Gender.Male
                || you.orientation === Orientation.BiMalePreference   && theirCisGender === Gender.Female)
                    return new Score(Scoring.WEAK_MATCH, 'Likes <span>same sex</span> partners');
            }
            else { // Straight cis
                if (you.orientation === Orientation.Gay)
                    return new Score(Scoring.MISMATCH, 'No <span>opposite sex</span> partners');

                if (you.orientation === Orientation.Straight
                ||  you.orientation === Orientation.Bisexual
                ||  you.orientation === Orientation.BiCurious
                ||  you.orientation === Orientation.Pansexual
                ||  you.orientation === Orientation.BiFemalePreference && theirCisGender === Gender.Female
                ||  you.orientation === Orientation.BiMalePreference   && theirCisGender === Gender.Male)
                    return new Score(Scoring.MATCH, 'Loves <span>opposite sex</span> partners');

                if (you.orientation === Orientation.BiFemalePreference && theirCisGender === Gender.Male
                ||  you.orientation === Orientation.BiMalePreference   && theirCisGender === Gender.Female)
                    return new Score(Scoring.WEAK_MATCH, 'Likes <span>opposite sex</span> partners');
            }
        }

        return new Score(Scoring.NEUTRAL);

        // Orientation play kink?
    }


    static formatKinkScore(score: KinkPreference, description: string): Score {
        if (score === KinkPreference.No)
            return new Score(Scoring.MISMATCH,      `No <span>${description}</span>`);

        if (score === KinkPreference.Maybe)
            return new Score(Scoring.WEAK_MISMATCH, `Hesitant about <span>${description}</span>`);

        if (score === KinkPreference.Yes)
            return new Score(Scoring.WEAK_MATCH,    `Likes <span>${description}</span>`);

        if (score === KinkPreference.Favorite)
            return new Score(Scoring.MATCH,         `Loves <span>${description}</span>`);

        return new Score(Scoring.NEUTRAL);
    }

    private resolvePostLengthScore(): Score {
        const yourLength  = this.yourAnalysis.postLengthPreference;
        const theirLength = this.theirAnalysis.postLengthPreference;

        if (!yourLength || !theirLength
        ||  yourLength  === PostLengthPreference.NoPreference
        ||  theirLength === PostLengthPreference.NoPreference)
            return new Score(Scoring.NEUTRAL);

        let score = postLengthPreferenceScoreMapping[yourLength][theirLength];

        return this.formatScoring(score, postLengthPreferenceMapping[theirLength]);
    }

    static getSpeciesName(species: Species): string {
        return speciesNames[species] || `${Species[species].toLowerCase()}s`;
    }

    private resolveSpeciesOrFurryPreferenceScore(): Score {
        const speciesScore = this.resolveSpeciesScore();

        if (speciesScore.score === Scoring.NEUTRAL)
            return this.resolveFurryPairingsScore();
        else
            return speciesScore;
    }

    private resolveSpeciesScore(): Score {
        const you = this.you;
        const theirAnalysis = this.theirAnalysis;
        const theirSpecies = theirAnalysis.species;

        if (theirSpecies === null)
            return new Score(Scoring.NEUTRAL);

        const speciesScore = Matcher.getKinkSpeciesPreference(you, theirSpecies);
        let speciesMatch: Score | undefined;

        if (speciesScore !== null) {
            // console.log(this.them.name, speciesScore, theirSpecies);
            const speciesName = Matcher.getSpeciesName(theirSpecies);

            // Specically don't return yet in case they're kemonomimi.
            speciesMatch = Matcher.formatKinkScore(speciesScore, speciesName);
        }

        // This block bakes into speciesScore once the mapping is fleshed out.
        if (theirAnalysis.isKemonomimi) {
            const nekoScore = Matcher.getKinkPreference(you, Kink.Kemonomimi);

            if (nekoScore !== null)
                return Matcher.formatKinkScore(nekoScore, 'kemonomimi');

            const humanScore = Matcher.getKinkPreference(you, Kink.Humans);

            // They want to be perceived as human.
            if (humanScore !== null && theirAnalysis.tiltHuman)
                return Matcher.formatKinkScore(humanScore, 'kemonomimi');

            // Fall through to test isAnthro, et al.
        }

        if (speciesMatch) // Okay, they didn't match kemonomimi.
            return speciesMatch;

        if (theirAnalysis.isAnthro) {
            const anthroScore = Matcher.getKinkPreference(you, Kink.AnthroCharacters);

            if (anthroScore !== null)
                return Matcher.formatKinkScore(anthroScore, 'anthros');
        }

        if (theirAnalysis.isMammal) {
            const mammalScore = Matcher.getKinkPreference(you, Kink.Mammals);

            if (mammalScore !== null)
                return Matcher.formatKinkScore(mammalScore, 'mammals');
        }

        return new Score(Scoring.NEUTRAL);
    }

    formatScoring(score: Scoring, description: string): Score {
        let type = '';

        switch (score) {
        case Scoring.MISMATCH:
            type = 'No';
            break;

        case Scoring.WEAK_MISMATCH:
            type = 'Hesitant about';
            break;

        case Scoring.WEAK_MATCH:
            type = 'Likes';
            break;

        case Scoring.MATCH:
            type = 'Loves';
            break;
        }

        return new Score(score, `${type} <span>${description}</span>`);
    }

    private resolveFurryPairingsScore(): Score {
        const you = this.you;

        if (this.theirAnalysis.isKemonomimi) {
            const nekoPreference = Matcher.getKinkSpeciesPreference(you, Species.Kemonomimi);

            if (nekoPreference)
                return Matcher.formatKinkScore(nekoPreference, 'kemonomimi pairings');

            const doICare: FurryPreference | null = Matcher.getTagValueList(TagId.FurryPreference, you);

            //console.log('match.furryscore %d for %s', doICare, you.name);
            if (doICare === null)
                return new Score(Scoring.NEUTRAL);

            if (doICare === FurryPreference.FursAndHumans)
                return new Score(Scoring.MATCH, 'Likes <span>kemonomimi pairings</span>');

            // You have no neko preference, average your neutrality and their desire to be seen as human/furry
            if (this.theirAnalysis.tiltHuman) {
                const humanPref  = Matcher.humanLikeabilityScore(you);

                if (humanPref === Scoring.MATCH)
                    return new Score(Scoring.WEAK_MATCH, 'Prefers <span>humans</span>, may like <span>kemonomimi</span>');

                if (humanPref === Scoring.WEAK_MATCH)
                    return new Score(Scoring.NEUTRAL);

                if (humanPref === Scoring.NEUTRAL)
                    return new Score(Scoring.NEUTRAL);

                if (humanPref === Scoring.WEAK_MISMATCH)
                    return new Score(Scoring.NEUTRAL);

                if (humanPref === Scoring.MISMATCH)
                    return new Score(Scoring.WEAK_MISMATCH, 'Prefers <span>anthros</span>, may like <span>kemonomimi</span>');
            }
            else {
                const anthroPref = Matcher.furryLikeabilityScore(you);

                if (anthroPref === Scoring.MATCH)
                    return new Score(Scoring.WEAK_MATCH, 'Prefers <span>anthros</span>, may like <span>kemonomimi</span>');

                if (anthroPref === Scoring.WEAK_MATCH)
                    return new Score(Scoring.NEUTRAL);

                if (anthroPref === Scoring.NEUTRAL)
                    return new Score(Scoring.NEUTRAL);

                if (anthroPref === Scoring.WEAK_MISMATCH)
                    return new Score(Scoring.NEUTRAL);

                if (anthroPref === Scoring.MISMATCH)
                    return new Score(Scoring.WEAK_MISMATCH, 'Prefers <span>humans</span>, may like <span>kemonomimi</span>');
            }

            return new Score(Scoring.NEUTRAL);
        }

        const theyAreHuman      = this.theirAnalysis.isHuman;
        const theyAreAnthro     = this.theirAnalysis.isAnthro;

        const score = theyAreAnthro
            ? Matcher.furryLikeabilityScore(you)
            : theyAreHuman
                ? Matcher.humanLikeabilityScore(you)
                : Scoring.NEUTRAL;

        if (score === Scoring.WEAK_MATCH)
            return new Score(
                score,
                theyAreAnthro
                    ? 'Prefers <span>humans</span>, ok with anthros'
                    : 'Prefers <span>anthros</span>, ok with humans'
            );

        return this.formatScoring(
            score,
            theyAreAnthro
                ? 'furry pairings'
                : theyAreHuman
                    ? 'human pairings'
                    : ''
        );
    }

    private resolveKinkScore(pronoun: string): Score {
        // const kinkScore = this.resolveKinkBucketScore('all');

        const scores = {
            favorite: this.resolveKinkBucketScore('favorite'),
            yes: this.resolveKinkBucketScore('yes'),
            maybe: this.resolveKinkBucketScore('maybe'),
            no: this.resolveKinkBucketScore('no'),
        };

        const weighted = scores.favorite.weighted + scores.yes.weighted + scores.maybe.weighted + scores.no.weighted;

        // log.debug('report.score.kink', { them: this.them.name, you: this.you.name, scores, weight: weighted });

        if (scores.favorite.count + scores.yes.count + scores.maybe.count + scores.no.count < 10) {
            return new Score(Scoring.NEUTRAL);
        }

        if (weighted === 0) {
            return new Score(Scoring.NEUTRAL);
        }

        if (weighted < 0) {
            if (Math.abs(weighted) < kinkMatchWeights.weakMismatchThreshold) {
                return new Score(Scoring.WEAK_MISMATCH, `Hesitant about ${pronoun} <span>kinks</span>`);
            }

            return new Score(Scoring.MISMATCH, `Dislikes ${pronoun} <span>kinks</span>`);
        }

        if (Math.abs(weighted) < kinkMatchWeights.weakMatchThreshold) {
            return new Score(Scoring.WEAK_MATCH, `Likes ${pronoun} <span>kinks</span>`);
        }

        return new Score(Scoring.MATCH, `Loves ${pronoun} <span>kinks</span>`);
    }


    static furryLikeabilityScore(c: Character): Scoring {
        const furryPreference = Matcher.getTagValueList(TagId.FurryPreference, c);

        if (furryPreference === FurryPreference.FursAndHumans
        ||  furryPreference === FurryPreference.FurriesPreferredHumansOk
        ||  furryPreference === FurryPreference.FurriesOnly)
            return Scoring.MATCH;

        if (furryPreference === FurryPreference.HumansPreferredFurriesOk)
            return Scoring.WEAK_MATCH;

        if (furryPreference === FurryPreference.HumansOnly)
            return Scoring.MISMATCH;

        return Scoring.NEUTRAL;
    }

    static humanLikeabilityScore(c: Character): Scoring {
        const humanPreference = Matcher.getTagValueList(TagId.FurryPreference, c);

        if (humanPreference === FurryPreference.FursAndHumans
        ||  humanPreference === FurryPreference.HumansPreferredFurriesOk
        ||  humanPreference === FurryPreference.HumansOnly
        )
            return Scoring.MATCH;

        if (humanPreference === FurryPreference.FurriesPreferredHumansOk)
            return Scoring.WEAK_MATCH;

        if (humanPreference === FurryPreference.FurriesOnly)
            return Scoring.MISMATCH;

        return Scoring.NEUTRAL;
    }

    private resolveAgeScore(): Score {
        const you = this.you;                          // "age is possibly null" -
        const yourAge  = this.yourAnalysis.age  ?? -1; // How can a linter be so
        const theirAge = this.theirAnalysis.age ?? -1; // bad at its own language?

        // Matches: They have no age, so you can't match anything
        if (theirAge < 0)
            return new Score(Scoring.NEUTRAL);

        const underageScore = Matcher.getKinkPreference(you, Kink.UnderageCharacters);

        // Matches: You're anyone with UA kink
        if (theirAge < 18 && underageScore !== null)
            return Matcher.formatKinkScore(underageScore, 'underage characters');

        // 80 is a magic number and I'll accept debate to change it
        // The older a character is, the more nebulous o/y kinks become, so exclude large ranges.
        const bothInHumanAgeRange = yourAge  >    0 && theirAge  >    0
                                 && yourAge  <=  80 && theirAge  <=  80;

        if (bothInHumanAgeRange) {
            const ageDifference    = Math.abs(yourAge - theirAge);
            const neededDifference = Math.floor(yourAge * 0.2); // 20%, magic number

            // Matches: Any age against any age, with age difference kinks
            // A young adult with YC will match against certain UA ages without UA kink.
            if (ageDifference >= neededDifference) {
                const olderCharactersScore   = Matcher.getKinkPreference(you, Kink.OlderCharacters);
                const youngerCharactersScore = Matcher.getKinkPreference(you, Kink.YoungerCharacters);

                if (yourAge < theirAge && olderCharactersScore   !== null)
                    return Matcher.formatKinkScore(olderCharactersScore,   'older characters');

                if (yourAge > theirAge && youngerCharactersScore !== null) {
                    if      (theirAge <  18 && yourAge <= 22)
                        return Matcher.formatKinkScore(youngerCharactersScore, 'younger characters');
                    else if (theirAge >= 18)
                        return Matcher.formatKinkScore(youngerCharactersScore, 'younger characters');
                }
            }

            // Match: Adults with no kinks matching proximity (inverse of o/y)
            //     It's probably better to return neutral and let other matching factors prevail.
            //if (yourAge >= 18 && theirAge >= 18 && ageDifference < neededDifference)
            //    return new Score(Scoring.WEAK_MATCH, `Has <span>similar age</span>`);

            // Matches: UA with no kinks matching proximity (inverse of o/y)
            if (yourAge < 18 && ageDifference <= neededDifference)
                return new Score(Scoring.WEAK_MATCH, 'Has <span>similar age</span>');

            // Matches: You're adult, default.
            if (yourAge >= 18 && theirAge < 18)
                return new Score(Scoring.MISMATCH, 'No <span>minors</span>');
        }

        // Matches:
        //   You're UA, they're adult, you have no relevant kinks;
        //   You're UA, they're UA, you have >2 year gap, you have no relevant kinks;
        //   You're adult, they're adult and you have no age diff kinks;
        //   You or they are 2000 year old cosmic beings;
        //   You have no age and no relevant kinks
        return new Score(Scoring.NEUTRAL);
    }

    private resolveGenderorOrientationScore(): Score {
        const genderScore = this.resolveGenderScore();

        if (genderScore.score === Scoring.NEUTRAL)
            return this.resolveOrientationScore();
        else
            return genderScore;

    }

    private resolveGenderScore(): Score {
        const you = this.you;

        const yourGenders = this.yourAnalysis.gender;
        const yourOrientation = this.yourAnalysis.orientation;
        const theirGenders = this.theirAnalysis.gender;

        if (theirGenders === null || !theirGenders.length || theirGenders.includes(Gender.None))
            return new Score(Scoring.NEUTRAL);

        // console.log('Genders:', theirGenders, yourGenders);

        for (const theirG of theirGenders) {
            const genderKinkScore = Matcher.getKinkGenderPreference(you, theirG);

            if (genderKinkScore !== null) {
                const genderName = genderKinkStringMap[genderToKinkMap[theirG]]?.[1] ?? `${Gender[theirG]}s`;
                // console.log('Problem gender?', theirG, genderName);

                return Matcher.formatKinkScore(genderKinkScore, genderName);
            }

            if (yourGenders && yourOrientation) {
                for (const yourG of yourGenders) {
                    if (Matcher.isCisGender(yourG) && !Matcher.isCisGender(theirG)) {
                        if ([ // straight+bi orientations
                            Orientation.Straight,
                            Orientation.Gay,
                            Orientation.Bisexual,
                            Orientation.BiCurious,
                            Orientation.BiFemalePreference,
                            Orientation.BiMalePreference,
                        ].includes(yourOrientation)) {
                            const nonBinaryPref = Matcher.getKinkPreference(you, Kink.Nonbinary);
                            if (nonBinaryPref)
                                return Matcher.formatKinkScore(nonBinaryPref, 'non-binary genders');

                            return new Score(Scoring.MISMATCH, 'No <span>non-binary</span> genders');
                        }
                    }
                }
            }
        }

        return new Score(Scoring.NEUTRAL);
    }

    private resolveBodyTypeScore(): Score {
        const theirBodyType = Matcher.getTagValueList(TagId.BodyType, this.them);

        if (theirBodyType && theirBodyType in bodyTypeKinkMapping) {
            const bodyTypePreference = Matcher.getKinkPreference(this.you, bodyTypeKinkMapping[theirBodyType]);

            if (bodyTypePreference !== null) {
                return Matcher.formatKinkScore(bodyTypePreference, `${BodyType[theirBodyType].toLowerCase()}s`);
            }
        }

        return new Score(Scoring.NEUTRAL);
    }

    private resolveSubDomScore(): Score {
        const you = this.you;
        const yourSubDomRole = this.yourAnalysis.subDomRole;
        const theirSubDomRole = this.theirAnalysis.subDomRole;
        const yourRoleReversalPreference = Matcher.getKinkPreference(you, Kink.RoleReversal);

        if (!yourSubDomRole || !theirSubDomRole)
            return new Score(Scoring.NEUTRAL);

        if (yourSubDomRole === SubDomRole.UsuallyDominant) {
            if (theirSubDomRole === SubDomRole.Switch)
                return new Score(Scoring.MATCH, 'Loves <span>switches</span> (role)');

            if (theirSubDomRole === SubDomRole.AlwaysSubmissive || theirSubDomRole === SubDomRole.UsuallySubmissive)
                return new Score(Scoring.MATCH, 'Loves <span>submissives</span>');

            if (yourRoleReversalPreference === KinkPreference.Favorite)
                return new Score(Scoring.MATCH, 'Loves <span>role reversal</span>');

            if (yourRoleReversalPreference === KinkPreference.Yes)
                return new Score(Scoring.MATCH, 'Likes <span>role reversal</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>dominants</span>');
        }

        if (yourSubDomRole === SubDomRole.AlwaysDominant) {
            if (theirSubDomRole === SubDomRole.Switch)
                return new Score(Scoring.WEAK_MATCH, 'Likes <span>switches</span> (role)');

            if (theirSubDomRole === SubDomRole.AlwaysSubmissive || theirSubDomRole === SubDomRole.UsuallySubmissive)
                return new Score(Scoring.MATCH, 'Loves <span>submissives</span>');

            if (yourRoleReversalPreference === KinkPreference.Favorite)
                return new Score(Scoring.MATCH, 'Loves <span>role reversal</span>');

            if (yourRoleReversalPreference === KinkPreference.Yes)
                return new Score(Scoring.MATCH, 'Likes <span>role reversal</span>');

            if (yourSubDomRole === SubDomRole.AlwaysDominant && theirSubDomRole === SubDomRole.AlwaysDominant)
                return new Score(Scoring.MISMATCH, 'No <span>dominants</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>dominants</span>');
        }

        if (yourSubDomRole === SubDomRole.UsuallySubmissive) {
            if (theirSubDomRole === SubDomRole.Switch)
                return new Score(Scoring.MATCH, 'Loves <span>switches</span> (role)');

            if (theirSubDomRole === SubDomRole.AlwaysDominant || theirSubDomRole === SubDomRole.UsuallyDominant)
                return new Score(Scoring.MATCH, 'Loves <span>dominants</span>');

            if (yourRoleReversalPreference === KinkPreference.Favorite)
                return new Score(Scoring.MATCH, 'Loves <span>role reversal</span>');

            if (yourRoleReversalPreference === KinkPreference.Yes)
                return new Score(Scoring.MATCH, 'Likes <span>role reversal</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>submissives</span>');
        }

        if (yourSubDomRole === SubDomRole.AlwaysSubmissive) {
            if (theirSubDomRole === SubDomRole.Switch)
                return new Score(Scoring.WEAK_MATCH, 'Likes <span>switches</span> (role)');

            if (theirSubDomRole === SubDomRole.AlwaysDominant || theirSubDomRole === SubDomRole.UsuallyDominant)
                return new Score(Scoring.MATCH, 'Loves <span>dominants</span>');

            if (yourRoleReversalPreference === KinkPreference.Favorite)
                return new Score(Scoring.MATCH, 'Loves <span>role reversal</span>');

            if (yourRoleReversalPreference === KinkPreference.Yes)
                return new Score(Scoring.MATCH, 'Likes <span>role reversal</span>');

            if (yourSubDomRole === SubDomRole.AlwaysSubmissive && theirSubDomRole === SubDomRole.AlwaysSubmissive)
                return new Score(Scoring.MISMATCH, 'No <span>submissives</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>submissives</span>');
        }

        // You must be a switch
        if (theirSubDomRole === SubDomRole.Switch)
            return new Score(Scoring.MATCH, 'Loves <span>switches</span> (role)');

        // if (yourRoleReversalPreference === KinkPreference.Favorite)
        //     return new Score(Scoring.MATCH, `Loves <span>role reversal</span>`);
        //
        // if (yourRoleReversalPreference === KinkPreference.Yes)
        //     return new Score(Scoring.MATCH, `Likes <span>role reversal</span>`);

        if (theirSubDomRole === SubDomRole.AlwaysDominant || theirSubDomRole === SubDomRole.UsuallyDominant)
            return new Score(Scoring.MATCH, 'Loves <span>dominants</span>');

        if (theirSubDomRole === SubDomRole.AlwaysSubmissive || theirSubDomRole === SubDomRole.UsuallySubmissive)
            return new Score(Scoring.MATCH, 'Loves <span>submissives</span>');

        return new Score(Scoring.NEUTRAL);
    }

    private resolvePositionScore(): Score {
        const yourPosition = this.yourAnalysis.position;
        const theirPosition = this.theirAnalysis.position;

        if (!yourPosition || !theirPosition)
            return new Score(Scoring.NEUTRAL);

        if (yourPosition === Position.UsuallyTop) {
            if (theirPosition === Position.Switch)
                return new Score(Scoring.MATCH, 'Loves <span>switches</span> (position)');

            if (theirPosition === Position.AlwaysBottom || theirPosition === Position.UsuallyBottom)
                return new Score(Scoring.MATCH, 'Loves <span>bottoms</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>tops</span>');
        }

        if (yourPosition === Position.AlwaysTop) {
            if (theirPosition === Position.Switch)
                return new Score(Scoring.WEAK_MATCH, 'Likes <span>switches</span> (position)');

            if (theirPosition === Position.AlwaysBottom || theirPosition === Position.UsuallyBottom)
                return new Score(Scoring.MATCH, 'Loves <span>bottoms</span>');

            if (yourPosition === Position.AlwaysTop && theirPosition === Position.AlwaysTop)
                return new Score(Scoring.MISMATCH, 'No <span>tops</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>tops</span>');
        }

        if (yourPosition === Position.UsuallyBottom) {
            if (theirPosition === Position.Switch)
                return new Score(Scoring.MATCH, 'Loves <span>switches</span> (position)');

            if (theirPosition === Position.AlwaysTop || theirPosition === Position.UsuallyTop)
                return new Score(Scoring.MATCH, 'Loves <span>tops</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>bottoms</span>');
        }

        if (yourPosition === Position.AlwaysBottom) {
            if (theirPosition === Position.Switch)
                return new Score(Scoring.WEAK_MATCH, 'Likes <span>switches</span> (position)');

            if (theirPosition === Position.AlwaysTop || theirPosition === Position.UsuallyTop)
                return new Score(Scoring.MATCH, 'Loves <span>tops</span>');

            if (yourPosition === Position.AlwaysBottom && theirPosition === Position.AlwaysBottom)
                return new Score(Scoring.MISMATCH, 'No <span>bottoms</span>');

            return new Score(Scoring.WEAK_MISMATCH, 'Hesitant about <span>bottoms</span>');
        }

        // You must be a switch
        if (theirPosition === Position.Switch)
            return new Score(Scoring.MATCH, 'Loves <span>switches</span> (position)');

        // if (yourRoleReversalPreference === KinkPreference.Favorite)
        //     return new Score(Scoring.MATCH, `Loves <span>role reversal</span>`);
        //
        // if (yourRoleReversalPreference === KinkPreference.Yes)
        //     return new Score(Scoring.MATCH, `Likes <span>role reversal</span>`);

        if (theirPosition === Position.AlwaysTop || theirPosition === Position.UsuallyTop)
            return new Score(Scoring.MATCH, 'Loves <span>tops</span>');

        if (theirPosition === Position.AlwaysBottom || theirPosition === Position.UsuallyBottom)
            return new Score(Scoring.MATCH, 'Loves <span>bottoms</span>');

        return new Score(Scoring.NEUTRAL);
    }


    private resolveKinkBucketScore(bucket: 'all' | 'favorite' | 'yes' | 'maybe' | 'no' | 'positive' | 'negative'): KinkBucketScore {
        const yourKinks = Matcher.getAllStandardKinks(this.you);
        const theirKinks = Matcher.getAllStandardKinks(this.them);

        // let missed = 0;

        const result: KinkBucketScore = Object.entries(yourKinks).reduce(
            (accum, [yourKinkIdStr, yourKinkValue]) => {
                const yourKinkId = Number(yourKinkIdStr);
                const theirKinkId = yourKinkId in kinkComparisonSwaps
                    ? kinkComparisonSwaps[yourKinkId]
                    : yourKinkId;

                const isExcluded = yourKinkId in kinkComparisonExclusions
                    || Store.shared.kinks[yourKinkId] && Store.shared.kinks[yourKinkId].kink_group in kinkComparisonExclusionGroups;

                const isBucketMatch = yourKinkValue === bucket
                    || bucket === 'all'
                    || bucket === 'negative' && (yourKinkValue === 'no' || yourKinkValue === 'maybe')
                    || bucket === 'positive' && (yourKinkValue === 'favorite' || yourKinkValue === 'yes');

                if (isBucketMatch && !isExcluded)
                    accum.total += 1;

                if (!(theirKinkId in theirKinks) || isExcluded)
                    return accum;

                const theirKinkValue = theirKinks[theirKinkId];

                if (isBucketMatch) {
                    return {
                        score: accum.score + this.getKinkMatchScore(yourKinkValue, theirKinkValue),
                        count: accum.count + 1,
                        total: accum.total,
                        weighted: 0,
                    };
                }

                return accum;
            },
            { score: 0, count: 0, total: 0, weighted: 0 }
        );

        // const yourBucketCounts = this.countKinksByBucket(yourKinks);
        // const theirBucketCounts = this.countKinksByBucket(theirKinks);

        result.weighted = result.count === 0 || Math.abs(result.score) < 1
            ? 0
            : Math.log(result.total) * Math.log(Math.abs(result.score)) * Math.sign(result.score);

        return result;
    }

    // private countKinksByBucket(kinks: { [key: number]: KinkChoice }): { favorite: number, yes: number, maybe: number, no: number } {
    //     return _.reduce(
    //       kinks,
    //       (accum, kinkValue) => {
    //         accum[kinkValue] += 1;
    //         return accum;
    //       },
    //       {
    //         favorite: 0,
    //         yes: 0,
    //         maybe: 0,
    //         no: 0
    //       }
    //     );
    // }

    static getAllStandardKinks(c: Character): { [key: number]: KinkChoice } {
        const kinks = Object.fromEntries(Object.entries(c.kinks)
                .filter(([_, value]) => typeof value === 'string')
        ) as { [key: number]: KinkChoice };

        Object.values(c.customs)
                .forEach(custom => custom?.children?.forEach(c => kinks[c] = custom.choice));

        return kinks;
    }

    static findKinkById(c: Character, kinkId: number): KinkChoice | number | undefined {
        if (kinkId in c.kinks)
            return c.kinks[kinkId];

        for (const custom of Object.values(c.customs)) {
            if (custom?.children?.includes(kinkId))
                return custom.choice;
        }

        return undefined;
    }


    private getKinkMatchScore(aValue: KinkChoice, bValue: KinkChoice): number {
        return (kinkMatchScoreMap[aValue]?.[bValue] ?? 0) * 7; // forces range above 1.0
    }


    static getTagValue(tagId: number, c: Character): CharacterInfotag | undefined {
        return c.infotags[tagId];
    }

    static getTagValueList(tagId: number, c: Character): number | null {
        const t = Matcher.getTagValue(tagId, c);

        if (!t?.list)
            return null;

        return t.list;
    }

    /**
     * Selecting non-ambiguous genders results in faster match-making.
     */
    static isCisGender(...genders: Gender[]): Gender.Male | Gender.Female | false {
        const nb = new Set([ Gender.Herm, Gender.MaleHerm, Gender.Cuntboy, Gender.Shemale, Gender.Transman, Gender.Transwoman, Gender.Transgender, Gender.Nonbinary, Gender.None ]);

        for (const g of genders) {
            if (nb.has(g))
                return false;
        }

        const m = new Set([ Gender.Male,   Gender.Femboy ]);
        const f = new Set([ Gender.Female, Gender.Tomboy ]);

        if (genders.some(g => m.has(g)) && genders.every(g => !f.has(g)))
            return Gender.Male;

        if (genders.some(g => f.has(g)) && genders.every(g => !m.has(g)))
            return Gender.Female;

        return false;
    }

    static translateNbToCis(...genders: Gender[]): Gender.Male | Gender.Female | false {
        const m_map = new Set([ Gender.MaleHerm, Gender.Cuntboy, Gender.Transman,   Gender.Femboy, Gender.Male   ]);
        const f_map = new Set([ Gender.Herm,     Gender.Shemale, Gender.Transwoman, Gender.Tomboy, Gender.Female ]);
        // const b_map = new Set([ Gender.Transgender, Gender.Nonbinary, Gender.None ]);

        if (genders.some(g => m_map.has(g)) && genders.every(g => !f_map.has(g)))
            return Gender.Male;

        if (genders.some(g => f_map.has(g)) && genders.every(g => !m_map.has(g)))
            return Gender.Female;

        return false;
    }

    /**
     * Used as a last-ditch effort after all the good ways to resolve gender compatibility have been exhausted without match.
     */
    static excludeNebulousGenders(...genders: Gender[]): Gender[] {
        const sanitized = genders.filter(g => ![Gender.Androgynous, Gender.Feminine, Gender.Masculine, Gender.Nonbinary, Gender.None, Gender.Transgender].includes(g));

        const femb = sanitized.indexOf(Gender.Femboy);
        if (femb > -1) {
            if (sanitized.includes(Gender.Male))
                sanitized.splice(femb, 1);
            else
                sanitized.splice(femb, 1, Gender.Male);
        }

        const tomb = sanitized.indexOf(Gender.Tomboy);
        if (tomb > -1) {
            if (sanitized.includes(Gender.Female))
                sanitized.splice(tomb, 1);
            else
                sanitized.splice(tomb, 1, Gender.Female);
        }

        return sanitized;
    }

    static getKinkPreference(c: Character, kinkId: number): KinkPreference | null {
        const kinkVal = Matcher.findKinkById(c, kinkId);

        if (kinkVal === undefined)
            return null;

        if (typeof kinkVal === 'string')
            return kinkMapping[kinkVal];

        const custom = c.customs[kinkVal];

        if (!custom)
            return null;

        return kinkMapping[custom.choice];
    }

    static getKinkGenderPreference(c: Character, gender: Gender): KinkPreference | null {
        if (gender in genderToKinkMap) // TS cannot figure out runtime assertion so f it
            return Matcher.getKinkPreference(c, genderToKinkMap[gender]);
        else
            return null;
    }

    static getKinkSpeciesPreference(c: Character, species: Species): KinkPreference | null {
        return Matcher.getKinkPreference(c, species);
    }

    static has(c: Character, kinkId: Kink): boolean {
        const r = Matcher.getKinkPreference(c, kinkId);

        return r !== null;
    }

    static isMammal(c: Character, species: Species | null = null): boolean {
        if (!species)
            species = Matcher.species(c);

        if (!species)
            return false;

        return mammalSpecies.includes(species);
    }

    static isAnthro(c: Character, species: Species | null = null): boolean {
        const bodyTypeId: BodyType | null = Matcher.getTagValueList(TagId.BodyType, c);

        if (bodyTypeId === BodyType.Anthro)
            return true;

        if (!species)
            species = Matcher.species(c);

        if (!species)
            return false;

        return !nonAnthroSpecies.includes(species);
    }

    static isHuman(c: Character, species: Species | null = null): boolean {
        const bodyTypeId: BodyType | null = Matcher.getTagValueList(TagId.BodyType, c);

        if (bodyTypeId === BodyType.Human)
            return true;

        if (!species) species = Matcher.species(c);

        return species === Species.Human;
    }

    static getMappedKemonomimiSpecies(c: Character): Species | null {
        const speciesTag = Matcher.getTagValue(TagId.Species, c);
        if (!speciesTag?.string)
            return null;

        Matcher.ensureMapsAreBuilt();

        const mappedSpecies = Matcher.matchMappedSpecies(speciesTag.string, Matcher.nekoCache!)
                           || Matcher.matchMappedSpecies(speciesTag.string, Matcher.nekoCache!, true);

        if (mappedSpecies) log.debug('species.kemonomimi.mapped', { character: c.name, species: mappedSpecies });

        return mappedSpecies;
    }

    /**
     * There are two ways to be a kemonomimi:
     * explicity match a neko species; or, human bodytype but anthro primary species.
     * The inclusion of Species.Kemonomimi can't be done yet; we want kemonomimi to return their anthro species as well as being kemonomimi. Someone who says they don't want anteaters probably also doesn't want anteatergirls, so we need to track their anthro species.
     * If we move to a "species phrase" = [taglist] layout, then we can fully encapsulate that a foxgirl is both a fox, kemomimi, mammal, and possibly human species all in one.
     */
    static isKemonomimi(c: Character, species: Species | null = null): boolean {
        if (!species)
            species = Matcher.species(c);

        if (!species)
            return false;

        //log.verbose('species.kemonomimi.test', { c: c.name, s: Species[species], sk: Species[Species.Kemonomimi], ts: typeof species, tsk: typeof Species.Kemonomimi });
        if (species === Species.Kemonomimi) {
            log.debug('species.kemonomimi.direct', { character: c.name, species: species });
            return true;
        }

        // Nonhuman but human body type.
        const bodyTypeId: BodyType | null = Matcher.getTagValueList(TagId.BodyType, c);
        if (bodyTypeId === BodyType.Human && !nonAnthroSpecies.includes(species)) {
            log.debug('species.kemomimi.indirect', { character: c.name, species: species });
            return true;
        }

        // Species in both non-human and neko maps.
        return !!Matcher.getMappedKemonomimiSpecies(c);
    }

    /**
     * Checks for deliberate signs that a character prefers humans over furries.
     * This can change how a kemonomimi gets matched against human/furry preference.
     *
     * This does not validate that you are kemonomimi! It can be used for any species.
     */
    static tiltHuman(c: Character): boolean {
        const preference: FurryPreference = Matcher.getTagValueList(TagId.FurryPreference, c) || FurryPreference.FursAndHumans;

        // You are what you eat.
        if (preference === FurryPreference.HumansOnly
        ||  preference === FurryPreference.HumansPreferredFurriesOk) {
            log.debug('tilthuman.shortcircuit', { character: c.name, pref: 'human' });
            return true;
        }
        else if (preference === FurryPreference.FurriesOnly
        ||       preference === FurryPreference.FurriesPreferredHumansOk) {
            log.debug('tilthuman.shortcircuit', { character: c.name, pref: 'furry' });
            return false;
        }

        // You are what you clearly demonstrate a liking for.
        const h = Matcher.getKinkSpeciesPreference(c, Species.Human);
        const f = Matcher.getKinkSpeciesPreference(c, Species.Anthro);
        const likesHumans     = h === KinkPreference.Favorite
                             || h === KinkPreference.Yes;
        const dislikesHumans  = h === KinkPreference.Maybe
                             || h === KinkPreference.No;
        const likesFurries    = f === KinkPreference.Favorite
                             || f === KinkPreference.Yes;
        const dislikesFurries = f === KinkPreference.Maybe
                             || f === KinkPreference.No;

        log.debug('tilthuman.preference', { character: c.name, humanpref:  h, anthropref: f });

        if (likesHumans && !likesFurries || dislikesFurries && !dislikesHumans)
            return true;

        return false;
    }

    static species(c: Character): Species | null {
        const mySpecies = Matcher.getTagValue(TagId.Species, c);

        if (!mySpecies?.string) {
            const noFurries = Matcher.furryLikeabilityScore(c) === Scoring.MISMATCH;
            const noAnthros = Matcher.getKinkSpeciesPreference(c, Species.Anthro) === KinkPreference.No;

            if (noFurries || noAnthros)
                return Species.Human; // Logical best guess

            return null;
        }

        const s = Matcher.getMappedSpecies(mySpecies.string);

        if (!s) log.debug('matcher.species.unknown', { character: c.name, species: mySpecies.string });

        return s;
    }

    static generateSpeciesMappingCache(mapping: SpeciesMap): SpeciesMappingCache {
        return Object.fromEntries(
            Object.entries(mapping).map(([key, speciesPhraseList]) => [
                key,
                speciesPhraseList.map(mappedPhrase => {
                    // this is weak: elf -> elves doesn't occur
                    const phrasePlural = `${mappedPhrase}s`;

                    return {
                        mappedPhrase,
                        regexp: RegExp(`(^|\\b)(${mappedPhrase}|${phrasePlural})($|\\b)`),
                    };
                })
            ])
        );
    }

    private static speciesMappingCache?: SpeciesMappingCache;
    private static likelyHumanCache?:    SpeciesMappingCache;
    private static nekoCache?:           SpeciesMappingCache;

    private static matchMappedSpecies(species: string, mapping: SpeciesMappingCache, skipAscii: boolean = false): Species | null {
        let foundSpeciesId: Species | null = null;
        let match = '';

        const finalSpecies = (skipAscii ? species : anyAscii(species)).toLowerCase().trim();

        Object.entries(mapping).forEach(([speciesId, matchers]) => {
            matchers.forEach(matcher => {
                if (matcher.mappedPhrase.length > match.length && matcher.regexp.test(finalSpecies)) {
                    match = matcher.mappedPhrase;
                    foundSpeciesId = Number(speciesId);
                }
            });
        });

        return foundSpeciesId;
    }

    static ensureMapsAreBuilt(): void {
        if (!Matcher.speciesMappingCache)
            Matcher.speciesMappingCache = Matcher.generateSpeciesMappingCache(speciesMapping);
        if (!Matcher.likelyHumanCache)
            Matcher.likelyHumanCache =    Matcher.generateSpeciesMappingCache(likelyHuman);
        if (!Matcher.nekoCache)
            Matcher.nekoCache =           Matcher.generateSpeciesMappingCache(nekoMap);
    }

    static getMappedSpecies(species: string): Species | null {
        Matcher.ensureMapsAreBuilt();

        const mappedSpecies = Matcher.matchMappedSpecies(species, Matcher.speciesMappingCache!)
                           ?? Matcher.matchMappedSpecies(species, Matcher.speciesMappingCache!, true);

        const maybeHuman    = Matcher.matchMappedSpecies(species, Matcher.likelyHumanCache!)
                           ?? Matcher.matchMappedSpecies(species, Matcher.likelyHumanCache!, true);

        // log.debug('matcher.getMappedSpecies', { mappedspecies: mappedSpecies, maybehuman: maybeHuman });

        return mappedSpecies ?? maybeHuman;
    }

    static getAllSpecies(c: Character): Species[] {
        // Returns strings, convert back to species.
        const species = Matcher.getAllSpeciesAsStr(c);

        return species
            .map(s => Matcher.getMappedSpecies(s))
            .filter((s): s is Species => s !== null);
    }

    static getAllSpeciesAsStr(c: Character): string[] {
        const mySpecies = Matcher.getTagValue(TagId.Species, c);

        if (!mySpecies?.string)
            return [];

        const speciesStr = mySpecies.string.toLowerCase().replace(/optionally|alternatively/g, ',')
                .replace(/[)(]/g, ' ').trim();
        const matches = speciesStr.split(/[,]? or |,/);

        return matches
            .map(m => m.toLowerCase().trim())
            .filter(m => m !== '');
    }

    static strToGender(fchatGenderStr: string | undefined): Gender | null {
        if (!fchatGenderStr)
            return null;

        if (fchatGenderStr in fchatGenderMap)
            return fchatGenderMap[fchatGenderStr];

        return null;
    }


    static countScoresAtLevel(
        m: MatchReport, scoreLevel: Scoring | null,
        skipYours: boolean = false,
        skipTheirs: boolean = false
    ): number | null {
        if (scoreLevel === null) {
            return null;
        }

        const yourScores  = skipYours  ? [] : Object.values(m.you.scores);
        const theirScores = skipTheirs ? [] : Object.values(m.them.scores);

        return [ ...yourScores, ...theirScores ].reduce(
            (accum, score) => accum + (score.score === scoreLevel ? 1 : 0),
            0
        );
    }

    static countScoresAboveLevel(
        m: MatchReport, scoreLevel: Scoring | null,
        skipYours: boolean = false,
        skipTheirs: boolean = false
    ): number {
        if (scoreLevel === null) {
            return 0;
        }

        const yourScores  = skipYours  ? [] : Object.values(m.you.scores);
        const theirScores = skipTheirs ? [] : Object.values(m.them.scores);

        return [ ...yourScores, ...theirScores ].reduce(
            (accum, score) => accum + (score.score > scoreLevel && score.score !== Scoring.NEUTRAL ? 1 : 0),
            0
        );
    }

    static countScoresTotal(m: MatchReport): number {
        return Object.values(m.you.scores).length
             + Object.values(m.them.scores).length;
    }

    static age(c: Character): number | null {
        const rawAge = Matcher.getTagValue(TagId.Age, c);

        if (!rawAge?.string)
            return null;

        /**
         * There are strings/emoji that give no hint to a number, but are still
         * very useful for matching, so they should be used even inefficiently.
         */

        function commonString(ageStr: string): boolean {
            return ageStr.includes('shota') || ageStr.includes('loli')
                || ageStr.includes('cub') || ageStr.includes('pup')
        }

        function isBaby(ageStr: string): boolean {
            return ageStr.includes('👶')
                || ageStr.includes('🍼')
                || ageStr.includes('🚼');
        }

        function genericMatch(ageStr: string): boolean {
            return ageStr.includes('🔞');
        }

        const ageStr = rawAge.string.toLowerCase().replace(/[,.]/g, '').trim();

        if (isBaby(ageStr))
            return 7;

        if (commonString(ageStr))
            return 10;

        if (genericMatch(ageStr))
            return 13;

        let age: number | null = null;

        const exactMatch = /^[0-9]+$/.exec(ageStr);
        const rangeMatch = exactMatch ? null : ageStr.match(/^([0-9]+)-([0-9]+)$/);

        if (exactMatch) {
            // '18'
            age = parseInt(rawAge.string, 10);
        }
        else if (rangeMatch) {
            // '18-22'
            const v1 = parseInt(rangeMatch[1], 10);
            const v2 = parseInt(rangeMatch[2], 10);

            age = Math.min(v1, v2);
        }

        return age && !Number.isNaN(age) && Number.isFinite(age) ? age : null;
    }

    static apparentAge(c: Character): { min: number, max: number } | null {
        const rawAge = Matcher.getTagValue(TagId.ApparentAge, c);

        if (!rawAge || !rawAge.string) {
            return null;
        }

        const ageStr = rawAge.string.toLowerCase().replace(/[,.]/g, '').trim();

        if (ageStr === '') {
            return null;
        }

        // '18'
        if (/^[0-9]+$/.exec(ageStr)) {
            const val = parseInt(rawAge.string, 10);

            return { min: val, max: val };
        }

        // '18-22'
        const rangeMatch = ageStr.match(/^([0-9]+)-([0-9]+)$/);

        if (rangeMatch) {
            const v1 = parseInt(rangeMatch[1], 10);
            const v2 = parseInt(rangeMatch[2], 10);

            return { min: Math.min(v1, v2), max: Math.max(v1, v2) };
        }

        if ((ageStr.includes('shota')) || (ageStr.includes('loli'))
            || (ageStr.includes('lolli')) || (ageStr.includes('pup'))) {
            return { min: 10, max: 10 };
        }

        return null;
    }

    static calculateSearchScoreForMatch(
        score: Scoring,
        match: MatchReport,
        penalty: number
    ): number {
        const totalScoreDimensions = Matcher.countScoresTotal(match);
        const dimensionsAtScoreLevel = Matcher.countScoresAtLevel(match, score) || 0;
        const dimensionsAboveScoreLevel = Matcher.countScoresAboveLevel(match, Math.max(score, Scoring.WEAK_MATCH));

        let atLevelScore    = 0,
            aboveLevelScore = 0,

            theirAtLevelDimensions    = 0,
            theirAboveLevelDimensions = 0,

            atLevelMul    = 0,
            aboveLevelMul = 0;

        if (dimensionsAtScoreLevel > 0 && totalScoreDimensions > 0) {
            const matchRatio = dimensionsAtScoreLevel / totalScoreDimensions;
            theirAtLevelDimensions = Matcher.countScoresAtLevel(match, score, true, false) || 0;

          // 1.0 == bad balance; 0.0 == ideal balance
            atLevelMul = Math.abs(theirAtLevelDimensions / dimensionsAtScoreLevel - 0.5) * 2;

            atLevelScore = (1 - atLevelMul * 0.5) * Math.pow(dimensionsAtScoreLevel, matchRatio);
        }

        if (dimensionsAboveScoreLevel > 0 && totalScoreDimensions > 0) {
            const matchRatio = dimensionsAboveScoreLevel / totalScoreDimensions;

            theirAboveLevelDimensions = Matcher.countScoresAboveLevel(match, score, true, false) || 0;

          // 1.0 == bad balance; 0.0 == ideal balance
            aboveLevelMul = Math.abs(theirAboveLevelDimensions / dimensionsAboveScoreLevel - 0.5) * 2;

            aboveLevelScore = (1 - aboveLevelMul * 0.5) * Math.pow(dimensionsAboveScoreLevel, matchRatio);
        }

        // const kinkScore = match.you.kinkScore.weighted;

        log.silly(
            'report.score.search',
            match.you.you.name,
            match.them.you.name,
            {
                you: match.you.you.name,
                them: match.them.you.name,
                searchScore: atLevelScore + aboveLevelScore,
                atLevelScore,
                aboveLevelScore,
                atLevelMul,
                aboveLevelMul,
                dimensionsAboveScoreLevel,
                dimensionsAtScoreLevel,
                theirAtLevelDimensions,
                theirAboveLevelDimensions,
                penalty,
            }
        );

        return atLevelScore + aboveLevelScore + penalty;
    }
}

log.debug('init.matcher');
