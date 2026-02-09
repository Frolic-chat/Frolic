import Axios from 'axios';
import Vue from 'vue';
import Editor from '../bbcode/Editor.vue';
import { BBCodeView } from '../bbcode/view';
import {InlineDisplayMode} from '../interfaces';
import {StandardBBCodeParser} from '../bbcode/standard';
import CharacterLink from '../components/character_link.vue';
import CharacterSelect from '../components/character_select.vue';
import DateDisplay from '../components/date_display.vue';
import SimplePager from '../components/simple_pager.vue';

import {
    Character as CharacterInfo, SimpleCharacter,
    CharacterSettings, Settings,
    CharacterImage, CharacterImageOld,
    CharacterInfotag, Infotag, InfotagGroup,
    Kink, KinkChoice, KinkGroup,
    ListItem, InfotagType,
} from '../interfaces';
import {registerMethod, Store} from '../site/character_page/data_store';
import {
    Character,
    Friend, FriendRequest, FriendsByCharacter,
    Guestbook, GuestbookPost,
    CharacterKink, KinkChoiceFull,
} from '../site/character_page/interfaces';
import * as Utils from '../site/utils';
import core from './core';
import EventBus from './preview/event-bus';
import * as FLIST from '../constants/flist';

/**
 * Adaptations of export to fix broken types.
 */
interface FieldMapListItem {
    id:    string; // to num
    name:  string;
    value: string;
}

interface FieldMapKink {
    id:          string; // to num
    name:        string;
    description: string;
    group_id:    string; // to num
}

interface FieldMapKinkGroup {
    id:   string; // to num
    name: string;
}

interface FieldMapInfotag {
    id:       string; // to num
    name:     string;
    list:     string;
    type:     InfotagType;
    group_id: string; // to num
}

interface FieldMapInfotagGroup {
    id:          string // to num
    name:        string
}

type ApiFields = {
    listItems:     Record<string, ListItem>;
    kinks:         Record<string, Kink>;
    kinkGroups:    Record<string, KinkGroup>;
    infotags:      Record<string, Infotag>;
    infotagGroups: Record<string, InfotagGroup>;
}

const parserSettings = {
    siteDomain:         FLIST.Domain,
    staticDomain:       FLIST.StaticDomain,
    animatedIcons:      true,
    inlineDisplayMode:  InlineDisplayMode.DISPLAY_ALL
};


import throat from 'throat';

// Throttle queries so that only two profile requests can run at any given time
const characterDataThroat = throat(2);


/**
 * This is the, "I need the data returned right now" version of {@link core.cache.addProfile | `CacheManager.addProfile`}. Where that function adds the profile fetching to a queue (which adds the character profile to the profile cache), this function directly returns the character profile.
 *
 * All values are passed to {@link executeCharacterData | `executeCharacterData`}. `id` is unused.
 * @param name Character name
 * @param id (Default: -1) Unused
 * @param skipEvent (Default: false) Do not emit the `character-data` {@link EventBus | `EventBus`} event.
 * @returns
 */
async function characterData(name: string | undefined, id: number = -1, skipEvent: boolean = false): Promise<Character> {
    // console.log('CharacterDataquery', name);
    return characterDataThroat(async() => executeCharacterData(name, id, skipEvent));
}

