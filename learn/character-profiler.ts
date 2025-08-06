import core from '../chat/core';
import { Character as CharacterFChatInf } from '../fchat';
import { Character as ComplexCharacter } from '../site/character_page/interfaces';
import { Matcher } from './matcher';
import { AdCache } from './ad-cache';
import { TagId } from './matcher-types';
import { Scoring } from './matcher-types';


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
    calculateInterestScore(characterName: string): number {
        const c = core.characters.get(characterName);

        if (!c)
            return 0;

        const genderScore = this.getInterestScoreForGender(this.me, c);
        const statusScore = this.getInterestScoreForStatus(c);
        const adScore = (genderScore > 0) ? this.getLastAdvertisementStatus(c) : Scoring.NEUTRAL;
        const friendlyScore = this.getInterestScoreForFriendlies(c);

        // tslint:disable-next-line: number-literal-format binary-expression-operand-order
        const score = ((1.0 * genderScore) + (1.0 * statusScore) + (1.0 * adScore) + (1.0 * friendlyScore));

        // tslint:disable-next-line: number-literal-format binary-expression-operand-order
        return (c.status === 'looking') ? score + 10.0 : score;
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

        if (!g)
            return Scoring.NEUTRAL;

        const myGender = Matcher.getTagValueList(TagId.Gender, me.character);
        const myOrientation = Matcher.getTagValueList(TagId.Orientation, me.character);
        const score = Matcher.scoreOrientationByGender(myGender, myOrientation, g);

        return score.score;
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
        const ads = this.adCache.get(c.name);

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
