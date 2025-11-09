// SPDX-License-Identifier: AGPL-3.0-or-later
import {Character as ComplexCharacter, CharacterGroup, Guestbook} from '../../site/character_page/interfaces';
import { CharacterImage, SimpleCharacter } from '../../interfaces';
import { CharacterOverrides } from '../../fchat/characters';
import { FurryPreference, Gender, Orientation, Species } from '../matcher-types';

// This design should be refactored; it's bad
export interface ProfileRecord {
    id:             string;
    name:           string;
    profileData:    ComplexCharacter;
    firstSeen:      number;
    lastFetched:    number;
    gender:          Gender          | null;
    orientation:     Orientation     | null;
    furryPreference: FurryPreference | null;
    species:         Species         | null;
    age:             number          | null;
    domSubRole:      number          | null;
    position:        number          | null;

    lastMetaFetched: number            | null;
    guestbook:       Guestbook         | null;
    images:          CharacterImage[]  | null;
    friends:         SimpleCharacter[] | null;
    groups:          CharacterGroup[]  | null;

    // lastCounted:    number | null;
    // guestbookCount: number | null;
    // friendCount:    number | null;
    // groupCount:     number | null;
}

/**
 * Character overrides but with lastFetched information added by the store worker.
 */
export interface OverrideRecord extends CharacterOverrides {
    id: string;
    lastFetched: number;
}

export type ProfileRecordBatch      = Record<string, ProfileRecord>;
export type CharacterOverridesBatch = Record<string, CharacterOverrides>;

// export type Statement = any;
// export type Database = any;

export interface PermanentIndexedStore {
    getProfile(name: string): Promise<ProfileRecord | undefined>;
    storeProfile(c: ComplexCharacter): Promise<void>;
    //getProfileBatch(names: string[]): Promise<ProfileRecordBatch>;
    getOverrides(name: string): Promise<OverrideRecord | undefined>;
    storeOverrides(name: string, o: CharacterOverrides): Promise<void>;
    getOverridesBatch(names: string[]): Promise<CharacterOverridesBatch>;

    updateProfileMeta(
        name:      string,
        images:    CharacterImage[]  | null,
        guestbook: Guestbook         | null,
        friends:   SimpleCharacter[] | null,
        groups:    CharacterGroup[]  | null
    ): Promise<void>;

    flushProfiles(daysToExpire: number): Promise<void>;
    flushOverrides(daysToExpire: number): Promise<void>;

    start(): Promise<void>;
    stop(): Promise<void>;
}
