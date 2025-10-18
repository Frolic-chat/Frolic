import { Character } from '../interfaces';

import { Matcher } from './matcher';
import { genderKinkMapping, Gender, Scoring, KinkPreference, TagId } from './matcher-types';

import NewLogger from '../helpers/log';
const ulslog = NewLogger('UserListSorter');

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
const UserListSorter = {
    getGenderPreferenceFromKink(c: Character, fchatGender: string): Scoring | null {
        const gender = Matcher.strToGender(fchatGender) || Gender.None;

        if (!(gender in genderKinkMapping))
            return null;

        const pref = Matcher.getKinkPreference(c, genderKinkMapping[gender]);

        ulslog.silly('userlist.sorter.genderfromkink', {
            character: c.name,
            fchatGender: fchatGender,
            kinkGender: gender,
            pref: pref,
        });

        if      (pref === KinkPreference.Favorite)
            return Scoring.MATCH;
        else if (pref === KinkPreference.Yes)
            return Scoring.WEAK_MATCH;
        else if (pref === KinkPreference.Maybe)
            return Scoring.WEAK_MISMATCH;
        else if (pref === KinkPreference.No)
            return Scoring.MISMATCH;
        else    // null
            return null;
    },

    GetGenderPreferenceFromOrientation(c: Character, fchatGender: string): Scoring {
        const myGender    = Matcher.getTagValueList(TagId.Gender, c);
        const orientation = Matcher.getTagValueList(TagId.Orientation, c);
        const theirGender = Matcher.strToGender(fchatGender);

        // TODO: Rip out scoreOrientationByGender and try a new version inline here, without being so cisfocused.
        const score = Matcher.scoreOrientationByGender(myGender, orientation, theirGender).score;

        ulslog.silly('userlist.sorter.genderfromorientation', {
            character: c.name,
            fchatGender: fchatGender,
            myGender: myGender,
            orientation: orientation,
            theirGender: theirGender,
            score: score,
        });

        return score;
    },
}
export default UserListSorter;
