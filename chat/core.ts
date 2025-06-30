import { WatchCallback, reactive, watch } from 'vue';
import { CacheManager } from '../learn/cache-manager';
import { default as Channels } from '../fchat/channels';
import { default as Characters } from '../fchat/characters';
import BBCodeParser from './bbcode';
import {Settings as SettingsImpl} from './common';
import Conversations from './conversations';
import {Channel, Character, Connection, Conversation, Logs, Notifications, Settings, State as StateInterface} from './interfaces';
import { AdCoordinatorGuest } from './ads/ad-coordinator-guest';
import { AdCenter } from './ads/ad-center';
import { GeneralSettings } from '../electron/common';
import { SiteSession } from '../site/site-session';
import _ from 'lodash';

import { EventBus } from './preview/event-bus';
import Logger from 'electron-log/renderer';
const log = Logger.scope('chat/core');

function createBBCodeParser(): BBCodeParser {
    const parser = new BBCodeParser();
    for(const tag of state.settings.disallowedTags)
        parser.removeTag(tag);
    return parser;
}

class State implements StateInterface {
    _settings: Settings | undefined = undefined;
    hiddenUsers: string[] = [];
    favoriteEIcons: Record<string, boolean> = {};
    generalSettings?: GeneralSettings | undefined;

    get settings(): Settings {
        if (this._settings === undefined)
            throw new Error('Settings load failed.');

        return this._settings;
    }

    set settings(value: Settings) {
        this._settings = value;

        //tslint:disable-next-line:no-floating-promises
        if (data.settingsStore !== undefined) data.settingsStore.set('settings', value);

        data.bbCodeParser = createBBCodeParser();
    }
}

// If there's no function to change data like there was in Vue 2, then these shouldn't be readonly. Return them to readonly if we stop directly assigning the State into them.
interface VueState {
    channels: Channel.State
    characters: Character.State
    conversations: Conversation.State
    state: StateInterface
}

const state = new State();

const vueState = reactive<Partial<VueState> & { state: StateInterface }>({
    channels:       undefined,
    characters:     undefined,
    conversations:  undefined,
    state:          state
});

// Legacy vue 2.
// const vue = <Vue & VueState>new Vue({
//     data: {
//         channels:      undefined,
//         characters:    undefined,
//         conversations: undefined,
//         state
//     }
// });

const data = {
    connection: <Connection | undefined>undefined,
    logs: <Logs | undefined>undefined,
    settingsStore: <Settings.Store | undefined>undefined,
    state: vueState.state,
    bbCodeParser: new BBCodeParser(),
    conversations: <Conversation.State | undefined>undefined,
    channels: <Channel.State | undefined>undefined,
    characters: <Character.State | undefined>undefined,
    notifications: <Notifications | undefined>undefined,
    cache: <CacheManager | undefined>undefined,
    adCoordinator: <AdCoordinatorGuest | undefined>undefined,
    adCenter: <AdCenter | undefined>undefined,
    siteSession: <SiteSession | undefined>undefined,

    register<K extends 'characters' | 'conversations' | 'channels'>(module: K, subState: VueState[K]): void {
        // Vue 2
        // Vue.set(vue, module, subState);
        vueState[module] = subState;
        (<VueState[K]>data[module]) = subState;
    },
    watch<T>(getter: (this: VueState) => T, callback: (n: any, o: any) => void): void {
        watch(getter, callback);
    },
    async reloadSettings(): Promise<void> {
        const s = await core.settingsStore.get('settings');

        state._settings = _.mergeWith(new SettingsImpl(), s, (oVal, sVal) => {
            if (Array.isArray(oVal) && Array.isArray(sVal)) {
                return sVal;
            }
        });

        const hiddenUsers = await core.settingsStore.get('hiddenUsers');
        state.hiddenUsers = hiddenUsers !== undefined ? hiddenUsers : [];

        const favoriteEIcons = await core.settingsStore.get('favoriteEIcons');
        state.favoriteEIcons = favoriteEIcons !== undefined ? favoriteEIcons : {};
    }
};

export function init(this: any,
                     connection: Connection,
                     settings: GeneralSettings,
                     logsClass: new() => Logs,
                     settingsClass: new() => Settings.Store,
                     notificationsClass: new() => Notifications): void {
    data.connection = connection;
    data.logs = new logsClass();
    data.settingsStore = new settingsClass();
    data.state = vueState.state,
    data.notifications = new notificationsClass();
    data.cache = new CacheManager();
    data.adCoordinator = new AdCoordinatorGuest();
    data.adCenter = new AdCenter();
    data.siteSession = new SiteSession();

    log.debug('core.settings.params', { settings });
    data.state.generalSettings = settings;

    data.register('characters', Characters(connection));
    data.register('channels', Channels(connection, core.characters));
    data.register('conversations', Conversations());

    data.watch(() => state.hiddenUsers, async (newValue) => {
        if (data.settingsStore !== undefined)
            await data.settingsStore.set('hiddenUsers', newValue);
    });

    connection.onEvent('connecting', async () => {
        await data.reloadSettings();
        data.bbCodeParser = createBBCodeParser();

        EventBus.$emit('core-connected', data.state.settings);
    });
}

export interface Core {
    readonly connection: Connection
    readonly logs: Logs
    readonly state: StateInterface
    readonly settingsStore: Settings.Store
    readonly conversations: Conversation.State
    readonly characters: Character.State
    readonly channels: Channel.State
    readonly bbCodeParser: BBCodeParser
    readonly notifications: Notifications
    readonly cache: CacheManager
    readonly adCoordinator: AdCoordinatorGuest;
    readonly adCenter: AdCenter;
    readonly siteSession: SiteSession;

    watch<T>(getter: (this: VueState) => T, callback: WatchCallback<T>): void
}

const core = <Core><any>data; /*tslint:disable-line:no-any*///hack

export default core;
log.verbose('init.core');
