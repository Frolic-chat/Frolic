// SPDX-License-Identifier: AGPL-3.0-or-later
import Vue, {WatchHandler} from 'vue';
import * as Electron from 'electron';
import * as qs from 'querystring';
import { deepEqual } from '../helpers/utils';
import { CacheManager } from '../learn/cache-manager';
import {Channels, Characters} from '../fchat';
import BBCodeParser from './bbcode';
import { Settings as SettingsClass } from './common';
import Conversations from './conversations';
import {Channel, Character, Connection, Conversation, Logs, Notifications, Settings, State as StateInterface} from './interfaces';
import { AdCoordinatorGuest } from './ads/ad-coordinator-guest';
import { AdCenter } from './ads/ad-center';
import { GeneralSettings, GeneralSettingsUpdate } from '../electron/common';
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
    _settings = new SettingsClass();
    // This is still bad. The real general settings object (with loading saved) is imported from main.
    generalSettings: GeneralSettings = JSON.parse(params['settings']!) as GeneralSettings;
    hiddenUsers: string[] = [];
    favoriteEIcons: Record<string, boolean> = {};

    get settings(): Settings {
        return this._settings;
    }

    /**
     * This will only trigger when directly setting the settings object; it does not fire if the internal structure changes.
     *
     * See {@link Core.watch | Core.watch} for tracking changes to the internl structure.
     */
    set settings(value: Settings) {
        this._settings = value;

        if (data.settingsStore !== undefined) {
            log.warn('set settings will not be saving core, the other saver should have picked it up.');
        }

        data.bbCodeParser = createBBCodeParser();
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
    watch<T>(getter: (this: VueState) => T, callback: (n: T, o: T) => void, opts?: Vue.WatchOptions): void {
        vue.$watch(getter, callback, opts);
    },
    async reloadSettings(): Promise<void> {
        const s = await core.settingsStore.get('settings') as Partial<SettingsClass>;

        const initial = new SettingsClass();

        log.debug('data.reloadSettings', {
            initial: initial,
            current: state._settings,
            saved: s,
        });

        state._settings = SettingsMerge(initial, s);

        const hiddenUsers = await core.settingsStore.get('hiddenUsers');
        state.hiddenUsers = hiddenUsers ?? [];

        const favoriteEIcons = await core.settingsStore.get('favoriteEIcons');
        state.favoriteEIcons = favoriteEIcons ?? {};
    },

    updateMain(channel: 'settings'): void {
        if (channel === 'settings') {
            Electron.ipcRenderer.send(channel, {
            settings: state.generalSettings,
            timestamp: generalSettingsTimestamp,
        });
        }
    },
};

// Store old versions of smartfilters. As a sub objects, new.filters and old.filters point to the same object, so you can't diff them.
let smartFilterCache = {}
let generalSettingsTimestamp = 0;
let updateTimestamp = true;

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

    data.watch(() => state._settings, async (newValue, oldValue) => {
        if (!newValue) { // Should never happen; avoid catastrophy.
            return;
        }
        else if (!oldValue) {
            smartFilterCache = structuredClone(newValue.risingFilter);
        }
        else {
            log.warn('watch _settings will save core.', newValue);
            await data.settingsStore?.set('settings', newValue);

            EventBus.$emit('configuration-update', newValue);

            if (oldValue.disallowedTags !== newValue.disallowedTags) {
                data.bbCodeParser = createBBCodeParser();

                log.debug('_settings disallowedTags updated.', oldValue, newValue);
            }

            if (oldValue.notifications !== newValue.notifications)
                EventBus.$emit('notification-setting', { old: oldValue.notifications, new: newValue.notifications });

            if (!deepEqual(newValue.risingFilter, smartFilterCache)) {
                log.warn('risingFilter in _settings changed.', newValue.risingFilter);

                EventBus.$emit('smartfilters-update', newValue.risingFilter);

                smartFilterCache = structuredClone(newValue.risingFilter);
            }
        }

    }, { deep: true });

    data.watch(() => state.generalSettings, async () => {
        if (!updateTimestamp) {
            log.debug('watch skipped.');
            updateTimestamp = true;
            return;
        }

        const old_timestamp = generalSettingsTimestamp; // for logging.
        generalSettingsTimestamp = Date.now();

        log.debug('Watcher: General settings change.', { new: generalSettingsTimestamp, old: old_timestamp });

        data.updateMain('settings');
    }, { deep: true });

    Electron.ipcRenderer.on('settings', (_e, d: GeneralSettingsUpdate) => {
        if (d.timestamp <= generalSettingsTimestamp) {
            log.debug('Settings from main: skipping', {
                curr: generalSettingsTimestamp,
                incoming: d.timestamp,
            });

            return;
        }

        log.debug('Settings from main: updating', {
            curr: generalSettingsTimestamp,
            incoming: d.timestamp,
        });

        // Don't need Vue.observable because we arne't adding any new properties we need to watch.
        generalSettingsTimestamp = d.timestamp;
        state.generalSettings = d.settings;

        updateTimestamp = false;
        log.debug('This should not trigger watcher.', generalSettingsTimestamp);

        EventBus.$emit('settings-from-main', d.settings);
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

    watch<T>(getter: (this: VueState) => T, callback: WatchHandler<T>, opts?: Vue.WatchOptions): void;

    updateMain(channel: 'settings'): void;
}

const core = <Core><any>data; /*tslint:disable-line:no-any*///hack

export default core;
log.verbose('init.core');
