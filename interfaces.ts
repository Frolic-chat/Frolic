/**
 * The most simple character structure, used primarily for listing your characters on the log-in selector, but also for some API responses, where only `name` and `id` are used.
 *
 * Character name, unique ID, and whether or not the character exists.
 */
export interface SimpleCharacter {
    id:      number
    name:    string
    deleted: boolean
}

export interface InlineImage {
    id:         number
    name:       string
    hash:       string
    extension:  string
    nsfw:       boolean
}

export type CharacterImage = CharacterImageOld | CharacterImageNew;

export interface CharacterImageNew {
    id:          number
    extension:   string
    description: string
    hash:        string
    sort_order:  number | null
}

/**
 * Most images seem like old images. Is this based on API call or use of old/new API, or who knows?? Maybe it's based on the cycle of the moon, or how good the coffee was this morning.
 */
export interface CharacterImageOld {
    id:          number
    extension:   string
    hash?:       string
    height:      number
    width:       number
    description: string
    sort_order:  number | null
    url:         string
}

export type InfotagType = 'number' | 'text' | 'list';

export interface CharacterInfotag {
    list?:   number
    string?: string
    number?: number
}

export interface Infotag {
    id:             number
    name:           string
    type:           InfotagType
    search_field:   string
    validator?:     string
    allow_legacy:   boolean
    infotag_group:  number
}

/**
 * Public character page.
 *
 * @see [file://site/character_page/interfaces.ts](site/character_page/interfaces.ts)
 */
export interface Character extends SimpleCharacter {
    id:              number
    name:            string
    title:           string
    description:     string
    kinks:           Record<number, KinkChoice | number | undefined>
    inlines:         {[key: string]: InlineImage}
    customs:         {[key: string]: CustomKink | undefined}
    infotags:        {[key: number]: CharacterInfotag | undefined}
    created_at:      number
    updated_at:      number
    views:           number
    last_online_at?: number
    timezone?:       number
    image_count?:    number
    online_chat?:    boolean
}

/**
 * Be careful when comparing this to some API response data;
 * 'fave' is used in some instances.
 */
export type KinkChoice = 'favorite' | 'yes' | 'maybe' | 'no';

/**
 * A user's display settings for their character page.
 * Many of these may be absent from the API response.
 */
export interface CharacterSettings {
    readonly customs_first:         boolean
    readonly show_friends:          boolean
    readonly show_badges:           boolean
    readonly guestbook:             boolean
    readonly block_bookmarks:       boolean
    readonly public:                boolean
    readonly moderate_guestbook:    boolean
    readonly hide_timezone:         boolean
    readonly hide_contact_details:  boolean
}

export interface Kink {
    id:          number
    name:        string
    description: string
    kink_group:  number
}

export interface CustomKink {
    id:          number
    name:        string
    choice:      KinkChoice
    description: string
    children?:   number[]
}

export interface KinkGroup {
    id:          number
    name:        string
    description: string
    sort_order:  number
}

export interface InfotagGroup {
    id:          number
    name:        string
    description: string
    sort_order:  number
}

export interface ListItem {
    id:         number
    name:       string
    value:      string
    sort_order: number
}

export const enum InlineDisplayMode {DISPLAY_ALL, DISPLAY_SFW, DISPLAY_NONE}

export interface Settings {
    animateEicons:      boolean
    inlineDisplayMode:  InlineDisplayMode
    defaultCharacter:   number
    fuzzyDates:         boolean
}

export interface SharedDefinitions {
    readonly listItems:     {readonly [key: string]: Readonly<ListItem>}
    readonly kinks:         {readonly [key: string]: Readonly<Kink>}
    readonly kinkGroups:    {readonly [key: string]: Readonly<KinkGroup>}
    readonly infotags:      {readonly [key: string]: Readonly<Infotag>}
    readonly infotagGroups: {readonly [key: string]: Readonly<InfotagGroup>}
}
