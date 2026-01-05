import core from '../chat/core';
import { Character as CharacterFChatInf } from '../fchat';
import { Character as ComplexCharacter } from '../site/character_page/interfaces';
import { Matcher } from './matcher';
import { AdCache } from './ad-cache';
import { TagId } from './matcher-types';
import { Scoring } from './matcher-types';
import UserListSorter from './user-list-sorter';

import NewLogger from '../helpers/log';
const logC = NewLogger('cache', () => core?.state.generalSettings.argv.includes('--debug-cache'));


export class CharacterProfiler {
    static readonly ADVERTISEMENT_RECENT_RANGE = 22 * 60 * 1000;
    static readonly ADVERTISEMENT_POTENTIAL_RAGE = 50 * 60 * 1000;

    protected adCache: AdCache;
    protected me: ComplexCharacter;

    constructor(me: ComplexCharacter, adCache: AdCache) {
        this.me = me;
        this.adCache = adCache;
    }

    /**
     * Although this is exclusively used by the profile cache manager, it could easily be supported as a General Relationship Tracker (eidols).
     * @param characterName
     * @returns Numerical rating used to reorganize the profile queue; higher scores to the front
     */
    calculateInterestScore(characterName: string, offset: number = 0): number {
        // It may be appropriate to use getAsync here to wait for overrides to resolve.
        const c = core.characters.get(characterName);

        const genderScore = this.getInterestScoreForGender(this.me, c);
        const statusScore = this.getInterestScoreForStatus(c);
        const adScore = (genderScore > 0) ? this.getLastAdvertisementStatus(c) : Scoring.NEUTRAL;
        const friendlyScore = this.getInterestScoreForFriendlies(c);

        logC.debug('CharacterProfiler.calculateInterestScore.results', {
            characterName,
            genderScore,
            statusScore,
            adScore,
            friendlyScore,
            offset,
        });

        return 1.0 * genderScore
             + 1.0 * statusScore
             + 1.0 * adScore
             + 1.0 * friendlyScore
             + offset;
    }


    getInterestScoreForFriendlies(c: CharacterFChatInf.Character): Scoring {
        if (c.isFriend)
            return Scoring.MATCH;

        if (c.isBookmarked)
            return Scoring.WEAK_MATCH;

        if (c.isIgnored)
            return Scoring.MISMATCH;

        // Hidden users includes this user?

        return Scoring.NEUTRAL;
    }


    getInterestScoreForGender(me: ComplexCharacter, c: CharacterFChatInf.Character): Scoring {
        const g = Matcher.strToGender(c.gender);

        if (!g) {
            logC.warn('CharacterProfiler.getInterestScoreForGender.noGender', g);
            return Scoring.NEUTRAL;
        }

        const myGender = UserListSorter.GetGenderArray(me.character);
        const myOrientation = Matcher.getTagValueList(TagId.Orientation, me.character);
        const score = Matcher.scoreOrientationByGender({ gender: myGender, orientation: myOrientation}, { gender: [ g ], nonbinary: false }).score;

        logC.silly('CharacterProfiler.getInterestScoreForGender.result', { myGender, myOrientation, score });

        return score;
    }


    getInterestScoreForStatus(c: CharacterFChatInf.Character): Scoring {
        switch (c.status){
        case 'offline':
        case 'away':
        case 'busy':
        case 'dnd':
            return Scoring.WEAK_MISMATCH;
        case 'looking':
            return Scoring.WEAK_MATCH;
        default:
            return Scoring.NEUTRAL;
        }
    }


    getLastAdvertisementStatus(c: CharacterFChatInf.Character): Scoring {
        const ads = this.adCache.getSync(c.name);

        if (!ads)
            return Scoring.NEUTRAL;

        const lastPost = ads.getDateLastPosted();

        if (!lastPost)
            return Scoring.NEUTRAL;

        const delta = Date.now() - lastPost.getTime();

        if (delta < CharacterProfiler.ADVERTISEMENT_RECENT_RANGE)
            return Scoring.MATCH;

        if (delta < CharacterProfiler.ADVERTISEMENT_POTENTIAL_RAGE)
            return Scoring.WEAK_MATCH;

        // has been advertising, but not recently, so likely busy
        return Scoring.WEAK_MISMATCH;
    }
}
