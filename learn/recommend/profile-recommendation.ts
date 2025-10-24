import Axios from 'axios';
import { CharacterAnalysis, Matcher } from '../matcher';
import { FurryPreference, Kink, mammalSpecies, Species } from '../matcher-types';
import core from '../../chat/core';
import { ProfileCache } from '../profile-cache';
import l from '../../chat/localize';

export enum ProfileRecommendationLevel {
    INFO = 'info',
    NOTE = 'note',
    CRITICAL = 'critical'
}

export interface ProfileRecommendationUrlParams {
    // TBD
}

export interface ProfileRecommendation {
    code: string;
    level: ProfileRecommendationLevel;
    title: string;
    desc: string;
    helpUrl?: string;
    urlParams?: ProfileRecommendationUrlParams
}

export class ProfileRecommendationAnalyzer {
    protected recommendations: ProfileRecommendation[] = [];

    constructor(protected readonly profile: CharacterAnalysis) {
        //
    }

    protected add(code: string, level: ProfileRecommendationLevel, title: string, desc: string, helpUrl?: string, urlParams?: ProfileRecommendationUrlParams): void {
        this.recommendations.push({ code, level, title, desc, helpUrl, urlParams });
    }

    async analyze(): Promise<ProfileRecommendation[]> {
        this.recommendations = [];

        await this.checkPortrait();
        await this.checkHqPortrait();

        this.checkMissingProperties();
        this.checkSpeciesPreferences();
        this.checkKinkCounts();
        this.checkCustomKinks();

        this.checkImages();
        this.checkInlineImage();
        this.checkDescriptionLength();
        this.checkColorCodes();

        return this.recommendations;
    }

