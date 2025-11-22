export enum Scoring {
    MATCH = 1,
    WEAK_MATCH = 0.5,
    NEUTRAL = 0,
    WEAK_MISMATCH = -0.5,
    MISMATCH = -1
}


export enum TagId {
    Age = 1,
    Orientation = 2,
    Gender = 3,
    Build = 13,
    FurryPreference = 29,
    SubDomRole = 15,
    Position = 41,
    BodyType = 51,
    ApparentAge = 64,
    RelationshipStatus = 42,
    Species = 9,
    LanguagePreference = 49,
    PostLength = 24,

    Kinks = 99999
}


export enum PostLengthPreference {
    NoPreference = 63,
    VeryShort_1_2 = 26,
    Short_2_4 = 27,
    SemiParagraph_4_7 = 28,
    Paragraph_7_10 = 60,
    StrongParagraph_10_14 = 61,
    MultiParagraph_14_25 = 62
}


export enum Gender {
    Male = 1,
    Female = 2,
    Transgender = 3,
    Herm = 32,
    MaleHerm = 51,
    Cuntboy = 69,
    None = 105,
    Shemale = 141,

    Transman    =  99992,
    Transwoman  =  99993,
    Femboy      =  99996,
    Tomboy      =  99997,

    Nonbinary   = 999994,
    Androgynous = 999995,
    Feminine    = 999998,
    Masculine   = 999999,
}

export namespace CustomGender {
    export const KinkMap = {
        'Female':        554,
        'Herm-Male':     552,
        'Male':          553,
        'Transgender':   551,
        'Hermaphrodite': 132,
        'Shemale':       356,
        'Cunt-boy':      231,
        'Transwoman':    606,
        'Transman':      607,
        'Nonbinary':     712,
        'Androgynous':   586,
        'Femboy':        531,
        'Tomboy':        532,
        'Feminine':      592,
        'Masculine':     597,
    } as const;

    export type KinkWords = keyof typeof KinkMap;
    export type KinkIds   = typeof KinkMap[keyof typeof KinkMap];
}

export enum SubDomRole {
    AlwaysSubmissive = 7,
    UsuallySubmissive = 8,
    Switch = 9,
    UsuallyDominant = 10,
    AlwaysDominant = 11
}

export enum Position {
    AlwaysBottom = 85,
    UsuallyBottom = 86,
    Switch = 91,
    UsuallyTop = 87,
    AlwaysTop = 88
}

export enum Orientation {
    Straight = 4,
    Gay = 5,
    Bisexual = 6,
    Asexual = 58,
    Unsure = 59,
    BiMalePreference = 89,
    BiFemalePreference = 90,
    Pansexual = 127,
    BiCurious = 128
}

export enum BodyType {
    Anthro = 122,
    Feral = 121,
    Morphable = 123,
    Varies = 124,
    Other = 125,
    Androgynous = 126,
    Human = 143,
    Taur = 145
}

export enum Build {
    Lithe = 12,
    Thin = 14,
    Slim = 15,
    Average = 16,
    Toned = 17,
    Muscular = 18,
    Buff = 19,
    Herculean = 20,
    Tubby = 21,
    Obese = 22,
    Curvy = 129,
    Chubby = 200,
    Varies = 201
}

export enum KinkPreference {
    Favorite = 1,
    Yes = 0.5,
    Maybe = -0.5,
    No = -1
}

export enum Kink {
    Females = 554,
    MaleHerms = 552,
    Males = 553,
    Transgenders = 551,
    Herms = 132,
    Shemales = 356,
    Cuntboys = 231,
    TransFemales = 606,
    TransMales = 607,
    Nonbinary = 712,

    // Bonus genders
    Androgynous = 586,
    Femboy      = 531,
    Tomboy      = 532,
    Feminine    = 592,
    Masculine   = 597,
    None        = 1000000,

    OlderCharacters = 109,
    YoungerCharacters = 197,
    Ageplay = 196,
    UnderageCharacters = 207,

    RoleReversal = 408,

    AnthroCharacters = 587,
    Humans = 609,
    Kemonomimi = 516,

    Mammals = 224,

    Abrasions = 1,
    Bloodplay = 4,
    Branding = 492,
    BreastNippleTorture = 36,
    Burning = 21,
    Castration = 20,
    Death = 28,
    Emasculation = 508,
    ExecutionMurder = 717,
    GenitalTorture = 276,
    Gore = 689,
    Impalement = 270,
    Menses = 99,
    Mutilation = 96,
    Necrophilia = 308,
    NonsexualPain = 486,
    NonsexualTorture = 103,
    Nullification = 334,
    Piercing = 479,
    SexualTorture  = 174,
    SwallowingBlood = 202,
    ToothRemoval = 690,
    WoundFucking = 691,

    HyperScat = 415,
    Scat=  164,
    ScatTorture = 369,
    Soiling = 509,
    SwallowingFeces = 201,

    HyperWatersports = 414,
    PissEnemas       = 533,
    SwallowingUrine  = 203,
    Watersports      = 59,
    Wetting          = 371,

    BelchingBurping = 709,
    DirtyFeet       = 706,
    ExtremeMusk     = 335,
    Farting         = 549,
    Filth           = 707,
    Messy           = 89,
    Slob            = 570,
    Smegma          = 708,
    SwallowingVomit = 560,
    UnwashedMusk    = 705,
    Vomiting        = 184,

    Absorption          = 239,
    AlternativeVore     = 244,
    AnalVore            = 209,
    Cannibalism         = 714,
    CockVore            = 208,
    CookingVore         = 716,
    Digestion           = 238,
    Disposal            = 241,
    HardVore            = 66,
    RealisticVore       = 242,
    SoftVore            = 73,
    Unbirthing          = 210,
    UnrealisticVore     = 243,
    VoreBeingPredator   = 422,
    VoreBeingPrey       = 423,

    AlternativePregnancy = 702,
    AnalPregnancy        = 704,
    Birthing             = 461,
    ExtremePregnancy     = 272,
    MalePregnancy        = 198,
    Pregnancy            = 154,

    STDs = 656,

    PseudoRape      = 522,
    DubConsensual   = 657,
    Nonconsensual   = 100,

    Incest          = 127,
    IncestParental  = 646,
    IncestSiblings  = 647,
    ParentChildPlay = 304,
    ForcedIncest    = 53,

    AgeProgression  = 622,
    AgeRegression   = 621,
    Infantilism     = 497,

    Zoophilia       = 218,
    AnimalsFerals   = 487,
    Quadrupeds      = 382,