async function executeCharacterData(name: string | undefined, _id: number = -1, skipEvent: boolean = false): Promise<Character> {
    const data = await core.connection.queryApi<CharacterInfo & {
        is_self: boolean,
        badges: string[],
        customs_first: boolean,
        character_list: { id: number, name: string }[],
        current_user: {
            inline_mode:    number,
            animated_icons: boolean,
        },
        custom_kinks: {
            [key: number]: {
                id:          number,
                choice:     'favorite' | 'yes' | 'maybe' | 'no',
                name:        string,
                description: string,
                children:    number[],
            }
        },
        custom_title: string,
        images:       CharacterImage[],
        kinks:        {[key: string]: string},
        infotags:     {[key: string]: string},
        memo?:        {id: number, memo: string},
        settings:     CharacterSettings,
        timezone:     number | null,
    }>('character-data.php', { name });

    const newKinks: {[key: string]: KinkChoiceFull} = {};

    for (const key in data.kinks)
        newKinks[key] = <KinkChoiceFull>(data.kinks[key] === 'fave' ? 'favorite' : data.kinks[key]);

    for (const key in data.custom_kinks) {
        const custom = data.custom_kinks[key];

        if (<'fave'>custom.choice === 'fave') custom.choice = 'favorite';

        custom.id = parseInt(key, 10);

        for (const childId of custom.children)
            newKinks[childId] = custom.id;
    }

    (<any>data.settings).block_bookmarks = (<any>data.settings).prevent_bookmarks;

    const newInfotags: {[key: string]: CharacterInfotag} = {};

    for(const key in data.infotags) {
        const characterInfotag = data.infotags[key];
        const infotag = Store.shared.infotags[key];
        if(!infotag) continue;
        newInfotags[key] = infotag.type === 'list' ? {list: parseInt(characterInfotag, 10)} : {string: characterInfotag};
    }

    Utils.settings.inlineDisplayMode = data.current_user.inline_mode;
    Utils.settings.animateEicons = core.state.settings.animatedEicons;

    const charData = {
        is_self: false,
        character: {
            id:          data.id,
            name:        data.name,
            title:       data.custom_title,
            description: data.description,
            created_at:  data.created_at,
            updated_at:  data.updated_at,
            views:       data.views,
            image_count: data.images.length,
            inlines:     data.inlines,
            kinks:       newKinks,
            customs:     data.custom_kinks,
            infotags:    newInfotags,
            online_chat: false,
            timezone:    data.timezone,
            deleted:     false
        },
        settings:       data.settings,
        badges:         data.badges,
        memo:           data.memo,
        character_list: data.character_list,
        bookmarked:     core.characters.get(data.name).isBookmarked,
        self_staff:     false
    };

    if (!skipEvent)
        EventBus.$emit('character-data', { profile: charData });

    return charData;
}

function contactMethodIconUrl(name: string): string {
    return `${Utils.staticDomain}images/social/${name}.png`;
}

async function fieldsGet(): Promise<void> {
    if (Store.shared !== undefined) return;

    try {
        const response = (await (Axios.get(`${Utils.siteDomain}json/api/mapping-list.php`))).data as {
            // listitems:      {[key: string]: FieldMapListItem}
            // kinks:          {[key: string]: FieldMapKink}
            // kink_groups:    {[key: string]: KinkGroup}
            // infotags:       {[key: string]: FieldMapInfotag}
            // infotag_groups: {[key: string]: FieldMapInfotagGroup}
            listitems:      FieldMapListItem[];
            kinks:          FieldMapKink[];
            kink_groups:    FieldMapKinkGroup[];
            infotags:       FieldMapInfotag[];
            infotag_groups: FieldMapInfotagGroup[];
        };

        const new_api: ApiFields = {
            kinks:         {},
            kinkGroups:    {},
            infotags:      {},
            infotagGroups: {},
            listItems:     {},
        };

        response.kinks.forEach(k => {
            new_api.kinks[k.id] = {
                id:          Number(k.id),
                name:        k.name,
                description: k.description,
                kink_group:  Number(k.group_id),
            }
        });

        response.kink_groups.forEach(kg => {
            new_api.kinkGroups[kg.id] = {
                id:          Number(kg.id),
                name:        kg.name,
                description: '',
                sort_order:  Number(kg.id),
            };
        });

        response.infotags.forEach(it => {
            new_api.infotags[it.id] = {
                id:            Number(it.id),
                name:          it.name,
                type:          it.type,
                validator:     it.list,
                search_field:  '',
                allow_legacy:  true,
                infotag_group: Number(it.group_id),
            }
        });

        response.listitems.forEach(li => {
            new_api.listItems[li.id] = {
                id:         Number(li.id),
                name:       li.name,
                value:      li.value,
                sort_order: Number(li.id),
            };
        });

        response.infotag_groups.forEach(itg => {
            new_api.infotagGroups[itg.id] = {
                id:          Number(itg.id),
                name:        itg.name,
                description: '',
                sort_order:  Number(itg.id),
            };
        });

        Store.shared = new_api;
    }
    catch(e) {
        Utils.ajaxError(e, 'Error loading character fields');
        throw e;
    }
}

