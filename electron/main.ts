/**
 * @license
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
 * @file The entry point for the Electron main thread of F-Chat 3.0.
 * @copyright 2018 F-List
 * @author Maya Wolf <maya@f-list.net>
 * @version 3.0
 * @see {@link https://github.com/f-list/exported|GitHub repo}
 */
import * as fs from 'fs';
import * as path from 'path';
import process from 'node:process';
const platform = process.platform;

import * as electron from 'electron';
const app = electron.app; // Module to control application life.

// `InitLogger` runs the electron-log init, so has to run before any use of the logger.
import InitLogger from './logger';
InitLogger(app.getPath('logs'));

import Logger from 'electron-log/main';
const log = Logger.scope('main');

import { LevelOption as LogLevelOption, levels as logLevels } from 'electron-log';

import * as remoteMain from '@electron/remote/main';
remoteMain.initialize();

import { exec } from 'child_process';
import { FindExeFileFromName } from '../helpers/utils';

import l from '../chat/localize';
import {GeneralSettings} from './common';
import { getSafeLanguages, knownLanguageNames, updateSupportedLanguages } from './language';
import * as windowState from './window_state';
import SecureStore from './secure-store';
import { AdCoordinatorHost } from '../chat/ads/ad-coordinator-host';
import { BlockerIntegration } from './blocker/blocker';
import * as FROLIC from '../constants/frolic';
import { IncognitoArgFromBrowserPath } from '../constants/general';
import checkForGitRelease from './updater';
import versionUpgradeRoutines from './version-upgrade';

import InitIcon from './icon';
const icon: string = InitIcon(platform);


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
const windows: electron.BrowserWindow[] = [];
const characters: string[] = [];
let tabCount = 0;

const baseDir = app.getPath('userData');
fs.mkdirSync(baseDir, {recursive: true});
let shouldImportSettings = false;

const settingsDir = path.join(baseDir, 'data');
fs.mkdirSync(settingsDir, {recursive: true});
const settingsFile = path.join(settingsDir, 'settings');
const settings = new GeneralSettings();

if (!fs.existsSync(settingsFile)) {
    shouldImportSettings = true;
}
else {
    try {
        Object.assign(settings, <GeneralSettings>JSON.parse(fs.readFileSync(settingsFile, 'utf8')));
    }
    catch (e) {
        log.error(`Error loading settings: ${e}`);
    }
}

if (!settings.hwAcceleration) {
    log.info('Disabling hardware acceleration.');
    app.disableHardwareAcceleration();
}

// async function setDictionary(lang: string | undefined): Promise<void> {
//     if(lang !== undefined) await ensureDictionary(lang);
//     settings.spellcheckLang = lang;
//     setGeneralSettings(settings);
// }


export function updateSpellCheckerLanguages(langs: string[]): void {
    electron.session.defaultSession.setSpellCheckerLanguages(langs);

    for (const w of windows) {
        w.webContents.session.setSpellCheckerLanguages(langs);
        w.webContents.send('update-dictionaries', langs);
    }
}


async function toggleDictionary(lang: string): Promise<void> {
    const activeLangs = getSafeLanguages(settings.spellcheckLang);

    let newLangs: string[] = [];
    if (activeLangs.includes(lang)) {
        newLangs = activeLangs.filter(al => al !== lang);
    }
    else {
        activeLangs.push(lang);
        newLangs = activeLangs;
    }

    settings.spellcheckLang = Array.from(new Set(newLangs));

    setGeneralSettings(settings);

    updateSpellCheckerLanguages(newLangs);
}

function setGeneralSettings(value: GeneralSettings): void {
    fs.writeFileSync(settingsFile, JSON.stringify(value));

    for (const w of electron.webContents.getAllWebContents()) w.send('settings', settings);

    shouldImportSettings = false;

    const logLevel: LogLevelOption = 'warn';
    Logger.transports.file.level    = settings.risingSystemLogLevel || logLevel;
    Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;
}