    HyperAsses          = 595,
    HyperBalls          = 233,
    HyperBreasts        = 594,
    HyperCocks          = 60,
    HyperFat            = 377,
    HyperMuscle         = 376,
    HyperVaginas        = 593,
    HyperVoluptous      = 378,
    HyperMuscleGrowth   = 389,

    MacroAsses      = 596,
    MacroBalls      = 550,
    MacroBreasts    = 91,
    MacroCocks      = 61,
    Macrophilia     = 285,
    MegaMacro       = 374,
    Microphilia     = 286,
    SizeDifferencesMicroMacro = 502,
    GrowthMacro     = 384,
    ShrinkingMicro  = 387,

    Taurs  = 68,
    Exotic = 481,
}

export enum FurryPreference {
    FurriesOnly              = 39,
    FursAndHumans            = 40,
    HumansOnly               = 41,
    HumansPreferredFurriesOk = 150,
    FurriesPreferredHumansOk = 149,
}

export const furryPreferenceMapping = {
    [FurryPreference.FurriesOnly]:              'furries only',
    [FurryPreference.FursAndHumans]:            'loves furries and humans',
    [FurryPreference.HumansOnly]:               'humans only',
    [FurryPreference.HumansPreferredFurriesOk]: 'loves humans, likes furries',
    [FurryPreference.FurriesPreferredHumansOk]: 'loves furries, likes humans',
};

export const postLengthPreferenceMapping = {
    [PostLengthPreference.MultiParagraph_14_25]:  'multi-paragraph posts',
    [PostLengthPreference.StrongParagraph_10_14]: 'strong paragraph posts',
    [PostLengthPreference.Paragraph_7_10]:        'paragraph posts',
    [PostLengthPreference.SemiParagraph_4_7]:     'semi-paragraph posts',
    [PostLengthPreference.Short_2_4]:             'short posts',
    [PostLengthPreference.VeryShort_1_2]:         'very short posts',
};


export const postLengthPreferenceScoreMapping = {
    [PostLengthPreference.MultiParagraph_14_25]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.MATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.WEAK_MATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.WEAK_MISMATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.MISMATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.MISMATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.MISMATCH,
    },

    [PostLengthPreference.StrongParagraph_10_14]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.WEAK_MATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.MATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.WEAK_MATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.WEAK_MISMATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.MISMATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.MISMATCH,
    },

    [PostLengthPreference.Paragraph_7_10]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.WEAK_MISMATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.WEAK_MATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.MATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.WEAK_MATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.WEAK_MISMATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.MISMATCH,
    },

    [PostLengthPreference.SemiParagraph_4_7]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.MISMATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.WEAK_MISMATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.WEAK_MATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.MATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.WEAK_MATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.WEAK_MISMATCH,
    },

    [PostLengthPreference.Short_2_4]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.MISMATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.MISMATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.WEAK_MISMATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.WEAK_MATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.MATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.WEAK_MATCH,
    },

    [PostLengthPreference.VeryShort_1_2]: {
        [PostLengthPreference.MultiParagraph_14_25]:  Scoring.MISMATCH,
        [PostLengthPreference.StrongParagraph_10_14]: Scoring.MISMATCH,
        [PostLengthPreference.Paragraph_7_10]:        Scoring.MISMATCH,
        [PostLengthPreference.SemiParagraph_4_7]:     Scoring.WEAK_MISMATCH,
        [PostLengthPreference.Short_2_4]:             Scoring.WEAK_MATCH,
        [PostLengthPreference.VeryShort_1_2]:         Scoring.MATCH,
    }
};

export type GenderKinkIdMap = { [k in Gender]: Kink }
export type KinkIdGenderMap = { [k in Kink]: Gender }

export const genderToKinkMap: GenderKinkIdMap = {
    [Gender.Female]:      Kink.Females,
    [Gender.Male]:        Kink.Males,
    [Gender.Cuntboy]:     Kink.Cuntboys,
    [Gender.Herm]:        Kink.Herms,
    [Gender.MaleHerm]:    Kink.MaleHerms,
    [Gender.Shemale]:     Kink.Shemales,
    [Gender.Transgender]: Kink.Transgenders,

    // Bonus genders!?!
    [Gender.Transman]:    Kink.TransMales,
    [Gender.Transwoman]:  Kink.TransFemales,
    [Gender.Nonbinary]:   Kink.Nonbinary,   // 712,
    [Gender.Androgynous]: Kink.Androgynous, // 586,
    [Gender.Femboy]:      Kink.Femboy,      // 531,
    [Gender.Tomboy]:      Kink.Tomboy,      // 532,
    [Gender.Feminine]:    Kink.Feminine,    // 592,
    [Gender.Masculine]:   Kink.Masculine,   // 597,

    [Gender.None]:        Kink.None,        // Source: I made it up.
};

export const kinkToGenderMap: Partial<KinkIdGenderMap> = {
    [Kink.Females]:      Gender.Female,
    [Kink.Males]:        Gender.Male,
    [Kink.Cuntboys]:     Gender.Cuntboy,
    [Kink.Herms]:        Gender.Herm,
    [Kink.MaleHerms]:    Gender.MaleHerm,
    [Kink.Shemales]:     Gender.Shemale,
    [Kink.Transgenders]: Gender.Transgender,

    // Bonus genders!?!
    [Kink.TransMales]:   Gender.Transman,
    [Kink.TransFemales]: Gender.Transwoman,
    [Kink.Nonbinary]:    Gender.Nonbinary,   // 712,
    [Kink.Androgynous]:  Gender.Androgynous, // 586,
    [Kink.Femboy]:       Gender.Femboy,      // 531,
    [Kink.Tomboy]:       Gender.Tomboy,      // 532,
    [Kink.Feminine]:     Gender.Feminine,    // 592,
    [Kink.Masculine]:    Gender.Masculine,   // 597,

    [Kink.None]:         Gender.None,        // Source: I made it up.
};

export const genderKinkStringMap: { [k in Kink]?: [ string, string ] } = {
    [Kink.Androgynous]:  [ 'androgyne',     'androgynes'     ],
    [Kink.Cuntboys]:     [ 'cuntboy',       'cuntboys'       ],
    [Kink.Females]:      [ 'female',        'females'        ],
    [Kink.Femboy]:       [ 'femboy',        'femboys'        ],
    [Kink.Feminine]:     [ 'femininity',    'femininity'     ],
    [Kink.Herms]:        [ 'herm',          'herms'          ],
    [Kink.Males]:        [ 'male',          'males'          ],
    [Kink.MaleHerms]:    [ 'male-herm',     'male-herms'     ],
    [Kink.Masculine]:    [ 'masculinity',   'masculinity'    ],
    [Kink.Nonbinary]:    [ 'nonbinary',     'enbies'         ],
    [Kink.None]:         [ 'ungendered',    'the ungendered' ],
    [Kink.Shemales]:     [ 'shemale',       'shemales'       ],
    [Kink.Tomboy]:       [ 'tomboy',        'tomboys'        ],
    [Kink.Transgenders]: [ 'transgendered', 'trans people'   ],
    [Kink.TransMales]:   [ 'transman',      'transmen'       ],
    [Kink.TransFemales]: [ 'transwoman',    'transwomen'     ],
}