    protected async checkPortrait(): Promise<void> {
        const portraitUrl = core.characters.getImage(this.profile.character.name);

        const result = await Axios.head(portraitUrl);

        if (result.headers.etag && result.headers.etag.replace(/(?:^"+)|(?:"+$)/, '').trim().toLowerCase() === '639d154d-16c3') {
            this.add(`ADD_AVATAR`, ProfileRecommendationLevel.CRITICAL, l('phelper.addAvatar1'), l('phelper.addAvatar2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Avatar');
        }
    }

    protected async checkHqPortrait(): Promise<void> {
        const profileUrl = ProfileCache.detectRisingPortraitURL(this.profile.character.description);

        if (!profileUrl) {
            //this.add(`ADD_HQ_AVATAR`, ProfileRecommendationLevel.CRITICAL, 'Add a high-quality portrait', 'Profiles with a high-quality portraits stand out in chats with other F-Chat Rising players.', 'https://github.com/Frolic-chat/frolic/wiki/High%E2%80%90Quality-Portraits');
        } else if (!ProfileCache.isSafeRisingPortraitURL(profileUrl)) {
            this.add(`ADD_HQ_AVATAR_SAFE_DOMAIN`, ProfileRecommendationLevel.CRITICAL, l('phelper.unsupportedHQPotrait1'), l('phelper.unsupportedHQPotrait2'));
        }
    }

    protected checkImages(): void {
        if (!this.profile.character.image_count) {
            this.add(`ADD_IMAGE`, ProfileRecommendationLevel.CRITICAL, l('phelper.addImage1'), l('phelper.addImage2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Images');
        } else if (this.profile.character.image_count < 3) {
            this.add(`ADD_MORE_IMAGES`, ProfileRecommendationLevel.NOTE, l('phelper.addImage3'), l('phelper.addImage4'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Images');
        }
    }

    protected checkInlineImage(): void {
        if (Object.keys(this.profile.character.inlines).length < 1) {
            this.add(`ADD_INLINE_IMAGE`, ProfileRecommendationLevel.NOTE, l('phelper.addInline1'), l('phelper.addInline2'), 'https://wiki.f-list.net/Frequently_Asked_Questions#How_do_I_add_an_inline_image_to_my_profile.3F');
        }
    }

    protected checkDescriptionLength(): void {
        const desc = this.profile.character.description.trim();

        if (desc.length < 20) {
            this.add(`ADD_DESCRIPTION`, ProfileRecommendationLevel.CRITICAL, l('phelper.addDesc1'), l('phelper.addDesc2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Description');
        } else if (desc.length < 400) {
            this.add(`EXPAND_DESCRIPTION`, ProfileRecommendationLevel.NOTE, l('phelper.addDesc3'), l('phelper.addDesc4'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Description');
        }
    }

    protected checkColorCodes(): void {
        const invalid_colors = ProfileCache.invalidColorCodes(this.profile.character.description.trim());

        if (invalid_colors) {
            this.add(`INVALID_COLOR_CODES`, ProfileRecommendationLevel.CRITICAL, l('phelper.badColors1'), l('phelper.badColors2', invalid_colors))
        }
    }

    protected checkCustomKinks(): void {
        const counts = Object.values(this.profile.character.customs).reduce((accum, kink) => {
            if (kink) {
                accum.total += 1;
                if (kink.description) accum.filled += 1;
            }

            return accum;
        },
        { filled: 0, total: 0 });

        if (counts.total === 0) {
            this.add(`ADD_CUSTOM_KINK`, ProfileRecommendationLevel.CRITICAL, l('phelper.addCustom1'), l('phelper.addCustom2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Custom_Kinks');
        } else if (counts.total < 5) {
            this.add(`ADD_MORE_CUSTOM_KINKS`, ProfileRecommendationLevel.NOTE, l('phelper.addCustom3'), l('phelper.addCustom4'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Custom_Kinks');
        }

        if (counts.filled < counts.total && counts.total > 0) {
            this.add(`ADD_MORE_CUSTOM_KINK_DESCRIPTIONS`, ProfileRecommendationLevel.NOTE, l('phelper.addCustom5'), l('phelper.addCustom6'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Custom_Kinks');
        }
    }

    protected checkKinkCounts(): void {
        const kinks = Matcher.getAllStandardKinks(this.profile.character);

        const counts = Object.values(kinks).reduce((accum, kinkLevel) => {
            accum[kinkLevel as keyof typeof accum] += 1;

            return accum;
        },
        { favorite: 0, yes: 0, maybe: 0, no: 0 });

        const minCountPerType = 5;
        const totalCount = counts.favorite + counts.yes + counts.maybe + counts.no;

        if (totalCount < 10) {
                this.add(`ADD_MORE_KINKS`, ProfileRecommendationLevel.CRITICAL, l('phelper.addKinks1'), l('phelper.addKinks2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Kinks');
        }
        else {
            // Needs fix for crushing KinkChoice into string
            Object.entries(counts).forEach(([key, count]) => {
                if (count < minCountPerType) {
                    this.add(`ADD_MORE_KINKS_${key.toString().toUpperCase()}`, ProfileRecommendationLevel.CRITICAL, l('phelper.addKinks3', key), l('phelper.addKinks4', minCountPerType, key), 'https://wiki.f-list.net/Guide:_Character_Profiles#Kinks');
                }
            });
        }
    }

    protected checkMissingProperties(): void {
        const p = this.profile;

        if (p.age === null) {
            this.add('AGE', ProfileRecommendationLevel.CRITICAL, l('phelper.addAge1'), l('phelper.addAge2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#General_Details');
        }

        if (p.orientation === null) {
            this.add('ORIENTATION', ProfileRecommendationLevel.CRITICAL, l('phelper.addOrientation1'), l('phelper.addOrientation2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#General_Details');
        }

        if (p.species === null) {
            this.add('SPECIES', ProfileRecommendationLevel.CRITICAL, l('phelper.addSpecies1'),l('phelper.addSpecies2') , 'https://wiki.f-list.net/Guide:_Character_Profiles#General_Details');
        }

        if (p.furryPreference === null) {
            this.add('FURRY_PREFERENCE', ProfileRecommendationLevel.CRITICAL, l('phelper.addPairPref1'), l('phelper.addPairPref2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#RPing_Preferences');
        }

        if (p.subDomRole === null) {
            this.add('SUB_DOM_ROLE', ProfileRecommendationLevel.CRITICAL, l('phelper.addRole1'), l('phelper.addRole2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Sexual_Details');
        }

        if (p.position === null) {
            this.add('POSITION', ProfileRecommendationLevel.CRITICAL, l('phelper.addPosition1'), l('phelper.addPosition2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#Sexual_Details');
        }

        if (p.postLengthPreference === null) {
            this.add('POST_LENGTH', ProfileRecommendationLevel.CRITICAL, l('phelper.addPostLength1'), l('phelper.addPostLength2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#RPing_Preferences');
        }

        if (p.bodyType === null) {
            this.add('BODY_TYPE', ProfileRecommendationLevel.CRITICAL, l('phelper.addBodyType1'), l('phelper.addBodyType2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#General_Details');
        }

        if (p.gender === null) {
            this.add('GENDER', ProfileRecommendationLevel.CRITICAL, l('phelper.addGender1'), l('phelper.addGender2'), 'https://wiki.f-list.net/Guide:_Character_Profiles#General_Details');
        }
    }

    protected checkSpeciesPreferences(): void {
        const p = this.profile;
        const c = this.profile.character;

        if (p.furryPreference === null) {
            return;
        }

        if (p.furryPreference === FurryPreference.FurriesOnly) {
            if ((Matcher.getKinkPreference(c, Kink.Humans) ?? 0) > 0) {
                this.add('KINK_MISMATCH_FURRIES_ONLY_HUMAN', ProfileRecommendationLevel.NOTE, l('phelper.mismatch'), l('phelper.mismatchFurriesOnly'));
            }
        }

        if (p.furryPreference === FurryPreference.HumansOnly) {
            if ((Matcher.getKinkPreference(c, Kink.AnimalsFerals) ?? 0) >= 0 || (Matcher.getKinkPreference(c, Kink.Zoophilia) ?? 0) >= 0) {
                // do nothing
            } else {
                const likedAnthros = this.getLikedAnimals();

                likedAnthros.forEach(species => {
                    this.add('KINK_MISMATCH_HUMANS_ONLY_ANTHRO', ProfileRecommendationLevel.NOTE, l('phelper.mismatch'), l('phelper.mismatchHumansOnly', Matcher.getSpeciesName(species)));
                });
            }
        }

        if (p.furryPreference !== FurryPreference.HumansOnly) {
            const likedAnthros = this.getLikedAnimals();

            if ([Kink.AnthroCharacters, Kink.Mammals, Kink.Humans].every(s => likedAnthros[s])) {
                this.add('KINK_NO_SPECIES', ProfileRecommendationLevel.NOTE, l('phelper.addSpeciesPref1'), l('phelper.addSpeciesPref2'));
            }
        }
    }

    protected getLikedAnimals(): Species[] {
        const c = this.profile.character;

        return mammalSpecies.filter(species => (Matcher.getKinkPreference(c, species) ?? 0) > 0);
    }
}