async function friendsGet(id: number): Promise<SimpleCharacter[]> {
    return (await core.connection.queryApi<{friends: SimpleCharacter[]}>('character-friends.php', {id})).friends;
}

/**
 * Update 2025: `{ images: false, error: "" }` is a valid response for no pictures.
 * @param id
 * @returns `false` is a new return.
 */
async function imagesGet(id: number): Promise<CharacterImage[] | false> {
    return (await core.connection.queryApi<{ images: (CharacterImage[] | false) }>('character-images.php', {id})).images;
}

type GuestbookResponse = {
    canEdit:  boolean;
    error:    string;
    nextPage: boolean;
    page:     number;
    posts:    GuestbookPost[];
}

async function guestbookGet(id: number, offset: number): Promise<Guestbook> {
    const data = await core.connection.queryApi<GuestbookResponse>('character-guestbook.php', { id, page: Math.floor(offset / 10) });

    return {posts: data.posts, total: data.nextPage ? offset + 100 : offset};
}

async function kinksGet(id: number): Promise<CharacterKink[]> {
    const data = await core.connection.queryApi('character-data.php', { id });

    return Object.keys(data.kinks)
            .map(key => {
                const choice = data.kinks[key];
                return {id: parseInt(key, 10), choice: <KinkChoice>(choice === 'fave' ? 'favorite' : choice)};
            }
    );
}


export function init(settings: Settings, characters: SimpleCharacter[]): void {
    Utils.setDomains(parserSettings.siteDomain, parserSettings.staticDomain);

    Vue.component('character-select', CharacterSelect);
    Vue.component('character-link', CharacterLink);
    Vue.component('date-display', DateDisplay);
    Vue.component('simple-pager', SimplePager);
    Vue.component('bbcode', BBCodeView(new StandardBBCodeParser()));
    Vue.component('bbcode-editor', Editor);
    Utils.init(settings, characters);
    core.connection.onEvent('connecting', () => {
        Utils.settings.defaultCharacter = characters.find(x => x.name === core.connection.character)!.id;
    });
    registerMethod('characterData', characterData);
    registerMethod('contactMethodIconUrl', contactMethodIconUrl);
    registerMethod('sendNoteUrl', (character: CharacterInfo) => `${Utils.siteDomain}read_notes.php?send=${character.name}`);
    registerMethod('fieldsGet', fieldsGet);
    registerMethod('friendsGet', friendsGet);
    registerMethod('kinksGet', kinksGet);
    registerMethod('imagesGet', imagesGet);
    registerMethod('guestbookPageGet', guestbookGet);
    registerMethod('imageUrl', (image: CharacterImageOld) => image.url);
    registerMethod('memoUpdate', async (id: number, memo: string) => {
        await core.connection.queryApi('character-memo-save.php', {target: id, note: memo});
    });
    registerMethod('imageThumbUrl', (image: CharacterImage) => `${Utils.staticDomain}images/charthumb/${image.id}.${image.extension}`);
    registerMethod('bookmarkUpdate', async (id: number, state: boolean) => {
        await core.connection.queryApi(`bookmark-${state ? 'add' : 'remove'}.php`, {id});
    });
    registerMethod('characterFriends', async (id: number) =>
        core.connection.queryApi<FriendsByCharacter>('character-friend-list.php', {id})
    );
    registerMethod('friendRequest', async (target_id: number, source_id: number) =>
        (await core.connection.queryApi<{request: FriendRequest}>('request-send2.php', {source_id, target_id})).request
    );
    registerMethod('friendDissolve', async (friend: Friend) =>
        core.connection.queryApi<void>('friend-remove.php', {source_id: friend.source.id, dest_id: friend.target.id})
    );
    registerMethod('friendRequestAccept', async (req: FriendRequest) => {
        await core.connection.queryApi('request-accept.php', {request_id: req.id});
        return {id: undefined!, source: req.target, target: req.source, createdAt: Date.now() / 1000};
    });
    registerMethod('friendRequestCancel', async (req: FriendRequest) =>
        core.connection.queryApi<void>('request-cancel.php', {request_id: req.id})
    );
    registerMethod('friendRequestIgnore', async (req: FriendRequest) =>
        core.connection.queryApi<void>('request-deny.php', {request_id: req.id})
    );
}