export interface BodyTypeKinkIdMap {
    [key: number]: Kink
}

export const bodyTypeKinkMapping: BodyTypeKinkIdMap = {
    [BodyType.Feral]: Kink.AnimalsFerals,
    [BodyType.Taur]:  Kink.Taurs,
};

 // if no species and 'no furry characters', === human
 // if no species and dislike 'anthro characters' === human

export enum Species {
    Human        = 609,
    Humanoid     = 131,
    Kemonomimi   = 516,
    Bovine       = 318,
    Equine       = 236,
    Feline       = 212,
    Canine       = 226,
    Caprinae     = 558,
    Demon        =   7,
    Divinity     = 530,
    Vulpine      = 213,
    Avian        = 215,
    Amphibian    = 223,
    Cervine      = 227,
    Insect       = 237,
    Lapine       = 214,
    Musteline    = 328,
    Dragon       = 228,
    Procyon      = 325,
    Rodent       = 283,
    Ursine       = 326,
    MarineMammal = 309,
    Primate      = 613,
    Elf          = 611,
    Orc          = 615,
    Fish         = 608,
    Reptile      = 225,
    Marsupial    = 322,
    Anthro       = 587,
    Robot        = 161,
    Hyaenidae    = 321,
    Mephitidae   = 323,
    Bat          = 451,
    Alien        = 281,
    Dinosaur     = 610,
    Pokemon      = 504,
    Fae          = 612,
    Taur         =  68,
    Vampire      = 182,
    Naga         = 619,
    Monster      = 483,
    Exotic       = 481,

    Minotaur        = 12121212,
    Giraffe         = 13131313,
    Rhinoceros      = 14141414,
    Suidae          = 15151515,
    Herpestidae     = 16161616,
    Were            = 17171717,
    Erinaceidae     = 18181818,
    Elephantidae    = 19191919,
    Camielidae      = 20202020,
    Hippopotamidae  = 21212121,
    Hub             = 22222222,
    Pinniped        = 23232323,
    Hybrid          = 24242424,
    Xenarthra       = 25252525
 }

export const nonAnthroSpecies: Species[] = [
    Species.Human, Species.Humanoid, Species.Demon, Species.Divinity,
    Species.Elf, Species.Orc, Species.Robot, Species.Exotic,
    Species.Alien, Species.Pokemon, Species.Fae, Species.Vampire, Species.Monster,
    Species.Hub,
];

export const mammalSpecies: Species[] = [
    Species.Bovine, Species.Equine, Species.Feline, Species.Canine, Species.Caprinae,
    Species.Vulpine, Species.Cervine, Species.Lapine, Species.Musteline, Species.Procyon,
    Species.Rodent, Species.Ursine, Species.MarineMammal, Species.Primate,
    Species.Marsupial, Species.Anthro, Species.Hyaenidae, Species.Mephitidae, Species.Bat,
    Species.Taur, Species.Minotaur, Species.Giraffe, Species.Rhinoceros, Species.Suidae,
    Species.Herpestidae, Species.Were, Species.Erinaceidae, Species.Elephantidae, Species.Camielidae,
    Species.Hippopotamidae, Species.Pinniped, Species.Hybrid, Species.Xenarthra
];

export type SpeciesMap = Record<number, string[]>;
export type SpeciesStrMap = Record<number, string>;

/**
 * Used in the profile display; not used in the tooltip.
 */
export const speciesNames: SpeciesStrMap = {
    [Species.MarineMammal]: 'marine mammals',
    [Species.Elf]:          'elves',
    [Species.Fish]:         'fishes',
    [Species.Mephitidae]:   'mephitis',
    [Species.Rhinoceros]:   'rhinoceros',
    [Species.Suidae]:       'swine',
    [Species.Exotic]:       'exotic creatures',
    [Species.Divinity]:     'divinity',
};

const kemomimi_generic  = [ 'kemomimi', 'kemonomimi', 'kemono', 'gijinka' ];
const kemomimi_canine   = [ 'inumimi', 'oo?kamimi(mi)?', 'jakkarumimi', 'chinchiramimi', ];
const kemomimi_equine   = [ 'umamimi', 'shimaumamimi' ];
const kemomimi_feline   = [
    'neko', 'nekomata', 'neko[ -]?mimi', 'toramimi', 'shishimimi', 'pansamimi', 'hyoumimi',
    'mi[gq]o(\'?te)?', '.*catte', 'catgirl', 'mumeko',
];
const kemomimi_vulpine  = [ 'kitsunemimi', 'vulpo' ];
const kemomimi_dragon   = [ 'do?ragon?mimi' ];
const kemomimi_bat      = [ 'komorimimi' ];
const kemomimi_avian    = [ 'torimimi' ];
const kemomimi_bovine   = [ 'ushimimi' ];
const kemomimi_caprine  = [ 'yagimimi', 'hitsujimimi' ];
const kemomimi_cervine  = [ 'shikamimi' ];
const kemomimi_giraffe  = [ 'kirinmimi' ];
const kemomimi_bug      = [ 'hachimimi' ];
const kemomimi_lapine   = [
    'usagimimi',
    'viera', 'bnuuy',
];
const kemomimi_musteli  = [ 'kawausomimi', 'itachimimi', 'ferettomimi' ];
const kemomimi_primate  = [
  'sarumimi',
  // saiyans?
];
const kemomimi_procyon  = [ 'tanukimimi', 'rakunmimi' ];
const kemomimi_reptile  = [
    'xaela', 'au[-\' ]?ra', 'raen',
];
const kemomimi_rodent   = [ 'risumimi', 'nezumimi' ];
const kemomimi_suidae   = [ 'butamimi' ];
const kemomimi_ursine   = [ 'pandamimi', 'kumamimi' ];

const humanLikeNekoSpecies = [
  ...kemomimi_avian,    ...kemomimi_bat,        ...kemomimi_bovine,
  ...kemomimi_bug,      ...kemomimi_canine,     ...kemomimi_caprine,
  ...kemomimi_cervine,  ...kemomimi_dragon,     ...kemomimi_equine,
  ...kemomimi_feline,   ...kemomimi_generic,    ...kemomimi_giraffe,
  ...kemomimi_lapine,   ...kemomimi_musteli,    ...kemomimi_primate,
  ...kemomimi_procyon,  ...kemomimi_reptile,    ...kemomimi_rodent,
  ...kemomimi_suidae,   ...kemomimi_ursine,     ...kemomimi_vulpine
];

