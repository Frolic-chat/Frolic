// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * @license
 * This file is part of Frolic!
 * Copyright (C) 2019 F-Chat Rising Contributors, 2025 Frolic Contributors listed in `COPYING.md`
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program; if not, see <https://www.gnu.org/licenses>.
 *
 *
 * Frolic incorporates Expat (MIT) licensed code. Below is the original license text, included per its terms. This is NOT permission to use non-Expat licensed code under Expat license terms.
 *
 * MIT License
 *
 * Copyright (c) 2018 F-List
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license header applies to this file and all of the non-third-party assets it includes.
 * @file The entry point for the Electron main thread of Frolic.
 * @copyright 2018 F-List, 2019 F-Chat Rising Contributors, 2025 Frolic Contributors
 * @author Maya Wolf <maya@f-list.net>, F-Chat Rising Contributors, Frolic Contributors
 * @version 0.8.2
 * @see {@link https://github.com/frolic-chat/frolic|GitHub repo}
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ShellQuote from 'shell-quote';
import process from 'node:process';
const platform = process.platform;

import * as Electron from 'electron';
const app = Electron.app; // Module to control application life.

// `InitLogger` runs the electron-log init, so has to run before any use of the logger.
import InitLogger from './main/logger';
InitLogger(app.getPath('logs'));

import NewLogger from './main/custom-logger';
const l_m = process.argv.includes('--debug-main');
const l_s = process.argv.includes('--debug-settings');
const l_b = process.argv.includes('--debug-browser');
const log = NewLogger('main', () => l_m);
const logSettings = NewLogger('settings', () => l_s);
const logBrowser = NewLogger('browser', () => l_b);

import Logger from 'electron-log';
import { LevelOption as LogLevelOption, levels as logLevels } from 'electron-log';

import * as remoteMain from '@electron/remote/main';
remoteMain.initialize();

import * as ChildProcess from 'child_process';
import { FindExeFileFromName } from '../helpers/utils';

import l from '../chat/localize';
import { getSafeLanguages, knownLanguageNames, updateSupportedLanguages } from './language';
import * as windowState from './main/window_state';
import SecureStore from './main/secure-store';
import { AdCoordinatorHost } from '../chat/ads/ad-coordinator-host';
import { BlockerIntegration } from './blocker/blocker';
import * as FROLIC from '../constants/frolic';
import { IncognitoArgFromBrowserPath } from '../constants/general';
import * as UpdateCheck from './main/updater';
import versionUpgradeRoutines from './main/version-upgrade';

//region: 2nd Instance
const isSquirrelStart = require('electron-squirrel-startup'); //tslint:disable-line:no-require-imports
if (isSquirrelStart || process.env.NODE_ENV === 'production' && !app.requestSingleInstanceLock())
    app.quit();
else {
    app.on('second-instance', () => PrimaryWindow?.show());
    app.on('ready', onReady);
}


import InitIcon from './main/icon';
const icon = {
    main:      InitIcon(platform, 'icon',       path.join(__dirname, 'system')),
    mainBadge: InitIcon(platform, 'badge',      path.join(__dirname, 'system')),
    tray:      InitIcon(platform, 'tray',       path.join(__dirname, 'system')),
    trayBadge: InitIcon(platform, 'tray-badge', path.join(__dirname, 'system')),
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let PrimaryWindow: Electron.BrowserWindow | undefined;
const characters: string[] = [];
let tabCount = 0;

import * as LicenseHandler from './main/license-handler';
LicenseHandler.init(app.getAppPath());

const baseDir = app.getPath('userData');
fs.mkdirSync(baseDir, { recursive: true });

const settingsDir = path.join(baseDir, 'data');
fs.mkdirSync(settingsDir, { recursive: true });

import * as GeneralSettingsManager from './main/general-settings';
const settings_path = path.join(settingsDir, 'settings');
const settings = GeneralSettingsManager.init(settings_path, setLogLevel);

// We wouldn't want to await this even if we were using an ES that supported such a thing.
import * as EiconManager from './main/eicon-store';
void EiconManager.init(settingsDir, 'eicons', 'favoriteEIcons', () => settings.raw.logDirectory);

import InitScratchpad from './main/scratchpad';
const scratchpad_path = path.join(settingsDir, 'scratchpad');
InitScratchpad(scratchpad_path);

if (!settings.raw.hwAcceleration) {
    logSettings.info('Disabling hardware acceleration.');
    app.disableHardwareAcceleration();
}

/**
 * Imgur may have had problems in the past with electron headers; uncertain this is necessary anymore.
 */
function fixImgurCORS() {
    Electron.session.defaultSession.webRequest.onBeforeSendHeaders(
        {
            urls: [
                'https://api.imgur.com/*',
                'https://i.imgur.com/*',
            ]
        },
        (details, callback) => {
            details.requestHeaders['Origin'] = '';
            callback({requestHeaders: details.requestHeaders});
        }
    );
}

// region Dictionary
// async function setDictionary(lang: string | undefined): Promise<void> {
//     if(lang !== undefined) await ensureDictionary(lang);
//     settings.spellcheckLang = lang;
//     updateGeneralSettings(settings);
// }

export function updateSpellCheckerLanguages(langs: string[]): void {
    Electron.session.defaultSession.setSpellCheckerLanguages(langs);

    PrimaryWindow?.webContents.session.setSpellCheckerLanguages(langs);
    PrimaryWindow?.webContents.send('update-dictionaries', langs);
}

async function toggleDictionary(lang: string): Promise<void> {
    const activeLangs = getSafeLanguages(settings.raw.spellcheckLang);

    let newLangs: string[] = [];
    if (activeLangs.includes(lang)) {
        newLangs = activeLangs.filter(al => al !== lang);
    }
    else {
        activeLangs.push(lang);
        newLangs = activeLangs;
    }

    const langs = Array.from(new Set(newLangs));
    settings.set('spellcheckLang', langs);

    updateSpellCheckerLanguages(newLangs);
}

async function addSpellcheckerItems(menu: Electron.Menu): Promise<void> {
    const selected = getSafeLanguages(settings.raw.spellcheckLang);
    const langs = Electron.session.defaultSession.availableSpellCheckerLanguages;

    const sortedLangs = langs
        .map(lang => ({
            lang, name: (lang in knownLanguageNames)
                ? `${(knownLanguageNames as {[key: string]: string})[lang]} (${lang})`
                : lang
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const lang of sortedLangs) {
        menu.append(new Electron.MenuItem(
            {
                type: 'checkbox',
                label: lang.name,
                checked: (selected.indexOf(lang.lang) >= 0),
                click: async() => toggleDictionary(lang.lang)
            }
        ));
    }
}

// region URL
/**
 * Opens a link; optionally in incognito mode. Incognito is only available if a browser is set in the "Custom browser" settings.
 *
 * This function handles both standard links that pass through {@link openLinkExternally} and links from the "Open in Incognito mode" right-click menu option.
 *
 * Normally, we can fall back to {@link electron.shell.openExternal} when there's no custom browser. However, when incognito mode is requested, abort if we aren't able to honor the player's privacy so we don't add anything spicy to the player's browser history.
 *
 * @param url Url of the page to open; no internal validation is performed.
 * @param incognito `true` to use incognito mode (and error if we can't).
 */
function openURLExternally(url: string, incognito: boolean = false): void {
    if (!settings.raw.browserPath) {
        if (!incognito) {
            // Zero config: Open in system default browser
            Electron.shell.openExternal(url);
            return;
        }
        else {
            // TODO: Robust error handler.
            Electron.dialog.showMessageBox({
                title: 'Frolic! - Browser Failure',
                message: l('chat.noBrowser'),
                type: 'warning',
                buttons: [],
            });

            return;
        }
    }

    // Advanced parsing of user-provided browser.
    // If it resolves, save it so we don't do this again.
    try {
        try {
            fs.accessSync(settings.raw.browserPath, fs.constants.X_OK);
        }
        catch {
            const stdout = FindExeFileFromName(settings.raw.browserPath);
            if (!stdout)
                throw new Error('Premature catch of empty stdout return. It would error on accessSync anyways.');

            logBrowser.info(`Unexpected custom browser, but found "${stdout}" - Attemping to use it.`);

            fs.accessSync(stdout, fs.constants.X_OK);
            settings.set('browserPath', stdout);
        }
    }
    catch {
        // TODO: Robust error handler.
        Electron.dialog.showMessageBox({
            title: 'Frolic! - Browser Failure',
            message: l('chat.brokenBrowser'),
            type: 'warning',
            buttons: [],
        });

        return;
    }

    if (incognito && !settings.raw.browserIncognitoArg) {
        // Check against fixed list of known incognito flags
        const incognitoArg = IncognitoArgFromBrowserPath(settings.raw.browserPath);

        if (incognitoArg) {
            settings.set('browserIncognitoArg', incognitoArg);
        }
        else {
            // TODO: Robust error handler.
            Electron.dialog.showMessageBox({
                title: 'Frolic! - Browser Failure',
                message: l('chat.noBrowser'),
                type: 'warning',
                buttons: [],
            });

            return;
        }
    }

    if (!settings.raw.browserArgs)
        settings.set('browserArgs', '%s');
    else if (!settings.raw.browserArgs.includes('%s'))
        settings.set('browserArgs', settings.raw.browserArgs + ' %s');

    // Ensure url is encoded, but not twice.
    // `%25` is the encoded `%` symbol.
    url = encodeURI(url);
    url = url.replace(/%25([0-9a-f]{2})/ig, '%$1');

    // The path is passed in by itself, likely chosen from file selector (or user manually typing it in), so don't. Just don't.
    //const safe_browser = ShellQuote.parse(`"${settings.raw.browserPath}"`); // Ok, we won't.
    const safe_incog   = ShellQuote.parse(settings.raw.browserIncognitoArg);
    const safe_args    = ShellQuote.parse(settings.raw.browserArgs);
    const safe_url     = ShellQuote.parse(`"${url}"`);

    logBrowser.debug(`safe args:\n\t${settings.raw.browserPath}\n\t${safe_incog}\n\t${safe_args}\n\t${safe_url}`);

    const args = structuredClone(safe_args);

    if (incognito && settings.raw.browserIncognitoArg)
        args.unshift(...safe_incog);

    // All arg containers could be multiple args, so can't check in this manner.
    if (safe_url.length > 1 || safe_url.some(e => typeof e !== 'string')) {
        Electron.dialog.showMessageBox({
            title: 'Frolic! - Browser Failure',
            message: l('chat.badBrowserArguments'),
            type: 'error',
            buttons: [],
        });

        return;
    }

    // Potentially, we could stop filtering at the first object. But this is all user input, not internet. You are allowed to screw yourself; others are not allowed to screw you.
    const filtered_args = args
        .filter(s => typeof s === 'string')
        .map(s => s === '%s' ? safe_url[0] as string : s); // Above error handler sanitizes nonstring

    logBrowser.debug(`Opening: ${filtered_args} with ${settings.raw.browserPath}`);

    // MacOS bug: If app browser is Safari and OS browser is not, both will open.
    // https://developer.apple.com/forums/thread/685385

    // Below as string[] cast is for ts 3.9 in webpack. remove. Tags: @ts-ignore, not utter bs for once, what's chogoma?
    ChildProcess.spawn(settings.raw.browserPath, filtered_args as string[], { detached: true, stdio: 'ignore' }).unref();
}

function setUpWebContents(webContents: Electron.WebContents): void {
    remoteMain.enable(webContents);

    const openLinkExternally = (url: string) => {
        const profileMatch = url.match(/^https?:\/\/(www\.)?f-list\.net\/c\/([^/#]+)\/?#?/);

        if (profileMatch !== null && settings.raw.profileViewer) {
            webContents.send('open-profile', decodeURIComponent(profileMatch[2]));
            return;
        }
        else {
            openURLExternally(url);
        }

    };

    webContents.setVisualZoomLevelLimits(1, 5);

    webContents.on('will-navigate', (e, url: string) => {
        e.preventDefault();
        openLinkExternally(url);
    });

    webContents.setWindowOpenHandler(({ url }) => {
        openLinkExternally(url);
        return { action: 'deny' };
    });
}

const tabMap: Map<string, Electron.WebContents> = new Map();
let tray: Electron.Tray | undefined;

function createTrayMenu(): Electron.MenuItemConstructorOptions[] {
    const tabItems: Electron.MenuItemConstructorOptions[] = Array.from(tabMap)
        .map(([tabId, webContents]) => ({
            label: tabId,
            click: () => {
                if (PrimaryWindow?.isMinimized())
                    PrimaryWindow.restore();
                else if (PrimaryWindow && !PrimaryWindow.isVisible())
                    PrimaryWindow?.show();
                else
                    PrimaryWindow?.focus();

                PrimaryWindow?.webContents.focus();
                PrimaryWindow?.webContents.send('show-tab', webContents.id);

                webContents.focus();
            }
         }));

    return [
        {
            label: l('title'),
            click: () => {
                if ((process.platform === 'win32' && PrimaryWindow?.isVisible())
                ||  (process.platform === 'linux' && PrimaryWindow?.isFocused())) {
                    if (settings.raw.closeToTray)
                        PrimaryWindow.hide();
                    else
                        PrimaryWindow.minimize();
                }
                else {
                    if (PrimaryWindow?.isMinimized())
                        PrimaryWindow.restore()
                    else if (PrimaryWindow && !PrimaryWindow.isVisible())
                        PrimaryWindow.show();
                    else
                        PrimaryWindow?.focus();

                    PrimaryWindow?.webContents.focus();
                }
            },
        },
        { type: 'separator' },
        ...tabItems,
        { type: 'separator' },
        {
            label: l('action.quit'),
            click: () => {
                PrimaryWindow?.webContents.send('quit');
                Electron.app.quit();
            },
        }
    ];
}

const windowStatePath = path.join(settingsDir, 'window.json');

function createWindow(): Electron.BrowserWindow | undefined {
    if (tabCount >= 3) return;

    const lastState = windowState.getSavedWindowState(windowStatePath);

    const windowProperties: Electron.BrowserWindowConstructorOptions & {maximized: boolean} = {
        ...lastState,
        center: lastState.x === undefined,
        show: false,
        icon: icon.main,
        webPreferences: {
            webviewTag: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            spellcheck: true,
            contextIsolation: false,
            partition: 'persist:fchat',
        }
    };

    if (platform === 'darwin') {
        windowProperties.titleBarStyle = 'hiddenInset';
        // windowProperties.frame = true;
    }
    else {
       windowProperties.frame = false;
    }

    const window = new Electron.BrowserWindow(windowProperties);

    remoteMain.enable(window.webContents);

    window.webContents.on('will-attach-webview', () => {
            Electron.webContents.getAllWebContents()
                .forEach(item => remoteMain.enable(item));
    });

    updateSupportedLanguages(Electron.session.defaultSession.availableSpellCheckerLanguages);

    const safeLanguages = getSafeLanguages(settings.raw.spellcheckLang);
    Electron.session.defaultSession.setSpellCheckerLanguages(safeLanguages);
    window.webContents.session.setSpellCheckerLanguages(safeLanguages);

    // Set up ad blocker
    BlockerIntegration.factory(baseDir);

    // This prevents automatic download prompts on certain webview URLs without
    // stopping conversation logs from being downloaded
    Electron.session.defaultSession.on('will-download', (e, item) => {
        if (!item.getURL().match(/^blob:file:/)) {
            log.info('download.prevent', { item, event: e });
            e.preventDefault();
        }
    });
    // Tweaks:
    fixImgurCORS();

    // tslint:disable-next-line:no-floating-promises
    window.loadFile(
        path.join(__dirname, 'window.html'),
        {
            query: {
                settings: JSON.stringify(settings.raw),
                import: settings.shouldImportSettings ? 'true' : '',
                upgradeRoutineShouldRun: JSON.stringify(upgradeRoutineShouldRun),
            }
        }
    );

    setUpWebContents(window.webContents);

    // Save window state when it is being closed.
    window.on('close', () => windowState.setSavedWindowState(window, windowStatePath));
    window.on('minimize', () => {})
    window.once('ready-to-show', () => {
        window.show();
        if (lastState.maximized) window.maximize();
    });

    if (!tray) {
        tray = new Electron.Tray(icon.tray);
        tray.setToolTip(l('title'));
        tray.setIgnoreDoubleClickEvents(true);

        tray.on('click', _e => tray?.popUpContextMenu());
        // None of this works anyways lmao...
        tray.on('right-click', _e => {
            // isFocused only works on linux - windows unfocuses when you click the tray.
            if (window.isFocused()) {
                if (settings.raw.closeToTray)
                    window.hide();
                else
                    window.minimize();
            }
            else {
                if (window.isMinimized())
                    window.restore()
                else if (!window.isVisible())
                    window.show();
                else
                    window.focus();

                window.webContents.focus();
            }
        });

        tray.setContextMenu(Electron.Menu.buildFromTemplate(createTrayMenu()));
        log.debug('init.window.add.tray');
    }

    return window;
}

function showPatchNotes(): void {
    openURLExternally(FROLIC.ChangelogUrl);
}

function setLogLevel(level: Logger.LevelOption) {
    Logger.transports.file.level    = level || 'warn';
    Logger.transports.console.level = level || 'warn';
}


let zoomLevel = 0;
let upgradeRoutineShouldRun = false;
function onReady(): void {
    setLogLevel(settings.raw.risingSystemLogLevel);
    Logger.transports.file.maxSize = 5 * 1024 * 1024;

    log.info('Starting application.');

    app.setAppUserModelId('com.squirrel.fchat.Frolic');
    app.on('open-file', createWindow);

    app.on('web-contents-created', (_e, wc) => {
        wc.setWindowOpenHandler(() => ({ action: "deny" }));
    });

    const currVersion = settings.raw.version;
    const targetVersion = app.getVersion();
    if (settings.upgradeAppVersion(targetVersion)) {
        upgradeRoutineShouldRun = true;
        log.debug(`Upgrade version ${currVersion} -> ${targetVersion}`);

        // Run all routines necessary to upgrade the general settings.
        // Realistically these should be unified with the generalsettings or updater.
        versionUpgradeRoutines(currVersion, targetVersion, {
            '0.8.3': () => {
                EiconManager.startFromScratch();
                return true;
            },
        });
    }

    function updateAllZoom(c: Electron.WebContents[]   = [],
                           zoomLevel: number
                        ): void {
        c.forEach(w => w.send('update-zoom', zoomLevel));
        PrimaryWindow?.webContents.send('update-zoom', zoomLevel);
    }

    const viewItem = {
        label: `&${ l('action.view') }`,
        submenu: <Electron.MenuItemConstructorOptions[]>[
            // {role: 'resetZoom'},
            {
                label: l('action.resetZoom'),
                click: () => {
                    zoomLevel = 0;
                    updateAllZoom(Electron.webContents.getAllWebContents(), zoomLevel);
                },
                accelerator: 'CmdOrCtrl+0'
            },
            {
                // role: 'zoomIn',
                label: l('action.zoomIn'),
                click: (_m, w) => {
                    // `BrowserWindow` is an extension of `BaseWindow` after Electron upgrade
                    // Will we ever be in a situation where it's otherwise?
                    if (w instanceof Electron.BrowserWindow) {
                        zoomLevel = Math.min(zoomLevel + w.webContents.getZoomFactor()/2, 6);
                        updateAllZoom(Electron.webContents.getAllWebContents(), zoomLevel);
                    }
                },
                accelerator: 'CmdOrCtrl+='
            },
            {
                // role: 'zoomOut',
                label: l('action.zoomOut'),
                click: (_m, w) => {
                    // `BrowserWindow` is an extension of `BaseWindow`
                    // Will we ever be in a situation where it's otherwise?
                    if (w instanceof Electron.BrowserWindow) {
                        zoomLevel = Math.max(-5, zoomLevel - w.webContents.getZoomFactor()/2);

                        updateAllZoom(Electron.webContents.getAllWebContents(), zoomLevel);
                    }
                },
                accelerator: 'CmdOrCtrl+-'
            },
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    };
    if (process.env.NODE_ENV !== 'production')
        viewItem.submenu.unshift({role: 'reload'}, {role: 'forceReload'}, {role: 'toggleDevTools'}, {type: 'separator'});
    const spellcheckerMenu = new Electron.Menu();

    addSpellcheckerItems(spellcheckerMenu);

    //region Themes
    const themes = fs.readdirSync(path.join(__dirname, 'themes'))
            .filter(x => x.slice(-4) === '.css')
            .map(x => x.slice(0, -4));

    //region Updater
    const updateCheckTimer = setInterval(
        async () => {
            const hasUpdate = await UpdateCheck.checkForGitRelease(app.getVersion(), FROLIC.GithubReleaseApiUrl, settings.raw.beta);

            if (hasUpdate) {
                clearInterval(updateCheckTimer);

                const menu = Electron.Menu.getApplicationMenu();
                const item = menu?.getMenuItemById(updateReadyMenuItem.id);
                if (item) item.visible = true;

                PrimaryWindow?.webContents.send('update-available', true);
            }
        },
        FROLIC.UpdateCheckInterval
    );

    setTimeout(
        async () => {
            const hasUpdate = await UpdateCheck.checkForGitRelease(app.getVersion(), FROLIC.GithubReleaseApiUrl, settings.raw.beta);

            if (hasUpdate) {
                clearInterval(updateCheckTimer);

                const menu = Electron.Menu.getApplicationMenu()!;
                const item = menu.getMenuItemById(updateReadyMenuItem.id);
                if (item) item.visible = true;

                PrimaryWindow?.webContents.send('update-available', true);
            }
        },
        6000 // 6 seconds
    );

    UpdateCheck.registerReleaseInfoIpc();

    const updateReadyMenuItem = {
        label: l('action.updateAvailable'),
        id: 'update',
        visible: false,
        click: () => openURLExternally(FROLIC.GitHubReleasesUrl),
    };


    //region Main Menu
    const licenseDir = path.join(app.getAppPath(), 'licenses');
    const licenseMenuItem = {
        label: l('action.viewLicense'),
        click: () => Electron.shell.openPath(licenseDir),
    };

    Electron.Menu.setApplicationMenu(Electron.Menu.buildFromTemplate([
        updateReadyMenuItem,
        {
            label: l('action.newTab'),
            click: (_m, w) => {
                if (!upgradeRoutineShouldRun && tabCount < 3 && w instanceof Electron.BrowserWindow)
                    w.webContents.send('open-tab');
            },
            accelerator: 'CmdOrCtrl+t'
        },
        { type: 'separator' },
        {
            label: `&${l('title')}`,
            submenu: [
                {
                    label: "hidden switch-tab accelerator",
                    accelerator: 'Ctrl+Tab',
                    click: (_m, w) => {
                        if (w instanceof Electron.BrowserWindow)
                            w.webContents.send('switch-tab');
                    },
                    visible: false,
                },
                {
                    label: "hidden previous-tab accelerator",
                    accelerator: 'Ctrl+Shift+Tab',
                    click: (_m, w) => {
                        if (w instanceof Electron.BrowserWindow)
                            w.webContents.send('previous-tab');
                    },
                    visible: false,
                },
                {
                    label: l('settings.logDir'),
                    click: (_m, window) => {
                        if (!window)
                            return;

                        const dir = Electron.dialog.showOpenDialogSync({
                            defaultPath: settings.raw.logDirectory,
                            properties: [ 'openDirectory' ],
                        });

                        if (dir) {
                            if (dir[0].startsWith(path.dirname(app.getPath('exe'))))
                                return Electron.dialog.showErrorBox(l('settings.logDir'), l('settings.logDir.inAppDir'));

                            const button = Electron.dialog.showMessageBoxSync(window, {
                                message: l('settings.logDir.confirm', dir[0], settings.raw.logDirectory),
                                buttons: [l('confirmYes'), l('confirmNo')],
                                cancelId: 1
                            });
                            if (button === 0) {
                                PrimaryWindow?.webContents.send('quit');

                                settings.set('logDirectory', dir[0]);

                                app.quit();
                            }
                        }
                    }
                },
                {
                    label: l('settings.closeToTray'),
                    type: 'checkbox',
                    checked: settings.raw.closeToTray,
                    click: m => settings.set('closeToTray', m.checked),
                },
                {
                    label: l('settings.profileViewer'),
                    type: 'checkbox',
                    checked: settings.raw.profileViewer,
                    click: m => settings.set('profileViewer', m.checked),
                },
                {
                    label: l('settings.spellcheck'),
                    submenu: spellcheckerMenu,
                },
                {
                    label: l('settings.theme'),
                    submenu: themes.map(theme => ({
                        checked: settings.raw.theme === theme,
                        click: () => settings.set('theme', theme),
                        label: theme,
                        type: <'radio'>'radio'
                    }))
                },
                {
                    label: l('settings.hwAcceleration'),
                    type: 'checkbox',
                    checked: settings.raw.hwAcceleration,
                    click: m => settings.set('hwAcceleration', m.checked),
                },
                // {
                //     label: l('settings.beta'), type: 'checkbox', checked: settings.beta,
                //     click: async(item: electron.MenuItem) => {
                //         settings.beta = item.checked;
                //         updateGeneralSettings(settings);
                //         // electron.autoUpdater.setFeedURL({url: updaterUrl+(item.checked ? '?channel=beta' : ''), serverType: 'json'});
                //         // return electron.autoUpdater.checkForUpdates();
                //     }
                // },
                {
                    label: l('fixLogs.action'),
                    click: (_m, w) => {
                        if (w instanceof Electron.BrowserWindow)
                            w.webContents.send('fix-logs');
                    },
                },
                { type: 'separator' },
                {
                    label: l('action.logLevel'),
                    submenu: logLevels.map(level => ({
                        checked: settings.raw.risingSystemLogLevel === level,
                        label: `${level.substring(0, 1).toUpperCase()}${level.substring(1)}`,
                        click: () => settings.set('risingSystemLogLevel', level as LogLevelOption),
                        type: 'radio',
                    })),
                },
                {
                    visible: platform === 'win32',
                    label: l('action.toggleHighContrast'),
                    type: 'checkbox',
                    checked: settings.raw.risingDisableWindowsHighContrast,
                    click: m => settings.set('risingDisableWindowsHighContrast', m.checked),
                },
                {
                    label: l('action.profile'),
                    click: (_m, w) => {
                        if (w instanceof Electron.BrowserWindow)
                            w.webContents.send('reopen-profile');
                    },
                    accelerator: 'CmdOrCtrl+p'
                },
            ]
        },
        {
            label: `&${l('action.edit')}`,
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {role: 'selectAll'},
            ],
        },
        viewItem,
        {
            label: `&${l('help')}`,
            submenu: [
                licenseMenuItem,
                {
                    label: l('help.rules'),
                    click: () => openURLExternally('https://wiki.f-list.net/Rules')
                },
                {
                    label: l('help.faq'),
                    click: () => openURLExternally('https://wiki.f-list.net/Frequently_Asked_Questions')
                },
                {
                    label: l('help.report'),
                    click: () => openURLExternally('https://wiki.f-list.net/How_to_Report_a_User#In_chat')
                },
                {
                    label: l('version', app.getVersion()),
                    click: showPatchNotes
                }
            ]
        },
        {type: 'separator'},
        {role: 'minimize'},
        {
            accelerator: platform === 'darwin' ? 'Cmd+Q' : undefined,
            label: l('action.quit'),
            click: (_m, window) => {
                if (characters.length === 0)
                    return app.quit();

                if (!window)
                    return;

                const button = Electron.dialog.showMessageBoxSync(window, {
                    message: l('chat.confirmLeave'),
                    buttons: [l('confirmYes'), l('confirmNo')],
                    cancelId: 1
                });
                if (button === 0) {
                    PrimaryWindow?.webContents.send('quit');
                    app.quit();
                }
            }
        }
    ]));


    //#region SecureStore
    Electron.ipcMain.handle('setPassword', async (_e, domain: string, account: string, password: string) => {
        await SecureStore.setPassword(domain, account, password);
    });

    Electron.ipcMain.handle('deletePassword', async (_e, domain: string, account: string) => {
        await SecureStore.deletePassword(domain, account);
    });

    Electron.ipcMain.handle('getPassword', async (_e, domain: string, account: string) => {
        return await SecureStore.getPassword(domain, account);
    });
    //#endregion

    Electron.ipcMain.handle('app-getPath', async (_e, appPath: string) => {
        await null;
        // Ideally argument is `Parameters<typeof app.getPath>[0]`
        try { // ex: 'userData'
            //if ([ "home", "appData", "userData", "sessionData", "temp", "exe", "module", "desktop", "documents", "downloads", "music", "pictures", "videos", "recent", "logs", "crashDumps" ].includes(path))
            if (typeof appPath === 'string') {
                switch (appPath) {
                //case 'temp':
                case 'appData':
                case 'sessionData':
                //case 'logs':
                case 'userData':
                    return app.getPath(appPath);
                }
            }
        }
        catch {}

        return undefined;
    });


    Electron.ipcMain.on('tab-added', (_e, id: number) => {
        const webContents = Electron.webContents.fromId(id);
        if (!webContents) {
            log.error('main.tab-added.error', 'Failed to have id when tab added, but still triggered tab-added. This is a weird error!');
            return;
        }

        setUpWebContents(webContents);

        ++tabCount;
        if (tabCount === 3)
            PrimaryWindow?.webContents.send('allow-new-tabs', false);
    });
    Electron.ipcMain.on('tab-closed', () => {
        PrimaryWindow?.webContents.send('allow-new-tabs', true);

        --tabCount;
        if (!tabCount)
            PrimaryWindow?.webContents.send('open-tab');
    });

    // Character connection handlers
    Electron.ipcMain.on('connect', (e, character: string) => { //hack
        if (characters.includes(character)) { // Logged in already!
            log.debug('ipcMain.connect.alreadyLoggedIn');
            e.preventDefault();
            e.returnValue = false;
            return false;
        }
        else {
            log.debug('ipcMain.connect.notLoggedIn');
            characters.push(character);

            Electron.webContents.getAllWebContents()
                .forEach(w => w.send('connect', e.sender.id, character));

            e.returnValue = true;
            return true;
        }

    });

    Electron.ipcMain.on('disconnect', (e, character: string) => {
        const index = characters.indexOf(character);
        if (index !== -1) {
            characters.splice(index, 1);

            Electron.webContents.getAllWebContents()
                .forEach(w => w.send('disconnect', e.sender.id));
        }
    });


    // Tray handlers
    Electron.ipcMain.on('connect', (e, character: string) => {
            tabMap.set(character, e.sender);
            tray?.setContextMenu(Electron.Menu.buildFromTemplate(createTrayMenu()));
    });

    Electron.ipcMain.on('disconnect', (_e, character: string) => {
        tabMap.delete(character);
        tray?.setContextMenu(Electron.Menu.buildFromTemplate(createTrayMenu()));
    });


    Electron.ipcMain.on('update-avatar-url', (_e, n: string, u: string) =>
        PrimaryWindow?.webContents.send('update-avatar-url', n, u)
    );

    Electron.ipcMain.on('dictionary-add', (_e, word: string) => {
        if (settings.raw.customDictionary.includes(word))
            return;

        // settings.set('customDictionary', [ ...settings.raw.customDictionary, word ]);
        PrimaryWindow?.webContents.session.addWordToSpellCheckerDictionary(word);
    });
    Electron.ipcMain.on('dictionary-remove', (_e, _word: string) => {
        // const i = settings.raw.customDictionary.indexOf(word);
        // if (i === -1)
        //     return;

        // settings.set('customDictionary', settings.raw.customDictionary.splice(i, 1));
    });


    const adCoordinator = new AdCoordinatorHost();
    Electron.ipcMain.on('request-send-ad', (e, adId: string) => adCoordinator.processAdRequest(e, adId));

    // region Badge
    const emptyBadge = Electron.nativeImage.createEmpty();

    // Badge windows with alerts
    function badgeWindow(e: Electron.IpcMainEvent, hasNew: boolean) {
        if (platform === 'darwin') {
            app.dock?.setBadge(hasNew ? '!' : '');
        }
        else {
            const window = Electron.BrowserWindow.fromWebContents(e.sender);

            if (hasNew) {
                window?.setIcon(icon.mainBadge);
                window?.setOverlayIcon(emptyBadge, 'New messages');
                tray?.setImage(icon.trayBadge);
            }
            else {
                window?.setIcon(icon.main);
                window?.setOverlayIcon(emptyBadge, '');
                tray?.setImage(icon.tray);
            }
        }
    }
    Electron.ipcMain.on('has-new', badgeWindow);
    // Propogation is not intended to reach main.
    Electron.ipcMain.on('has-new-propogate', (e, hasNew: boolean) => {
        Electron.webContents.getAllWebContents()
            .forEach(w => w.send('has-new', e.sender.id, hasNew));
    });

    Electron.ipcMain.on('rising-upgrade-complete', () => {
        upgradeRoutineShouldRun = false;
        for (const w of Electron.webContents.getAllWebContents())
            w.send('rising-upgrade-complete');
    });

    Electron.ipcMain.on('update-zoom', (_e, zl: number) => {
        for (const w of Electron.webContents.getAllWebContents())
            w.send('update-zoom', zl);
    });

    Electron.ipcMain.handle('browser-option-browse', async () => {
        logBrowser.debug('settings.browser.browse');
        console.log('settings.browser.browse', JSON.stringify(settings));

        let filters;
        if (platform === "win32") {
            filters = [{ name: 'Executables', extensions: ['exe'] }];
        }
        else if (platform === "darwin") {
            filters = [{ name: 'Executables', extensions: ['app'] }];
        }
        else { // unix and whatever else
            filters = [{ name: 'Executables', extensions: ['*'] }];
        }

        const dir = Electron.dialog.showOpenDialogSync({
            defaultPath: settings.raw.browserPath,
            properties: ['openFile'],
            filters: filters,
        });

        return dir?.[0] ?? '';
    });

    Electron.ipcMain.on('open-url-externally', (_e, url: string, incognito: boolean = false) => {
        openURLExternally(url, incognito);
    });

    PrimaryWindow = createWindow();
}

// Twitter fix
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

app.on('window-all-closed', () => app.quit());
