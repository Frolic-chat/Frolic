// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Exclusively exports an init() factory function that gives you a GeneralSettingsExport.
 */
import * as Electron from 'electron';
import * as fs from 'fs';
import { GeneralSettings, GeneralSettingsUpdate } from "../common";

import NewLogger from './custom-logger';
const l_s = process.argv.includes('--debug-settings');
const logSettings = NewLogger('settings', () => l_s);

const settings = new GeneralSettings();
let settingsFile: string = '';
let shouldImportSettings = false;
let generalSettingsTimestamp = 0;
let setLogLevel: ((level: GeneralSettings['risingSystemLogLevel']) => void) | undefined;

type GeneralSettingsExport = {
    raw: Readonly<GeneralSettings>,
    shouldImportSettings: boolean,
    set: <T extends keyof GeneralSettings>
        (name: T, value: GeneralSettings[T]) => void,
    upgradeAppVersion: (targetVersion: string) => boolean,
    merge: (settings: GeneralSettings) => void;
}

// Set readonly as we get closer to completion.
export function init(settingsPath: string, logLevelSetter?: (level: GeneralSettings['risingSystemLogLevel']) => void): GeneralSettingsExport {
    if (logLevelSetter)
        setLogLevel = logLevelSetter;

    if (settingsPath)
        settingsFile = settingsPath;

    if (!fs.existsSync(settingsPath)) {
        shouldImportSettings = true;
    }
    else {
        try {
            const json = fs.readFileSync(settingsPath, 'utf8');
            Object.assign(settings, JSON.parse(json) as GeneralSettings);

            settings.argv = process.argv.filter(a => a.startsWith('--'));
        }
        catch (e) {
            logSettings.error(`Error loading settings: ${e}`);
        }
    }

    registerIPC();

    return {
        raw: settings,
        shouldImportSettings,
        set,
        upgradeAppVersion,
        merge,
    };
}

/**
 * Call with no arguments to register pre-programmed events; provide your own events to register those.
 * @param extraCalls Optional: Tuples of event-name and Function
 */
function registerIPC(extraCalls?: [ [string, (event: Electron.IpcMainEvent, ...args: any[]) => void] ]) {
    if (extraCalls) {
        for (const [ channel, handler ] of extraCalls)
            Electron.ipcMain.on(channel, handler);

        return;
    }

    Electron.ipcMain.on('settings', (e, d: GeneralSettingsUpdate) => {
        if (d.timestamp > generalSettingsTimestamp) {
            generalSettingsTimestamp = d.timestamp;
            logSettings.debug('Received and storing general settings.', e.sender.id, { stale: settings, incoming: d.settings });

            merge(d.settings, e.sender.id);
        }
        else {
            logSettings.warn('Outdated settings reached main.', {
                from:    d.character,
                'from-wc': e.sender.id,
                to:      'electron-main',
                current: generalSettingsTimestamp,
                new:     d.timestamp,
            });
        }
    });

    Electron.ipcMain.on('save-login', (_e, account: string, host: string) => {
        const a = settings.account;
        const h = settings.host;

        set('account', account, -1);
        set('host',    host,    -1);

        if (account !== a || host !== h)
            updateGeneralSettings(settings);
    });
}

/**
 * Call update instead of save when we need to update the timestamp - IE, the update is generated in electron main side. `saveGeneralSettings` is invoked internally and will broadcast the new timestamp to the renderers with the new settings object. Failure to call this function and update the timestamp will cause renderers to ignore your "out-of-date" update.
 */
function updateGeneralSettings(s: GeneralSettings): void {
    generalSettingsTimestamp = Date.now();
    logSettings.debug("Internal update to general settings. You'll see 'saving and broadcasting' next", generalSettingsTimestamp);
    saveGeneralSettings(s);
}

/**
 * Optionally takes a webcontents we're saving from. If unprovided, this save will re-propogate to the renderer we received from.
 * @param s
 * @param wc Optional: a webcontents we received an updated settings from.
 */
function saveGeneralSettings(s: GeneralSettings, wcid?: number): void {
    const ts = generalSettingsTimestamp;

    if (wcid !== undefined)
        logSettings.debug('Received update; saving and broadcasting.', wcid, ts);
    else
        logSettings.debug('Local update; broadcasting general settings...', ts);

    if (settingsFile && fs.existsSync(settingsFile)) {
        const json = JSON.stringify(s, null, 4);
        try {
            fs.writeFileSync(settingsFile, json);
        }
        catch (e) {
            console.error(e);
        }
    }

    for (const w of Electron.webContents.getAllWebContents())
        if (wcid === w.id)
            logSettings.debug('Found webcontents match; Good once per timestamp.', w.id, ts);
        else
            w.send('settings', { settings: s, timestamp: ts });

    shouldImportSettings = false;

    setLogLevel?.(s.risingSystemLogLevel || 'warn');
}

/**
 * True if we upgrade; false if we don't.
 * @param newVersion
 */
function upgradeAppVersion(targetVersion: string): boolean {
    if (settings.version !== targetVersion) {
        settings.version = targetVersion;
        updateGeneralSettings(settings);

        return true;
    }
    else {
        return false;
    }
}

function merge(s: GeneralSettings, webContentsId?: number) {
    Object.assign(settings, s);

    if (webContentsId !== undefined)
        saveGeneralSettings(settings, webContentsId);
    else
        updateGeneralSettings(settings);
}

/**
 * Directly externally addressable settings.
 * @param name key of General Settings
 * @param value value to save in GeneralSettings[key]
 * @param webContentsId Pass -1 to skip saving an update; undefined/empty to propogate to all renderers
 * @returns
 */
function set<T extends keyof GeneralSettings>(name: T, value: GeneralSettings[T], webContentsId?: number) {
    if (settings[name] !== value) { // Doesn't catch identical objects/arrays, etc.
        settings[name] = value;

        if (webContentsId === undefined)
            updateGeneralSettings(settings);
        else if (webContentsId >= 0)
            saveGeneralSettings(settings, webContentsId);

        return true;
    }
    else {
        return false;
    }
}