/**
 * This is not used to give a person a Kemonomimi species to match a kink, since kemonomimi use the species of their animal. What it does is decide if we need to use complicated logic in the furry/human pairing.
 */
export const nekoMap: SpeciesMap = {
    [Species.Kemonomimi]: [ ...humanLikeNekoSpecies ]
}

export const likelyHuman: SpeciesMap = {
    [Species.Human]: [
        '.*human', 'sapiens?',
                    // Gender:
        '.*bo[yi]', 'bo[yi].*', 'brother', 'father', 'female', 'femboy', '.*girl', 'girl.*', 'guy', 'male', 'man', 'milf', 'mother', 'shemale', 'sister', 'woman',

                    // Origin:
        'african[ -]?american', 'american', 'az[ea]r[oa]thian', 'black', 'british', 'caucasian', 'chinese', 'english', 'high[ -]?lander', 'irish', 'korean', 'kryptonian', 'latina', 'latino', 'mensch', 'mid[ -]?lander', 'nord', 'norse(man)?', 'saiyan',

                    // Predilection:
        'bimbo', 'brat', 'cumdump', 'cutie', 'french', 'fuckpig', 'goth', 'gyaru', 'homo', 'she-stud', '.*slut', 'slutty', 'thot', 'whore',
                    // Obligation:
        'amazon', 'amazonian', 'college', 'cosplayer', 'hero', 'knight', 'magus', 'otaku', 'paladin', 'psychic', 'servant', 'streamer', 'witch', 'wizard',
                    // ??? ? ?? ?????????????????
        'adult', 'thug', 'blonde?', 'redhead', 'brunet(te)?', 'dothraki', 'astartes', 'echani', 'cathar', 'shikaisen', 'arkanian', 'exalted', 'leftherian',

        ...humanLikeNekoSpecies
    ]
};

// red panda / akai pandamimi
// echidna


function gen(s: string): string {
    return `${s}[ -]?(person|kin|folk|(wo)?man|g[iu]rl|bo[yi][e]?)?`;
}

