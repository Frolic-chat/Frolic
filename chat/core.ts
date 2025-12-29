// SPDX-License-Identifier: AGPL-3.0-or-later
import Vue, {WatchHandler} from 'vue';
import * as Electron from 'electron';
import * as qs from 'querystring';
import { deepEqual, ExtractReferences, ComparePrimitives, SettingsMerge } from '../helpers/utils';
import { CacheManager } from '../learn/cache-manager';
import {Channels, Characters} from '../fchat';
import BBCodeParser from './bbcode';
import { Settings as SettingsClass } from './common';
import Conversations from './conversations';
import { Channel, Character, Connection, Conversation, Logs, Notifications, Settings, State as StateInterface, Runtime } from './interfaces';
import { AdCoordinatorGuest } from './ads/ad-coordinator-guest';
import { AdCenter } from './ads/ad-center';
import { GeneralSettings, GeneralSettingsUpdate } from '../electron/common';
import { SiteSession } from '../site/site-session';

import EventBus from './preview/event-bus';
import NewLogger from '../helpers/log';
const log = NewLogger('core', () => process.env.NODE_ENV === 'development');
const logS = NewLogger('settings', () => core.state.generalSettings.argv.includes('--debug-settings'));

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
    runtime: <Runtime>{
        dialogStack: [],
        primaryInput: null,
        registerPrimaryInputElement(e: HTMLInputElement | HTMLTextAreaElement) {
            this.primaryInput = e;
        },
        userToggles: {},
    },

    register<K extends 'characters' | 'conversations' | 'channels'>(module: K, subState: VueState[K]): void {
        Vue.set(vue, module, subState);
        (<VueState[K]>data[module]) = subState;
    },
    watch<T>(getter: (this: VueState) => T, callback: (n: T, o: T) => void, opts?: Vue.WatchOptions): void {
        vue.$watch(getter, callback, opts);
    },
    async reloadSettings(): Promise<void> {
        const s = await core.settingsStore.get('settings') as Partial<SettingsClass>;

        logS.debug('data.reloadSettings', { current: state._settings, saved: s });

        state._settings = SettingsMerge(new SettingsClass(), s);

        // Technically should be in settingsStore as we always want it for get();
        VueUpdate.Cache = {};

        const hiddenUsers = await core.settingsStore.get('hiddenUsers');
        state.hiddenUsers = hiddenUsers ?? [];

        const favoriteEIcons = await core.settingsStore.get('favoriteEIcons');
        state.favoriteEIcons = favoriteEIcons ?? {};
    },

    updateMain(channel: 'settings'): void {
        logS.warn('core.data.updateMain.settings', state.generalSettings);

        if (channel === 'settings') {
            Electron.ipcRenderer.send(channel, {
                settings: state.generalSettings,
                timestamp: MainUpdateCache.timestamp,
                character: data.connection?.character,
            });
        }
    },
};

