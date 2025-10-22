import Vue, {WatchHandler} from 'vue';
import * as qs from 'querystring';
import { CacheManager } from '../learn/cache-manager';
import {Channels, Characters} from '../fchat';
import BBCodeParser from './bbcode';
import { Settings as SettingsClass } from './common';
import Conversations from './conversations';
import {Channel, Character, Connection, Conversation, Logs, Notifications, Settings, State as StateInterface} from './interfaces';
import { AdCoordinatorGuest } from './ads/ad-coordinator-guest';
import { AdCenter } from './ads/ad-center';
import { GeneralSettings } from '../electron/common';
import { SiteSession } from '../site/site-session';
import { SettingsMerge } from '../helpers/utils';

import { EventBus } from './preview/event-bus';
import NewLogger from '../helpers/log';
const log = NewLogger('chat/core', () => process.env.NODE_ENV === 'development');

function createBBCodeParser(): BBCodeParser {
    const parser = new BBCodeParser();
    for(const tag of state.settings.disallowedTags)
        parser.removeTag(tag);
    return parser;
}

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
/**
 * The state operates as an event-bus, allowing global-reaching updates.
 */
class State implements StateInterface {
    _settings: Settings | undefined = undefined;
    // This is still bad. The real settings object (with loading saved) is imported from main.
    generalSettings: GeneralSettings = JSON.parse(params['settings']!) as GeneralSettings;
    hiddenUsers: string[] = [];
    favoriteEIcons: Record<string, boolean> = {};

    /**
     * This should absolutely be fixed to grant a basic, safe settings structure instead of throwing an error. It's bad form to state in typescript the settings always exist and then throw an error if they don't, and it has caused issues before witht he log viewer which can be used when not logged in.
     */
    get settings(): Settings {
        if (this._settings === undefined)
            throw new Error('Settings load failed.');

        return this._settings;
    }

    set settings(value: Settings) {
        this._settings = value;

        //tslint:disable-next-line:no-floating-promises
        if (data.settingsStore !== undefined) {
            data.settingsStore.set('settings', value);
            data.bbCodeParser = createBBCodeParser();
        }
    }
}

interface VueState {
    readonly channels: Channel.State
    readonly characters: Character.State
    readonly conversations: Conversation.State
    readonly state: StateInterface
}

const state = new State();

const vue = <Vue & VueState>new Vue({
    data: {
        channels:      undefined,
        characters:    undefined,
        conversations: undefined,
        state
    }
});

const data = {
    connection: <Connection | undefined>undefined,
    logs: <Logs | undefined>undefined,
    settingsStore: <Settings.Store | undefined>undefined,
    state: vue.state,
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
        Vue.set(vue, module, subState);
        (<VueState[K]>data[module]) = subState;
    },
    watch<T>(getter: (this: VueState) => T, callback: (n: any, o: any) => void, opts?: Vue.WatchOptions): void {
        vue.$watch(getter, callback, opts);
    },
    async reloadSettings(): Promise<void> {
        const s = await core.settingsStore.get('settings') as Partial<SettingsClass>;
        const initial = new SettingsClass();

        state._settings = SettingsMerge(initial, s);

        log.debug('data.reloadSettings', {
            initial: initial,
            saved: s,
            result: state._settings,
            //test: test,
        });

        const hiddenUsers = await core.settingsStore.get('hiddenUsers');
        state.hiddenUsers = hiddenUsers ?? [];

        const favoriteEIcons = await core.settingsStore.get('favoriteEIcons');
        state.favoriteEIcons = favoriteEIcons ?? {};
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
    data.notifications = new notificationsClass();
    data.cache = new CacheManager();
    data.adCoordinator = new AdCoordinatorGuest();
    data.adCenter = new AdCenter();
    data.siteSession = new SiteSession();

    data.state.generalSettings = settings;

    data.register('characters', Characters(connection));
    data.register('channels', Channels(connection, core.characters));
    data.register('conversations', Conversations());

    data.watch(() => state.hiddenUsers, async (newValue) => {
        await data.settingsStore?.set('hiddenUsers', newValue);
    }, /* { deep: true } */);

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

    watch<T>(getter: (this: VueState) => T, callback: WatchHandler<T>): void
}

const core = <Core><any>data; /*tslint:disable-line:no-any*///hack

export default core;
log.verbose('init.core');