export const speciesMapping: SpeciesMap = {
    [Species.Anthro]: [
                    // Generic:
        'anthro', 'anthropomorphic', 'furry',
                    // ""
        'mobian', 'erune', 'vastayan?', 'rakshasa',
                    // Catch all:
        gen('(beast|anthro|furry)'),
        ...kemomimi_generic,
    ],

    [Species.Human]: [
        'human', 'human.*',
        'hy?[uo]+m[aie]+ne?', "hume", 'hyur',
        'homo[ -]?sapi[ea]ns?',
    ],

    [Species.Kemonomimi]: [ ...humanLikeNekoSpecies ],

    [Species.Exotic]: [
                    // Humanoid:
        'giant(ess)?', 'golem',
                    // Computers:
        'v(irtual)?[ -]?(you)?tuber', 'computer program',
                    // Magical:
        'siren', 'mermaid', 'djinn', 'genie',
                    // Mythical:
        'kirin', 'qilin', 'chima?era', 'basilisk', 'hippogr[iy](ff|ph)', 'gryphon', 'griffin', 'manticore',
    ],

    [Species.Elf]: [
                    // "Elf":
        'elf', 'elves', 'elven', 'elvish', 'elf.*', '.*elfe?', 'e[ -]l[ -]f',
                    // Classic:
        '.*drow', 'drow.*', 'dunmer', 's[yi]lvan', 'hal[bf][ -]?elf', 'blutelf[e]?',
                    // Modern:
        'kal\'?dorei', 'quel\'?dorei','ren\'?dorei', 'sin\'?dorei', 'shal\'?dorei', 'san\'?layn', 'elezen',
                    // Catch all:
        gen('(elf|drow)'),
    ],

    [Species.Canine]: [
                    // Generic:
        'dog', 'canine', 'hound', '.*wolf', 'wolf.*', 'wolfess', 'cani[ds]', 'lupus', 'lupine', 'dire[ -]?wolf', 'dire[ -]?hound', 'wolfdog', 'mongrel', 'mutt', 'puppy', 'hell[ -]?hound', 'loup',
                    // Nicknames:
        'dogg(y|ie)', 'doggo', 'woof', 'chow[ -]?chow', 'awoo+', 'woffo', 'wuff',
                    // Species:
        'dingo', 'coyote', 'jackal', 'husky', 'doberman[n]?', 'akita', 'pit ?bull', 'terrier', 'bull[ -]?terrier', 'australian[ -]?sheph?([ae]rd)?', 'german[ -]?sheph?([ea]rd)?', 'shep', 'malinois', 'labrador', 'collie', 'chihuahua', 'poodle', 'corgi', 'beagle', 'dhole', 'pointer',  'dalmati[ao]n', 'malamute', 'mastiff', 'rott?w[ea]ill?er', 'shih[ -]?tzu', 'vallhund', 'great[ -]?dane', 'golden[ -]?(retriever|lab|labrador)', 'cocker[ -]?spaniel', 'samm?oyed', 'borzoi', 'spaniel', 'setter', 'shiba', 'inu', 'shiba[ -]?inu', 'veil[ -]?hound', 'timber[ -]?wolf', 's(ain)?t.?[ -]?bernard', 'latrans', 'chien', 'kang[ao]l', 'papillon', 'sch[aä]ferhund', 'pomeranian',
                    // Fantasy:
        'fenrir', 'bargh?[aeu]st', 'barguest', 'oo?kami', 'worg(en)?',
                    // Questionable:
        'aussie[ -]?doodle',
                    // Anthro:
        'anubian', 'anubis', 'crux', 'v[aá]na[r]?gand[r]?',
                    // Catch all:
        gen('(dog|wolf)'),
        ...kemomimi_canine,
        '🐶', '🐺', '🐕', '🐩',
    ],

    [Species.Equine]: [
                    // Generic:
        '.*horse', 'stallion', 'foal', 'mare', 'filly', 'equine', 'hoss', 'colt', 'neigh', '.*pony', 'equus',
                    // Species:
        'zebra', 'zeeb', 'donkey', 'appaloosa', 'friesian', 'clydesdale', 'shire',  'draft', 'draught', 'gypsy[ -]?vanner', 'ardenne[r]?', 'ardennais[e]?', 'mule', 'cream[ -]?draft', 'belgian[ -]?draft', 'saddle[ -]?bred', 'warm[ -]?blood', 'marsh tacky', 'fox[ -]?trotter', 'morab', 'walkaloosa', 'welara', 'tinker[ -]?hengste?', 'thestral', 'palomino', 'mustang', 'kelpie', 'kuranta',
                    // Fictional:
        'peg[au]sus', 'alicorn', 'unicorn.*',
                    // Predilection:
        'zonkey', 'whorse',
                    // Catch all:
        gen('(horsi?ey?|hoss|zeeb(ra)?|donkey|pon[yie])'),
        ...kemomimi_equine,
        '🐴', '🦓', '🐎',
    ],

    [Species.Feline]: [
                    // Generic:
        '.*cat', 'feline', '.*kitt(y|en)', '.*katze?', 'tabby', 'felinid', 'felis', 'catto', 'meow', 'kitteh', 'kat', 'chat(te)?', 'nyah', 'catus', '.*[ -]catus',
                    // Cats:
        'calico', 'maine[ -]?coon', 'burmese', 'siamese', 'chartreux', 'german[ -]?rex', 'turkish[ -]?van', 'russian[ -]?blue', 'norwegian[ -]?forest[ -]?(cat)?', '(exotic|domestic|british|oriental|american|shaded)[ -]?shorthair', 'selkirk rex', '\\w+[ -]bombay',
                    // BIG:
        '.*lion', '.*tiger', 'tige?ress', 'tigre', 'panther', 'panthe?ress', 'leopard(ess)?', 'jaguar', 'cheetah', 'lynx', 'puma', 'cougar', 'ocelot', 'serval', 'lombax', 'liger', 'tigon', 'catamount', 'sab(re?|er)[ -]?tooth',
                    // Unsorted:
        'korat', 'ragdoll', 'ocicat', 'ragamuffin', 'burmilla', 'tetton', 'caracal', 'tabaxi', 'kodkod', 'karotanta', 'nekomata', 'trianii', 'caitian', 'mytharii', 'charr', 'kater', 'jinko',
                    /// Anthro:
        'thunderian', 'khajiit', 'keetrin', 'felineko',
        'cat[ -]?person',       // 'Catgirl/catboy' goes in the 'humanLikeNekoSpecies'
        'catkin', 'catfolk',    // common 'nekomimi' synonym
                    // Catch all:
        gen('(lion|tiger)'),
        ...kemomimi_feline,
        '🐅', '🐆', '🐯', '🦁', '🐈',
    ],

    [Species.Vulpine]: [
                    // Generic:
        'fox', 'vixen', 'vulpine', 'fox.*', 'vulpes',
                    // Species:
        'fennec', 'kitsune.*', 'kistune', 'nogitsune', 'yako', 'silver[ -]?fox', 'arctic[ -]?fox', 'fennec[ -]?fox', 'red[ -]?fox', 'cape[ -]?fox', 'fire[ -]?fox', 'faw(x|ks)',
                    // Anthro:
        'vulpera', 'vulpkanin', '[gk]umiho',
                    // Catch all:
        gen('fox'),
        ...kemomimi_vulpine,
        '🦊',
    ],

    [Species.Dragon]: [
                    // Dragons
        'drgn', 'do?ragon.*', 'sea[ -]?dragon', 'night[ -]?fury',
                    // Dragon-like:
        '.*wyvern', 'half[ -]dragon', '.*felkin', 'longma', 'glavenus', 'zinogre', 'anjanath',
                    // Anthro:
        '.*dra(k|ch)e', 'draconic', 'draconis', 'dragovian', 'draconian', 'wyverian',
                    // Catch all:
        gen('dragon'),
        ...kemomimi_dragon,
        '🐉',
    ],

    [Species.Reptile]: [
                    // Generic:
        'reptile', 'lizard', 'snake', 'croc(odile)?', 'all?igator', 'gator', 'chameleon', 'anole', 'snake.*', '.*turtle', '.*tortoise', 'serp[ea]a?nt(ine)?',
                    // Nicknames:
        'nope[ -]?rope',
                    // Species:
        'gecko', 'skink', 'cobra', 'anaconda', 'python', 'viper', 'boa', 'taipan', 'titanoboa',
                    // Fantasy:
        'ludroth',
                    // Anthro:  // Aren't a lot of these naga/lamia?
        'scale[ -]?born', 'scaly', 'argonian', 'reptilian', 'crocodilian', 'saxhleel', 'yuan[ -]?ti', 'baal.?ka', 'xaela',
                    // ???:
        'zvarr',
                    // Catch all:
        gen('(lizard|snake|croc)'),
        ...kemomimi_reptile,
        '🐍',
    ],

    /**
     * Almost all pokémon fit into another category - ie, Vulpix, Ninetails into vulpes, etc...
     * But we put them here because many people explicitly desire or lack desire.
     *
     * Let's try not to add every pokémon, only the ones people actually use.
     * Additionally, it may be nice to add common misspellings: [sz], [ck], [ea], [oa], etc.
     */
    [Species.Pokemon]: [
                    // Generic:
        'pok[ée]mon', 'pok[ée]morph', 'alolan.*',
                    // Species:
        'eevee', 'jolteon', 'glaceon', 'vaporeon', 'flareon', 'umbreon', 'sylveon', 'leafeon',
        'pikachu', 'raichu',
        'poochyena', 'mightyena',
        'vulpix', 'ninetales', 'ninetails',
        'nidoran', 'nidorin[ao]', 'nido(que[ea]n|king)',
        'growlithe?', 'arcanine', 'furfrou', 'houndour', 'houndoom',
        'sneasel', 'weavile', 'espurr',
        'mudsdale', 'rapidash', 'zebstrika',
        'salamence', 'goodra', 'garchomp',
        'gengar', 'chandelur(e|ia)', 'gothitelle', 'mismagius',
        'delcatty', 'meowstick?', 'purrloin',
                    // Unsorted:
        'rattata', 'buizel', 'bibarel', 'audino', 'sandslash', 'luxray', 'kecleon', 'zigzagoon', 'joltik', 'lapras', 'hatteren[ea]', 'druddigon', 'zangoose', 'flygon', 'pansear', 'cinccino', 'salazzle', 'zubat',
        'absol', 'aggron', 'scyther', 'toxtricity', 'quagsire', 'hypnomade', 'zeraora', 'komala',
                    // Starters:
        'charmander', 'charmeleon', 'charizard',
        '(osha|de)wott', 'samurott?',
        'cinderace', 'litten', 'blaziken', 'quilava',
        'croconaw', 'mudkip', 'greninja',
        'decidueye', 'sceptile',
                    // Legendary & Mythic:
        'mew', 'mewtwo',
        'zacian', 'dialga', 'lugia', 'groudon', 'shaymin', 'lati[ao]s', 'reshiram', 'marshadow', 'zygarde', 'genesect',
                    // "Furry":
        'lopunny',
        'riolu', 'lucario',
        'rockruff', 'lycanro[ck]k?',
        'zorua', 'zoroark',
        'fennekin', 'braixen', 'delphox',
        'kirlia', 'gardev(oi|io)r',
                    // digimon
        'digimon', 'renamon', 'gatomon', 'impmon', 'guilmon',
    ],

    [Species.Amphibian]: [
                    // Generic:
        'amphibian', 'frog', 'toad',
                    // Species:
        'salamander', 'newt', 'axolotl',
    ],

    [Species.Avian]: [
                    // Generic:
        'bird',
                    // Species:
        'albatross', 'raven', 'cardinal', 'cockatiel', 'crow', 'meadow[ -]?lark', 'peacock', 'dove', 'eagle', 'owl', 'penguin', 'cockatoo', 'shoebill', 'parrot', 'duck', 'swallow', 'nightingale', 'toucan', 'emu', 'ostrich', 'flamingo', '(pink|blue|brown|green|canada)[ -]?jay', 'blauh[äa]her', 'jaybird', 'chicken', 'rooster', 'maran', 'pidgeon', 'secretary[ -?]bird',
                    // Fantasy:
        'gr[iy](ff|ph)[io]n', 'ph(oe|eo)nix', 'roc', 'chocobo',
                    // Anthro:
        'avian', 'avarr?ian', 'rito',
                    // Catch all:
        gen('(bird|raven)'),
        ...kemomimi_avian,
        '🦚', '🦃', '🦢', '🦆', '🦅', '🦉', '🦜', '🦩',
    ],

    [Species.Bat]: [
        'bat', 'foxbat', 'flying[ -]?fox', 'pteropus',
                    // Anthro:
        'nimbat',
                    // Catch all:
        ...kemomimi_bat,
        '🦇',
    ],

    [Species.Bovine]: [
                    // Generic:
        'bovine', 'bull', 'cow', 'cattle', 'moo', 'caprin[a]?e',
                    // Species:
        'bison', 'antelope', 'gazelle', 'oryx', 'buffalo', 'black[ -]?angus', 'ox', 'holstaur', 'goat[ -]?antelope', 'muskox', 'urial', 'mouflon', 'taurine', 'aurochs', 'bos', 'bos taurus', 'taur[u|o]s',
                    // Anthro:
        'hucow',
                    // Catch all:
        ...kemomimi_bovine,
        '🐃', '🐂', '🐄',
    ],

    [Species.Caprinae]: [
                    // Generic:
        'sheep(y|ie)?', 'goat', 'lamb', 'ram', 'goat.*',
                    // Species:
        'ibex', 'takin', 'bharal', 'goral', 'serow',
                    // Anthro:
        'faun',  'faunus',
                    // Catch all:
        gen('(sheep|goat|ram|lamb)'),
        ...kemomimi_caprine,
        '🐏', '🐑', '🐐',
    ],

    [Species.Camielidae]: [
                    // Species:
        'camel', 'llama', 'alpaca', 'guanaco', 'dromedary', 'dromedar',
                    // Catch all:
        '🦙', '🐪', '🐫',
    ],

    [Species.Cervine]: [
                    // Generic:
        'cervid', 'cervine',
        'deer', 'doe', 'fawn', 'stag',
                    // Species:
        'elk', 'moose', 'caribou', 'reindeer',
                    // Anthro:
        'deermon', 'zonai',
                    // Catch all:
        ...kemomimi_cervine,
        gen('(deer|doe)'),
    ],

    [Species.Dinosaur]: [
                    // Generic:
        'dinosaur', 'raptor', 'dino',
                    // Species:
        't[ -]?rex', 'pterodactyl', 'deinonychus', 'tyrannosaur(us)?',
                    // Anthro:
        'death[ -]?claw', 'saurian',
                    // Catch all:
        '\\w*[ -]?saur(us)?', '\\w*[ -]?raptor',
        '🦖', '🦕',
    ],

    [Species.Erinaceidae]: [
                    // Species:
        'hedgehog', 'gymnure', 'moonrat',
                    // Catch all:
        '🦔',
    ],

    [Species.Elephantidae]: [
                    // Species:
        'elephant', 'mammoth', 'mastodon', 'pachyderm',
                    // Anthro:
        'tusker',
                    // Catch all:
        '🐘',
    ],

    [Species.Fish]: [
                    // General:
        'aquatic',
                    // Fish:
        '.*fish', 'salmon', 'barracuda', 'eel',
                    // Sharks:
        'shark', 'great white', 'melanopterus', 'carcharhinus', '\\w+[ -]?shark', 'mako',
                    // Anthro:
        'sergal', 'octoling', 'inkling', 'zora',
                    // Catch all:
        gen('(shark|fish)'),
        '🦈', '🐟', '🐠', '🐡',
    ],

    [Species.Giraffe]: [
        'giraffe', 'okapi', '[gk]ira(ff|hv)[ei]?',
                    // Catch all:
        ...kemomimi_giraffe,
        '🦒',
    ],
    [Species.Herpestidae]: [
        'mongoose', 'meerkat', 'kusimanse', 'suricate',
    ],
    [Species.Hippopotamidae]: [
        'hippo', 'hippopotamus',
                    // Catch all:
        '🦛',
    ],
    [Species.Hyaenidae]: [
        'hyena', 'yeen', 'aardwolf', 'hya?en(a|idae)',
                    // Catch all:
        gen('hyena'),
    ],

    [Species.Hybrid]: [
                    // Generic:
        '.*?hybrid.*?',
                    // Specific:
        'cabbit', 'fabbit', 'catmonkey', 'laquine', 'folf', 'tolf', 'foxcoon', 'drazelle', 'batpon', 'unifox', 'rooram', 'catbat', 'bunfox', "shoxx?",
                    // Other:
        'myox', 'wolger', 'silkie', 'yumar',
    ],

    [Species.Insect]: [
                    // Bugs:
        'bug', 'bee', 'wasp', 'ant', 'insect', 'buggo', 'hornet', 'vespidae', 'mantis', 'ladybug', 'moth', 'bumblebee', 'tolype', 'mosquito',
                    // Catch all:
        gen('(bee|bug|ant)'),
                    // Sexy Bugs:
        'tarantula', 'arachnida?', 'spider', 'scorpion',
                    // Catch all:
        gen('spider'),
        ...kemomimi_bug,
        '🕷', '🐛', '🐜', '🐝', '🪲', '🐞', '🪳', '🦟',
    ],

    [Species.Lapine]: [
                    // Rabbits:
        'lagomorph', 'lapine', 'leporid(ae|s)?',
        'bunny', 'rabbit', 'hare', '.*bunny',
                    // Species:
        'cottontail', 'jack[ -]?rabbit', 'jackalope',
                    // Nicknames:
        'bun(bun)?', 'lop', 'wabbit', 'rabbet',
        'häschen', 'broodal', 'kanin(chen)?',
                    // Catch all:
        gen('(bun(ny)?|rabbit|lop)'),
        ...kemomimi_lapine,
        '🐇',
    ],

    [Species.MarineMammal]: [
        'whale', 'dolphin', 'orca', 'killer[ -]?whale',
                    // Catch all:
        '🐬',
    ],

    [Species.Marsupial]: [
                    // Generic:
        'marsupial',
                    // Species:
        'kangaroo', 'oposso?um', 'koala', 'wombat', 'possum', 'bandicoot', 'bilby', 'numbat', 'wallaby', 'thylacine', 'marsupial[ -]?(tiger|wolf|devil)', 'tasmanian[ -]?(tiger|wolf|devil)', 'quokka', 'glider', 'cuscus',  'musky[ -]?rat([ -]?kangaroo)?', 'rat[ -]?kangaroo', 'bettong', 'k[äa]nguru',
                    // Anthro:
        'roo([ -]kin)?', 'poss',
                    // Catch all:
        '🦘', '🐨',
    ],

    [Species.Mephitidae]: [
                    // General:
        'skunk',
                    // Nicknames:
        'stunk', 'stink[ -]?badger',
                    // Catch all:
        '🦨',
    ],

    [Species.Musteline]: [
                    // Species:
        'otter', 'ferret', 'mink', 'weasel', 'stoat', 'wolverine', 'marten', 'musteline', 'badger',
                    // Anthro:
        'ottsel',
                    // Catch all:
        gen('(otter|ferret|weasel)'),
        ...kemomimi_musteli,
        '🦡', '🦦',
    ],

    [Species.Pinniped]: [
                    // Species:
        'seal', 'walrus', 'sea[ -]?lion', 'fur seal',
                    // Anthro:
        'tuskar',
                    // Catch all:
        '🦭',
    ],

    [Species.Primate]: [
                    // Species:
        'gorilla', 'monkey', 'ape', 'chimp', 'lemur', 'bonobo', 'chimpanzee', 'silverback', 'primate',
                    // Anthro:
        // saiyan?
                    // Catch all:
        ...kemomimi_primate,
        '🐒', '🦍', '🦧',
    ],

    [Species.Procyon]: [
                    // Generic:
        'procyon',
                    // Species:
        'racc?oon', 'coatimund', 'longtail', 'tanuki', 'ring[ -]?tail(ed)?',
                    // Catch all:
        ...kemomimi_procyon,
        '🦝',
    ],

    [Species.Rhinoceros]: [
                    // Generic:
        'rhino', '.*[ -]rhino', 'rhinocer[ou]s',
                    // Catch all:
        '🦏',
    ],

    [Species.Rodent]: [
                    // Generic:
        'rodent', 'roedor',
                    // Species:
        'muskrat', 'chipmunk', 'squirr(e|i)l', 'hamster', 'gerbil', 'jerboa', 'burmecian', 'porcupine', 'chinchilla',
                    // mowz
        'mau[sz]', 'mow[sz]', 'mou[sz]i?ey?',
                    // rat
        'rat', 'ratsin', 'skaven',
                    // Catch all:
        gen('(rat|mousi?ey?|maus|squirrel)'),
        ...kemomimi_rodent,
        '🐀', '🐁', '🐿',
    ],

    [Species.Suidae]: [
                    // Generic:
        'pig', 'sow', 'swine', 'porci(d|ne)', 'sui(d|ne)',
                    // Species:
        'warthog', 'bushpig', 'babirusa', 'boar', 'hog',
                    // Nicnkames:
        'pigg(y|ie)', 'piglet',
                    // Anthro:
        'quilboar', 'piglin', '(h|z)oglin',
                    // Catch all:
        gen('(boar|hog|pig)'),
        ...kemomimi_suidae,
        '🐗', '🐖',
    ],

    [Species.Ursine]: [
                    // Generic:
        'bear', 'ursine', 'ursus',
                    // Species:
        'grizzly', 'black[ -]?bear', 'brown[ -]?bear', 'polar[ -]?bear',
                    // Pandas:
        'pandaren', 'panda',
                    // Catch all:
        ...kemomimi_ursine,
        '🐼',
    ],

    [Species.Xenarthra]: [
                    // Species:
        'armadillo', 'ant[ -]?eater', 'sloth', 'glyptodont', 'a(rm|mr)ad[iy]ll?o',
                    // Other:
        'pangoo?lin', // Not Xenarthra but close enough
                    // Catch all:
        '🦥',
    ],

    [Species.Demon]: [
                    // Generic:
        'd[äa]?emon(ette?|ess|ic)?', 'deamon', 'devil', '.*da?emon', 'd[äa]mon([ie]n)?.*', 'oni', 'y[oō]u?kai', 'shinigami', 'fiend', 'hellspawn',
                    // Sexy demons:
        'incubus', 'succubus', 'lilith', 'eredar', 'cambion', 'kirby',
                    // Monsters:
        'tengu', 'amanojaku', 'tanar[\']?ri', 'balor', 'maril(e|i)th', 'baphomet', '(a|e|i)fr(i|ee)t', 'tikbalang',
                    // Catch all:
        gen('(devil|demon)'),
    ],

    [Species.Divinity]: [
        'god', 'god .*', 'goddess', 'goddess .*', '.*diety', 'diety.*',
        'divinity', 'demi[ -]?god(dess)?',
        'angel', 'arch[ -]?angel', 'seraph([ie]m)?', 'ophan([ie]m)?', 'cherub(im)?',
                    // Pop culture:
        'ainur?', 'valar?', 'neph[ai]l[ei]m', 'primarch',
    ],

    [Species.Fae]: [
        'fairy', 'fae', 'fey', 'pixie', 'nymph', 'faerie',
        'imp', 'elemental', 'spirit',
        'plant',
    ],

    [Species.Humanoid]: [
        'humanoid', 'hylian',
                    // Gnomes!!!
        'dwarf', 'dwarves', 'gnome', 'halfling', 'havlin', 'hobb?it', 'homun[cg]?ulus', 'lalafell', 'yordle', 'elin',
        'draph', 'dryad', 'gith(yanki)?', 'satyr', 't[h]?(ie|ei)fling',
                    // ???
        'dullahan',
                    // Media/pop culture species:
        'zwerg', 'aasimar', 'maiar?',  'dr[ae][ae]n[ae]i', 'gem', 'crystal gem',
    ],

    [Species.Minotaur]: [
        'tauren', 'm[iy]n[ao]t(au|uo|ou|o|u)r.*',
    ],

    [Species.Monster]: [
                    // Humanoid:
        'gnoll', 'goblin', '(gn|k)obold', 'troll', 'gargoyle', 'harpy', 'ogre', 'bokoblin', 'gremlin',
                    // Animalistic:
        'behemoth', 'owlbear', 'bunyip',
                    // Monstrous:
        'monster', 'kaiju', 'godzilla', 'bugbear', 'olog[ -]?hai', 'scorchbeast',
                    // Strange:
        'mimic', 'eldritch', 'tentacle', 'slime', 'goo', 'protean', 'illithid', 'mutant',
                    // Death:
        'undead', 'lich', 'ghost', 'skeleton', 'ghoul',
    ],

    [Species.Naga]: [
        'naga', 'lamia',
    ],

    [Species.Taur]: [
        'centaur', 'equitaur', 'felitaur', 'weretaur', 'humantaur', 'cowtaur', 'cervitaur',
        'chakat', '.*taur',
    ],

    [Species.Orc]: [
        'orc', 'orcess', 'ork', 'snaga', 'uruk[ -]?hai',
                    // Catch all:
        gen('orc'),
    ],

    [Species.Vampire]: [
        'vampir', 'vampire','vampiric', 'vampyre',
        'daywalker',
        'd[h]?amp[h]?ir', 'nosferatu', 'vrykolakas',
    ],

    [Species.Were]: [
        'lycan', 'lycant[h]?rop[h]?[ey]?', 'were[ -]?.+',
        'were[ -]?wolf', 'were[ -]?coyote',
        'were[ -]?lion', 'were[ -]?tiger',
        'were[ -]?bear', 'were[ -]?hog',
        'were[ -]?squirrel', 'were[ -]?rat',
        'were[ -]?donkey',

        'were[ -]?beast',
        'loup[ -]?garou[sx]?',
    ],

    [Species.Alien]: [
                    // Generic:
        'alien', 'xenomorph', 'changeling', 'shapeshifter', 'doppelganger', 'shape[ -]?changer',
                    // Species:
        'krogan', 'quarian', 'turian', 'asari', 'togruta', 'otolla', 'gungan', 'chiss', 'puazi', 'hutt', 'klyntar', 'twi\'?lek', 'sangheili', 'salarian', 't\'?vaoan', 'yautja', 'zabrak',
    ],

    [Species.Robot]: [
                    // Hard robots:
        'android', 'cyborg', 'gynoid', 'automaton', 'robot', 'animatronic', 'machine.*?',
                    // Fake humans:
        'realian', 'replicant', 'reploid', 'synthetic', 'synth', 'construct', 'living doll',
                    // Cool people:
        'transformer', 'cybertronian', 'protogen',
                    // Jobthieves:
        'ai',
    ],

    [Species.Hub]: [
                    // Multiple:
        'hub', 'city', 'many', 'room',
                    // Any:
        'any(thing)?', 'partner preference',
                    // Malleable:
        'flexible', 'varies', 'various', 'variable',
    ]
};