// Store old versions of smartfilters. As a sub objects, new.filters and old.filters point to the same object, so you can't diff them.
const MainUpdateCache: {
    timestamp:   number;
    skipWatch:   boolean;
} = {
    timestamp:   0,
    skipWatch:   false,
};
const VueUpdate: {
    Cache: Partial<SettingsClass>;
    skipWatch: boolean;
} = {
    Cache: {},
    skipWatch: false,
}

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

    // Last point of assignment before placing observers on it.
    data.state.generalSettings = settings;

    data.register('characters', Characters(connection));
    data.register('channels', Channels(connection, core.characters));
    data.register('conversations', Conversations());

    data.watch(() => state.hiddenUsers, async (newValue) => {
        await data.settingsStore?.set('hiddenUsers', newValue);
    }, /* { deep: true } */);

    data.watch(() => state._settings, async (newValue) => {
        if (VueUpdate.skipWatch) {
            logS.debug('core.data.watch.state._settings.skipWatch');

            VueUpdate.skipWatch = false;
            return;
        }

        if (!newValue) { // Should never happen; avoid catastrophy.
            logS.warn('core.data.watch.state._settings No new value!?');
            return;
        }
        // else if !oldValue never happens; the object is instantiated prior to vue watching it
        else {
            let primitives_changed = false;
            let references_changed = false;
            let first_time = false; // Proxy undefined cache as first load

            if (VueUpdate.Cache.notifications !== newValue.notifications)
                EventBus.$emit('notification-setting', { old: VueUpdate.Cache.notifications ?? false, new: newValue.notifications });

            ExtractReferences(newValue).forEach(([k, v]) => {
                if (!deepEqual(VueUpdate.Cache[k], v)) {
                    if (k === 'disallowedTags') {
                        data.bbCodeParser = createBBCodeParser();
                    }
                    else if (k === 'risingFilter') {
                        EventBus.$emit('smartfilters-update', newValue.risingFilter);
                    }

                    if (!VueUpdate.Cache[k]) { // We haven't observed assignment
                        logS.debug(`core.data.watch.state._settings.${k}.firsttime`);

                        first_time = true;
                        references_changed = true;
                    }
                    else {
                        logS.debug(`core.data.watch.state._settings.${k}.changed`, { new: v, old: VueUpdate.Cache[k] });

                        VueUpdate.Cache[k] = v;
                        references_changed = true;
                    }
                }
            });

            const changed = ComparePrimitives(VueUpdate.Cache, newValue);
            const changed_keys = Object.keys(changed);

            if (changed_keys.length) {
                logS.debug('core.data.watch.state._settings.primitives.changed', changed);

                if (!first_time) {
                    changed_keys.forEach(ck =>
                        VueUpdate.Cache[ck as keyof SettingsClass] = changed[ck as keyof SettingsClass][1]
                    );
                }

                primitives_changed = true;
            }
            else {
                logS.debug('core.data.watch.state._settings.primitives.unchanged');
            }

            if (primitives_changed || references_changed) {
                if (first_time) { // settings reloaded
                    VueUpdate.Cache = structuredClone(newValue);
                }
                else {
                    logS.debug('core.data.watch.state._settings.save', newValue);

                    await data.settingsStore?.set('settings', newValue);
                }

                EventBus.$emit('configuration-update', newValue);
            }
            else {
                logS.debug('core.data.watch.state._settings.unchanged');
            }
        }
    }, { deep: true });

    data.watch(() => state.generalSettings, async () => {
        logS.debug(MainUpdateCache.skipWatch ? 'Skipping this watch.' : 'Sending own update to main.', MainUpdateCache.timestamp);

        if (MainUpdateCache.skipWatch) {
            MainUpdateCache.skipWatch = false;
        }
        else {
            MainUpdateCache.timestamp = Date.now();
            data.updateMain('settings');
        }
    }, { deep: true });

    Electron.ipcRenderer.on('settings', (_e, d: GeneralSettingsUpdate) => {
        if (d.timestamp <= MainUpdateCache.timestamp) {
            logS.warn('Settings from main stale; skipping', {
                from:    d.character,
                to:      data.connection?.character,
                current: MainUpdateCache.timestamp,
                new:     d.timestamp,
            });

            return;
        }

        MainUpdateCache.timestamp = d.timestamp;

        // const prev_settings = JSON.stringify(state.generalSettings);
        // Main dispatching an identical settings object will still cause `Object.assign` to change the internal references, causing an update without changing anything.
        // if (JSON.stringify(state.generalSettings) !== prev_settings) {
        if (!deepEqual(state.generalSettings, d.settings)) {
            Object.assign(state.generalSettings, d.settings);
            MainUpdateCache.skipWatch = true;
        }

        logS.debug(
            MainUpdateCache.skipWatch
                ? 'Skipping next watcher.'
                : 'No change from main; not skipping next watcher.',
            MainUpdateCache.timestamp
        );

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
    readonly runtime: Runtime;

    watch<T>(getter: (this: VueState) => T, callback: WatchHandler<T>, opts?: Vue.WatchOptions): void;

    updateMain(channel: 'settings'): void;
}

const core = <Core><any>data; /*tslint:disable-line:no-any*///hack

export default core;
log.verbose('init.core');
