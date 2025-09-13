import { CacheWithEvent } from "./layered_cache";
import { CharacterImage, SimpleCharacter } from "../interfaces";
import {Character as CharacterAPIResponse, CharacterGroup, Guestbook} from '../site/character_page/interfaces';

export interface CharacterProfileSecondaryDataRecord {
    images: CharacterImage[] | null;
    groups: CharacterGroup[] | null;
    friends: SimpleCharacter[] | null;
    guestbook: Guestbook | null;
    lastMetaFetched: Date | null;
}

// Legacy; included for compatibility.
export interface CharacterMatchSummary {
    matchScore: number;
    searchScore: number;
    isFiltered: boolean;
    autoResponded?: boolean;
}

export interface CachedCharacter extends CharacterAPIResponse {
    added: Date;
    lastFetched: Date;
    // Legacy. Included for compatibility. Move this to its own cache.
    match: CharacterMatchSummary;
    // Legacy naming; useed for compatibility.
    meta?: CharacterProfileSecondaryDataRecord;
}

type CharacterKey = Lowercase<CharacterAPIResponse['character']['name']>;

export interface ProfileCache extends CacheWithEvent<CachedCharacter> {
    get(character: CharacterKey): Promise<CachedCharacter | null>;
    getSync(character: CharacterKey): CachedCharacter | null;
    getCallback(character: CharacterKey, callback: Function): Promise<CachedCharacter | null>;
    refresh(character: CharacterKey): Promise<CachedCharacter | null>;
}

// region Stores
// { [key: CharacterPage['name']]: CharacterPage }
const memory = new Map<CharacterKey, CachedCharacter>();
const store = null;
async function api(character: CharacterKey): ReturnType<ProfileCache['get']> {
    // call api. handle result.
    const page = await /* result() ?? */ null;
    return page;
}

// region Intermediary
async function get_from_store(character: CharacterKey): ReturnType<ProfileCache['get']> {
    return null;
}

// region Public
function getSync(character: CharacterKey): ReturnType<ProfileCache['getSync']> {
    return memory[character] ?? null;
}

async function get(character: CharacterKey): ReturnType<ProfileCache['get']> {
    return await (memory[character] ?? api(character));
}


// region Initializers
function init() {
    // Initialize store
}