export interface FchatGenderMap {
    [key: string]: Gender;
}

export const fchatGenderMap: FchatGenderMap = {
    None:           Gender.None,
    Male:           Gender.Male,
    Female:         Gender.Female,
    Shemale:        Gender.Shemale,
    Herm:           Gender.Herm,
    'Male-Herm':    Gender.MaleHerm,
    'Cunt-boy':     Gender.Cuntboy,
    Transgender:    Gender.Transgender
};

export interface KinkPreferenceMap {
    [key: string]: KinkPreference;
}

export const kinkMapping: KinkPreferenceMap = {
    favorite: KinkPreference.Favorite,
    yes:      KinkPreference.Yes,
    maybe:    KinkPreference.Maybe,
    no:       KinkPreference.No
};


export interface SpeciesMappingCacheRecord {
    regexp: RegExp;
    mappedPhrase: string;
}


export type SpeciesMappingCache = Record<number, SpeciesMappingCacheRecord[]>;


export const kinkMatchWeights = {
    // logBase: 10,
    weakMismatchThreshold: 16,
    weakMatchThreshold:    16,
    unicornThreshold:       9,
};

export const kinkMatchScoreMap = {
    favorite: {
        favorite: 1,
        yes:      0.35,
        maybe:   -0.5,
        no:      -1.5,
    },

    yes: {
        favorite: 0.35,
        yes:      0.35,
        maybe:   -0.125,
        no:      -0.35,
    },

    maybe: {
        favorite: -0.35,
        yes:      -0.125,
        maybe:     0,
        no:        0,
    },

    no: {
        favorite: -1.5,
        yes:      -0.5,
        maybe:     0,
        no:        0,
    }
};


