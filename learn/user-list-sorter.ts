// SPDX-License-Identifier: AGPL-3.0-or-later
import { Character } from '../interfaces';

import { Matcher } from './matcher';
import { genderToKinkMap, kinkToGenderMap, Gender, Scoring, KinkPreference, TagId } from './matcher-types';

import core from '../chat/core';

import NewLogger from '../helpers/log';
const ulslog = NewLogger('chat', () => core.state.generalSettings.argv.includes('--debug-chat'));

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
const UserListSorter = {
    getGenderPreferenceFromKink(c: Character, fchatGender: string): Scoring | null {
        const gender = Matcher.strToGender(fchatGender) || Gender.None;

        if (!(gender in genderToKinkMap))
            return null;

        const pref = Matcher.getKinkPreference(c, genderToKinkMap[gender]);

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

    GetGenderArray(c: Character): Gender[] | null {
        const overrides = core.characters.get(c.name).overrides.gender?.match ?? [];

        if (overrides.length) {
            return overrides
                .map(k => kinkToGenderMap[k])
                .filter((g): g is Gender => g !== undefined); // Imagine having to spell it out. Nice, TS.
        }

        const tag = Matcher.getTagValueList(TagId.Gender, c);
        return tag ? [ tag ] : null;
    },

    GetGenderPreferenceFromOrientation(you: Character, fchatGender: string): Scoring {
        const myGenders = this.GetGenderArray(you);
        const orientation = Matcher.getTagValueList(TagId.Orientation, you);

        const thatGender = Matcher.strToGender(fchatGender);
        const theirGenders = thatGender ? [ thatGender ] : null;

        const score = Matcher.scoreOrientationByGender({ gender: myGenders, orientation: orientation }, { gender: theirGenders, nonbinary: false }).score;

        ulslog.silly('userlist.sorter.genderfromorientation', {
            you: you.name,
            fchatGender,
            myGenders,
            orientation,
            thatGender,
            theirGenders,
            score,
        });

        return score;
    },
}
export default UserListSorter;