async function addSpellcheckerItems(menu: electron.Menu): Promise<void> {
    const selected = getSafeLanguages(settings.spellcheckLang);
    const langs = electron.session.defaultSession.availableSpellCheckerLanguages;

    const sortedLangs = langs
        .map(lang => ({
            lang, name: (lang in knownLanguageNames)
                ? `${(knownLanguageNames as {[key: string]: string})[lang]} (${lang})`
                : lang
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const lang of sortedLangs) {
        menu.append(new electron.MenuItem(
            {
                type: 'checkbox',
                label: lang.name,
                checked: (selected.indexOf(lang.lang) >= 0),
                click: async() => toggleDictionary(lang.lang)
            }
        ));
    }
}

/**
 * Opens a link; optionally in incognito mode. Incognito is only available if
 * a browser is set in the "Custom browser" settings.
 *
 * This function handles both standard links that pass through {@link openLinkExternally}
 * and links from the "Open in Incognito mode" right-click menu option.
 *
 * Normally, we can fall back to {@link electron.shell.openExternal} when
 * there's no custom browser. However, when incognito mode is requested, abort
 * if we aren't able to honor the player's privacy so we don't add anything
 * spicy to the player's browser history.
 *
 * @param url Url of the page to open; no internal validation is performed.
 * @param incognito True to use incognito mode (and error if we can't).
 */
function openURLExternally(url: string, incognito: boolean = false): void {
    if (!settings.browserPath) {
        if (!incognito) {
            // Zero config: Open in system default browser
            electron.shell.openExternal(url);
            return;
        }
        else {
            // TODO: Robust error handler.
            electron.dialog.showMessageBox({
                title: 'Frolic - Browser Failure',
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
            fs.accessSync(settings.browserPath, fs.constants.X_OK);
        }
        catch {
            const stdout = FindExeFileFromName(settings.browserPath);

            log.info(`Unexpected custom browser, but found "${stdout}" - Attemping to use it.`);

            fs.accessSync(stdout, fs.constants.X_OK);
            settings.browserPath = stdout;
            setGeneralSettings(settings);
        }
    }
    catch {
        // TODO: Robust error handler.
        electron.dialog.showMessageBox({
            title: 'Frolic - Browser Failure',
            message: l('chat.brokenBrowser'),
            type: 'warning',
            buttons: [],
        });

        return;
    }

    if (incognito && !settings.browserIncognitoArg) {
        // Check against fixed list of known incognito flags
        const incognitoArg = IncognitoArgFromBrowserPath(settings.browserPath);

        if (incognitoArg) {
            settings.browserIncognitoArg = incognitoArg;
            setGeneralSettings(settings);
        }
        else {
            // TODO: Robust error handler.
            electron.dialog.showMessageBox({
                title: 'Frolic - Browser Failure',
                message: l('chat.noBrowser'),
                type: 'warning',
                buttons: [],
            });

            return;
        }
    }

    if (!settings.browserArgs) {
        settings.browserArgs = '%s';
        setGeneralSettings(settings);
    }
    else if (!settings.browserArgs.includes('%s')) {
        settings.browserArgs += ' %s';
        setGeneralSettings(settings);
    }

    // Ensure url is encoded, but not twice.
    // `%25` is the encoded `%` symbol.
    url = encodeURI(url);
    url = url.replace(/%25([0-9a-f]{2})/ig, '%$1');

    // Quote URL to prevent issues with spaces and special characters
    const args = (incognito ? settings.browserIncognitoArg + ' ': '') + settings.browserArgs.replaceAll('%s', `"${url}"`);

    log.silly(`Opening: ${args} with ${settings.browserPath}`);

    // MacOS bug: If app browser is Safari and OS browser is not, both will open.
    // https://developer.apple.com/forums/thread/685385
    if (platform === "darwin")
        exec(`open -a "${settings.browserPath}" ${args}`);
    else
        exec(`"${settings.browserPath}" ${args}`);
}

function setUpWebContents(webContents: electron.WebContents): void {
    remoteMain.enable(webContents);

    const openLinkExternally = (url: string) => {
        const profileMatch = url.match(/^https?:\/\/(www\.)?f-list\.net\/c\/([^/#]+)\/?#?/);

        if (profileMatch !== null && settings.profileViewer) {
            webContents.send('open-profile', decodeURIComponent(profileMatch[2]));
            return;
        }
        else {
            openURLExternally(url);
        }

    };

    webContents.setVisualZoomLevelLimits(1, 5);

    webContents.on('will-navigate', (e: Electron.Event, url: string) => {
        e.preventDefault();
        openLinkExternally(url);
    });

    webContents.setWindowOpenHandler(({ url }) => {
        openLinkExternally(url);
        return { action: 'deny' };
    });
}


const windowStatePath = path.join(settingsDir, 'window.json');

function createWindow(): electron.BrowserWindow | undefined {
    if (tabCount >= 3) return;

    const lastState = windowState.getSavedWindowState(windowStatePath);

    const windowProperties: electron.BrowserWindowConstructorOptions & {maximized: boolean} = {
        ...lastState,
        center: lastState.x === undefined,
        show: false,
        icon: icon,
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

    const window = new electron.BrowserWindow(windowProperties);

    remoteMain.enable(window.webContents);

    windows.push(window);

    window.webContents.on('will-attach-webview', () => {
            const all = electron.webContents.getAllWebContents();
            all.forEach(item => remoteMain.enable(item));
    });

    updateSupportedLanguages(electron.session.defaultSession.availableSpellCheckerLanguages);

    const safeLanguages = getSafeLanguages(settings.spellcheckLang);

    // console.log('CREATEWINDOW', safeLanguages);
    electron.session.defaultSession.setSpellCheckerLanguages(safeLanguages);
    window.webContents.session.setSpellCheckerLanguages(safeLanguages);

    // Set up ad blocker
    BlockerIntegration.factory(baseDir);

    // This prevents automatic download prompts on certain webview URLs without
    // stopping conversation logs from being downloaded
    electron.session.defaultSession.on('will-download',
        (e: Electron.Event, item: electron.DownloadItem) => {
            if (!item.getURL().match(/^blob:file:/)) {
                log.info('download.prevent', { item, event: e });
                e.preventDefault();
            }
        }
    );

    // tslint:disable-next-line:no-floating-promises
    window.loadFile(
        path.join(__dirname, 'window.html'),
        {
            query: { settings: JSON.stringify(settings), import: shouldImportSettings ? 'true' : '' }
        }
    );

    setUpWebContents(window.webContents);

    // Save window state when it is being closed.
    window.on('close', () => windowState.setSavedWindowState(window, windowStatePath));
    window.on('closed', () => windows.splice(windows.indexOf(window), 1));
    window.once('ready-to-show', () => {
        window.show();
        if (lastState.maximized) window.maximize();
    });

    return window;
}

function showPatchNotes(): void {
    //tslint:disable-next-line: no-floating-promises
    openURLExternally(FROLIC.ChangelogUrl);
}

function openBrowserSettings(): electron.BrowserWindow | undefined {
    let desiredHeight = 664
    if (platform === 'darwin') {
        desiredHeight = 664;
    }

    const windowProperties: electron.BrowserWindowConstructorOptions = {
        center: true,
        show: false,
        icon: icon,
        frame: false,
        width: 650,
        height: desiredHeight,
        minWidth: 650,
        minHeight: desiredHeight,
        maximizable: true,
        webPreferences: {
            webviewTag: true,
            nodeIntegration: true,
            nodeIntegrationInWorker: true,
            spellcheck: true,
            contextIsolation: false,
            partition: 'persist:fchat',
        }
    };

    const browserWindow = new electron.BrowserWindow(windowProperties);
    remoteMain.enable(browserWindow.webContents);
    browserWindow.loadFile(
        path.join(__dirname, 'browser_option.html'),
        { query: {
            settings: JSON.stringify(settings)
        }},
    );

    browserWindow.once('ready-to-show', () => {
        browserWindow.show();
    });

    return browserWindow;
}


let zoomLevel = 0;

function onReady(): void {
    let hasCompletedUpgrades = false;

    const logLevel: LogLevelOption = 'warn';
    Logger.transports.file.level    = settings.risingSystemLogLevel || logLevel;
    Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;

    Logger.transports.file.maxSize = 5 * 1024 * 1024;

    log.info('Starting application.');

    app.setAppUserModelId('com.squirrel.fchat.Frolic');
    app.on('open-file', createWindow);

    const targetVersion = app.getVersion();
    if (settings.version !== targetVersion) {
        // Run all routines necessary to upgrade the general settings.
        versionUpgradeRoutines(settings.version, targetVersion);

        settings.version = targetVersion;
        setGeneralSettings(settings);
    }

    function updateAllZoom(c: Electron.WebContents[] = [], b: electron.BrowserWindow[] = [], zoomLevel: number) {
        c.forEach(w => w.send('update-zoom', zoomLevel))

        b.forEach(w => w.webContents.send('update-zoom', zoomLevel))
    }

    const updateMenuItem = {
        label: l('action.updateAvailable'),
        id: 'update',
        visible: false,
        click: () => openURLExternally(FROLIC.GitHubReleasesUrl),
    }

    const viewItem = {
        label: `&${ l('action.view') }`,
        submenu: <electron.MenuItemConstructorOptions[]>[
            // {role: 'resetZoom'},
            {
                label: l('action.resetZoom'),
                click: () => {
                    zoomLevel = 0;
                    updateAllZoom(electron.webContents.getAllWebContents(), windows, zoomLevel);
                },
                accelerator: 'CmdOrCtrl+0'
            },
            {
                // role: 'zoomIn',
                label: l('action.zoomIn'),
                click: (_m, w) => {
                    if (!w)
                        return

                    zoomLevel = Math.min(zoomLevel + w.webContents.getZoomFactor()/2, 6);
                    updateAllZoom(electron.webContents.getAllWebContents(), windows, zoomLevel);
                },
                accelerator: 'CmdOrCtrl+='
            },
            {
                // role: 'zoomOut',
                label: l('action.zoomOut'),
                click: (_m, w) => {
                    if (!w)
                        return

                    zoomLevel = Math.max(-5, zoomLevel - w.webContents.getZoomFactor()/2);
                    updateAllZoom(electron.webContents.getAllWebContents(), windows, zoomLevel);
                },
                accelerator: 'CmdOrCtrl+-'
            },
            {type: 'separator'},
            {role: 'togglefullscreen'}
        ]
    };
    if (process.env.NODE_ENV !== 'production')
        viewItem.submenu.unshift({role: 'reload'}, {role: 'forceReload'}, {role: 'toggleDevTools'}, {type: 'separator'});
    const spellcheckerMenu = new electron.Menu();

    //tslint:disable-next-line:no-floating-promises
    addSpellcheckerItems(spellcheckerMenu);

    const themes = fs.readdirSync(path.join(__dirname, 'themes'))
            .filter(x => x.slice(-4) === '.css')
            .map(x => x.slice(0, -4));

    const setTheme = (theme: string) => {
        settings.theme = theme;
        setGeneralSettings(settings);
    };

    const setSystemLogLevel = (logLevel: LogLevelOption) => {
        settings.risingSystemLogLevel = logLevel;
        setGeneralSettings(settings);
    };

    electron.Menu.setApplicationMenu(electron.Menu.buildFromTemplate([
        updateMenuItem,
        {
            label: `&${l('title')}`,
            submenu: [
                {
                    label: l('action.newWindow'),
                    click: () => { if (hasCompletedUpgrades) createWindow() },
                    accelerator: 'CmdOrCtrl+n'
                },
                {
                    label: l('action.newTab'),
                    click: (_m, w) => {
                        if (hasCompletedUpgrades && tabCount < 3) w?.webContents.send('open-tab');
                    },
                    accelerator: 'CmdOrCtrl+t'
                },
                {
                    label: "hidden switch-tab accelerator",
                    accelerator: 'Ctrl+Tab',
                    click: (_m, w) => w?.webContents.send('switch-tab'),
                    visible: false,
                },
                {
                    label: "hidden previous-tab accelerator",
                    accelerator: 'Ctrl+Shift+Tab',
                    click: (_m, w) => w?.webContents.send('previous-tab'),
                    visible: false,
                },
                {
                    label: l('settings.logDir'),
                    click: (_m, window) => {
                        if (!window)
                            return;

                        const dir = electron.dialog.showOpenDialogSync(
                            {defaultPath: settings.logDirectory, properties: ['openDirectory']}
                        );

                        if (dir) {
                            if (dir[0].startsWith(path.dirname(app.getPath('exe'))))
                                return electron.dialog.showErrorBox(l('settings.logDir'), l('settings.logDir.inAppDir'));

                            const button = electron.dialog.showMessageBoxSync(window, {
                                message: l('settings.logDir.confirm', dir[0], settings.logDirectory),
                                buttons: [l('confirmYes'), l('confirmNo')],
                                cancelId: 1
                            });
                            if (button === 0) {
                                for(const w of windows) w.webContents.send('quit');

                                settings.logDirectory = dir[0];
                                setGeneralSettings(settings);

                                app.quit();
                            }
                        }
                    }
                },
                {
                    label: l('settings.closeToTray'),
                    type: 'checkbox',
                    checked: settings.closeToTray,
                    click: m => {
                        settings.closeToTray = m.checked;
                        setGeneralSettings(settings);
                    }
                },
                {
                    label: l('settings.profileViewer'),
                    type: 'checkbox',
                    checked: settings.profileViewer,
                    click: m => {
                        settings.profileViewer = m.checked;
                        setGeneralSettings(settings);
                    }
                },
                {
                    label: l('settings.spellcheck'),
                    submenu: spellcheckerMenu,
                },
                {
                    label: l('settings.theme'),
                    submenu: themes.map((x) => ({
                        checked: settings.theme === x,
                        click: () => setTheme(x),
                        label: x,
                        type: <'radio'>'radio'
                    }))
                },
                {
                    label: l('settings.hwAcceleration'),
                    type: 'checkbox',
                    checked: settings.hwAcceleration,
                    click: m => {
                        settings.hwAcceleration = m.checked;
                        setGeneralSettings(settings);
                    }
                },
                // {
                //     label: l('settings.beta'), type: 'checkbox', checked: settings.beta,
                //     click: async(item: electron.MenuItem) => {
                //         settings.beta = item.checked;
                //         setGeneralSettings(settings);
                //         // electron.autoUpdater.setFeedURL({url: updaterUrl+(item.checked ? '?channel=beta' : ''), serverType: 'json'});
                //         // return electron.autoUpdater.checkForUpdates();
                //     }
                // },
                {
                    label: l('fixLogs.action'),
                    click: (_m, w) => w?.webContents.send('fix-logs'),
                },
                { type: 'separator' },
                {
                    label: l('action.logLevel'),
                    submenu: logLevels.map(level => ({
                        checked: settings.risingSystemLogLevel === level,
                        label: `${level.substring(0, 1).toUpperCase()}${level.substring(1)}`,
                        click: () => setSystemLogLevel(level as LogLevelOption),
                        type: <'radio'>'radio'
                    })),
                },
                {
                    visible: platform === 'win32',
                    label: l('action.toggleHighContrast'),
                    type: 'checkbox',
                    checked: settings.risingDisableWindowsHighContrast,
                    click: m => {
                        settings.risingDisableWindowsHighContrast = m.checked;
                        setGeneralSettings(settings);
                    }
                },
                {
                    label: l('settings.browser'),
                    click: () => openBrowserSettings(),
                },
                {
                    label: l('action.profile'),
                    click: (_m, w) => w?.webContents.send('reopen-profile'),
                    accelerator: 'CmdOrCtrl+p'
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

                        const button = electron.dialog.showMessageBoxSync(window, {
                            message: l('chat.confirmLeave'),
                            buttons: [l('confirmYes'), l('confirmNo')],
                            cancelId: 1
                        });
                        if (button === 0) {
                            for (const w of windows) w.webContents.send('quit');
                            app.quit();
                        }
                    }
                }
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
                {
                    label: l('help.fchat'),
                    click: () => openURLExternally('https://github.com/Frolic-chat/Frolic/blob/master/README.md')
                },
                // {
                //     label: l('help.feedback'),
                //     click: () => openURLExternally('')
                // },
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
        }
    ]));

    //region Updater
    const updateCheckTimer = setInterval(
        async () => {
            const hasUpdate = await checkForGitRelease(app.getVersion(), FROLIC.GithubReleaseApiUrl, settings.beta);

            if (hasUpdate) {
                clearInterval(updateCheckTimer);

                const menu = electron.Menu.getApplicationMenu()!;
                const item = menu.getMenuItemById(updateMenuItem.id);
                if (item) item.visible = true;

                for (const w of windows) w.webContents.send('update-available', true);
            }
        },
        FROLIC.UpdateCheckInterval
    );

    setTimeout(
        async () => {
            const hasUpdate = await checkForGitRelease(app.getVersion(), FROLIC.GithubReleaseApiUrl, settings.beta);

            if (hasUpdate) {
                clearInterval(updateCheckTimer);

                const menu = electron.Menu.getApplicationMenu()!;
                const item = menu.getMenuItemById(updateMenuItem.id);
                if (item) item.visible = true;

                for (const w of windows) w.webContents.send('update-available', true);
            }
        },
        6000 // 6 seconds
    );


    //#region SecureStore
    electron.ipcMain.handle('setPassword', async (_event: Electron.IpcMainInvokeEvent, domain: string, account: string, password: string) => {
        await SecureStore.setPassword(domain, account, password);
    });

    electron.ipcMain.handle('deletePassword', async (_event: Electron.IpcMainInvokeEvent, domain: string, account: string) => {
        await SecureStore.deletePassword(domain, account);
    });

    electron.ipcMain.handle('getPassword', async (_event: Electron.IpcMainInvokeEvent, domain: string, account: string) => {
        return await SecureStore.getPassword(domain, account);
    });
    //#endregion


    electron.ipcMain.on('tab-added', (_e, id: number) => {
        const webContents = electron.webContents.fromId(id);
        if (!webContents) {
            log.error('main.tab-added.error', 'Failed to have id when tab added, but still triggered tab-added. This is a weird error!');
            return;
        }

        setUpWebContents(webContents);
        ++tabCount;
        if(tabCount === 3)
            for(const w of windows) w.webContents.send('allow-new-tabs', false);
    });
    electron.ipcMain.on('tab-closed', () => {
        --tabCount;
        for(const w of windows) w.webContents.send('allow-new-tabs', true);
    });
    electron.ipcMain.on('save-login', (_event: Electron.IpcMainEvent, account: string, host: string) => {
        settings.account = account;
        settings.host = host;
        setGeneralSettings(settings);
    });
    electron.ipcMain.on('connect', (e, character: string) => { //hack
        if (characters.includes(character)) { // Logged in already!
            log.debug('ipcMain.connect.alreadyLoggedIn');
            e.preventDefault();
            e.returnValue = false;
            return false;
        }
        else {
            log.debug('ipcMain.connect.notLoggedIn');
            characters.push(character);
            e.returnValue = true;
            return true;
        }

    });
    electron.ipcMain.on('dictionary-add', (_e, word: string) => {
        // if(settings.customDictionary.indexOf(word) !== -1) return;
        // settings.customDictionary.push(word);
        // setGeneralSettings(settings);
        for (const w of windows) w.webContents.session.addWordToSpellCheckerDictionary(word);
    });
    electron.ipcMain.on('dictionary-remove', (_e/*, word: string*/) => {
        // settings.customDictionary.splice(settings.customDictionary.indexOf(word), 1);
        // setGeneralSettings(settings);
    });
    electron.ipcMain.on('disconnect', (_e, character: string) => {
        const index = characters.indexOf(character);
        if (index !== -1) characters.splice(index, 1);
    });


    const adCoordinator = new AdCoordinatorHost();
    electron.ipcMain.on('request-send-ad', (e, adId: string) => adCoordinator.processAdRequest(e, adId));

    const emptyBadge = electron.nativeImage.createEmpty();
    const badge = electron.nativeImage.createFromPath(
        path.join(__dirname, <string>require('./build/badge.png').default)
    );

    // Badge windows with alerts
    function badgeWindow(e: Electron.IpcMainEvent, hasNew: boolean) {
        if (platform === 'darwin')
            app.dock.setBadge(hasNew ? '!' : '');

        const window = electron.BrowserWindow.fromWebContents(e.sender);

        if (window)
            window.setOverlayIcon(hasNew ? badge : emptyBadge, hasNew ? 'New messages' : '');
    }
    electron.ipcMain.on('has-new', badgeWindow);

    electron.ipcMain.on('rising-upgrade-complete', () => {
        // console.log('RISING COMPLETE SHARE');
        hasCompletedUpgrades = true;
        for (const w of electron.webContents.getAllWebContents())
            w.send('rising-upgrade-complete');
    });

    electron.ipcMain.on('update-zoom', (_e, zl: number) => {
        // log.info('MENU ZOOM UPDATE', zoomLevel);
        for (const w of electron.webContents.getAllWebContents())
            w.send('update-zoom', zl);
    });

    electron.ipcMain.handle('browser-option-browse', async () => {
        log.debug('settings.browser.browse');
        console.log('settings.browser.browse', JSON.stringify(settings));

        let filters;
        if (platform === "win32") {
            filters = [{ name: 'Executables', extensions: ['exe'] }];
        }
        else if (platform === "darwin") {
            filters = [{ name: 'Executables', extensions: ['app'] }];
        }
        else {
            // linux and anything else that might be supported
            // no specific extension for executables
            filters = [{ name: 'Executables', extensions: ['*'] }];
        }

        const dir = electron.dialog.showOpenDialogSync(
            {
                defaultPath: settings.browserPath,
                properties: ['openFile'],
                filters: filters
            }
        );

        if (dir)
            return dir[0];

        return '';
    });

    function updateBrowserOption(_e: Electron.IpcMainEvent,
                                 path: string,
                                 args: string,
                                 incognito: string) {
        log.debug('Browser Path settings update:', path, args, incognito);

        settings.browserPath = path;
        settings.browserArgs = args;
        settings.browserIncognitoArg = incognito;
        setGeneralSettings(settings);
    }

    electron.ipcMain.on('browser-option-update', updateBrowserOption);

    electron.ipcMain.on('open-url-externally', (_e: Electron.IpcMainEvent, url: string, incognito: boolean = false) => {
        openURLExternally(url, incognito);
    });

    createWindow();
}

// Twitter fix
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');


const isSquirrelStart = require('electron-squirrel-startup'); //tslint:disable-line:no-require-imports
if (isSquirrelStart || process.env.NODE_ENV === 'production' && !app.requestSingleInstanceLock())
    app.quit();
else
    app.on('ready', onReady);

app.on('second-instance', createWindow);
app.on('window-all-closed', () => app.quit());