export const kinkComparisonExclusions = {
    585: true, // amputees
    587: true, // anthro characters
    588: true, // body hair
    589: true, // canon characters
    458: true, // chubby
    605: true, // disabilities
    590: true, // facial hair / beards
    531: true, // femboys
    592: true, // femininity
    109: true, // older characters
    600: true, // shorter characters
    601: true, // skinny characters
    584: true, // slime / goo characters
    616: true, // superheroes / villains
    603: true, // taller characters
    532: true, // tomboys
    720: true, // toons
    354: true, // twinks
    183: true, // very fat characters
     85: true, // very lithe characters
     84: true, // very muscular characters
    197: true, // younger characters
};

export const kinkComparisonExclusionGroups = {
    29: true, // gender preferences
    30: true, // species preferences
};


export const kinkComparisonSwaps: Record<number, number> = {
    137: 157, // anal sex giving -> receiving
    157: 137, // anal sex receiving -> giving
    163:  16, // rimming giving -> receiving
     16: 163, // rimming receiving -> giving
    229: 340, // vaginal sex giving -> receiving
    340: 229, // vaginal sex receiving -> giving
    513: 515, // cunnilingus giving -> receiving
    515: 513, // cunnilingus receiving -> giving
    141: 158, // oral sex giving -> receiving
    158: 141, // oral sex receiving -> giving
    512: 514, // fellatio performing -> fellatio receiving
    514: 512, // fellatio receiving -> fellatio performing
};


export interface KinkBucketScore {
    score:    number;
    count:    number;
    weighted: number;
    total:    number;
}

export interface MatchResultKinkScores {
    [key: string]: KinkBucketScore;
}
