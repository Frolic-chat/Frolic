// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * @license
 * This file is part of Frolic!
 * Copyright (C) 2025 Frolic Contributors listed in `COPYING.md`
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
 * Copyright (c) 2018 F-List, 2019 F-Chat Rising Contributors listed in `COPYING.md`
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
 * @file The entry point for the Electron renderer of Frolic.
 * @copyright 2018 F-List, 2019 F-Chat Rising Contributors, 2025 Frolic Contributors
 * @author Maya Wolf <maya@f-list.net>, F-Chat Rising Contributors, Frolic Contributors
 * @version 0.8.2
 * @see {@link https://github.com/frolic-chat/frolic|GitHub repo}
 */

import * as electron from 'electron';

import * as remote from '@electron/remote';
const webContents = remote.getCurrentWebContents();

// tslint:disable-next-line:no-require-imports no-submodule-imports
require('@electron/remote/main').enable(webContents);

//import Axios from 'axios';
import { exec } from 'child_process';
import * as path from 'path';
import * as qs from 'querystring';
import {getKey} from '../chat/common';
import { EventBus } from '../chat/preview/event-bus';
import { default as core, init as initCore} from '../chat/core';
import l from '../chat/localize';
import Socket from '../chat/WebSocket';
import Connection from '../fchat/connection';
import {Keys} from '../keys';
import {GeneralSettings /*, nativeRequire*/ } from './common';
import {Logs, SettingsStore} from './renderer/filesystem';
import Notifications from './notifications';
import * as SlimcatImporter from './renderer/importer';

// This is a noble attempt but none of the components show unless I tag directly into the html.
// import { connect as vueDevToolsInit } from '@vue/devtools';
// if (process.env.NODE_ENV === 'development') vueDevToolsInit('http://localhost', '8098');

import Index from './Index.vue';

import Logger from 'electron-log';
import NewLogger from '../helpers/log';
const log = NewLogger('chat');
const logC = NewLogger('core');

import { LevelOption as LogLevelOption } from 'electron-log';

import { WordPosSearch } from '../learn/dictionary/word-pos-search';

log.debug('init.chat');

document.addEventListener('keydown', (e: KeyboardEvent) => {
    if(e.ctrlKey && e.shiftKey && getKey(e) === Keys.KeyI)
        remote.getCurrentWebContents().toggleDevTools();
});

//Axios.defaults.params = {__fchat: `desktop/3.0.14`};

if(process.env.NODE_ENV === 'production') {
    remote.getCurrentWebContents().on('devtools-opened', () => {
        console.log(`%c${l('consoleWarning.head')}`, 'background: red; color: yellow; font-size: 30pt');
        console.log(`%c${l('consoleWarning.body')}`, 'font-size: 16pt; color:red');
    });
}

function openWebBrowser(url: string, incognito: boolean = false): void {
    electron.ipcRenderer.send('open-url-externally', url, incognito);
}

const wordPosSearch = new WordPosSearch();

webContents.on('context-menu', (_, props) => {
    const hasText = props.selectionText.trim().length > 0;
    const can = (type: string) => (<Electron.EditFlags & {[key: string]: boolean}>props.editFlags)[`can${type}`] && hasText;

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [];
    if(hasText || props.isEditable)
        menuTemplate.push({
            id: 'copy',
            label: l('action.copy'),
            role: can('Copy') ? 'copy' : undefined,
            accelerator: 'CmdOrCtrl+C',
            enabled: can('Copy')
        });
    if(props.isEditable)
        menuTemplate.push({
            id: 'cut',
            label: l('action.cut'),
            role: can('Cut') ? 'cut' : undefined,
            accelerator: 'CmdOrCtrl+X',
            enabled: can('Cut')
        }, {
            id: 'paste',
            label: l('action.paste'),
            role: props.editFlags.canPaste ? 'paste' : undefined,
            accelerator: 'CmdOrCtrl+V',
            enabled: props.editFlags.canPaste
        });
    else if (props.linkURL.length > 0
    &&       props.linkURL.substring(0, props.pageURL.length) !== props.pageURL
    &&       props.mediaType !== 'plugin' && props.mediaType !== 'canvas') {
        menuTemplate.push({
            id: 'open',
            label: l('action.browserOpen'),
            click: () => openWebBrowser(props.linkURL),
        }, {
            id: 'incognito',
            label: l('action.incognito'),
            click: () => openWebBrowser(props.linkURL, true),
        });
        menuTemplate.push({
            id: 'copyLink',
            label: l('action.copyLink'),
            click(): void {
                if(process.platform === 'darwin')
                    electron.clipboard.writeBookmark(props.linkText, props.linkURL);
                else
                    electron.clipboard.writeText(props.linkURL);
            }
        });
        menuTemplate.push({
            id: 'toggleStickyness',
            label: l('action.toggleStickyPreview'),
            click(): void {
                EventBus.$emit('imagepreview-toggle-sticky', { url: props.linkURL });
            }
        });
    } else if(hasText)
        menuTemplate.push({
            label: l('action.copyWithoutBBCode'),
            enabled: can('Copy'),
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => electron.clipboard.writeText(props.selectionText),
        });
    if(props.misspelledWord !== '') {
        const corrections = props.dictionarySuggestions; //spellchecker.getCorrectionsForMisspelling(props.misspelledWord);
        menuTemplate.unshift({
            label: l('spellchecker.add'),
            click: () => electron.ipcRenderer.send('dictionary-add', props.misspelledWord)
        }, {type: 'separator'});
        if(corrections.length > 0)
            menuTemplate.unshift(...corrections.map((correction: string) => ({
                label: correction,
                click: () => webContents.replaceMisspelling(correction)
            })));
        else menuTemplate.unshift({enabled: false, label: l('spellchecker.noCorrections')});
    } else if(settings.customDictionary.indexOf(props.selectionText) !== -1)
        menuTemplate.unshift({
            label: l('spellchecker.remove'),
            click: () => electron.ipcRenderer.send('dictionary-remove', props.selectionText)
        }, {type: 'separator'});


    const lookupWord = props.selectionText || wordPosSearch.getLastClickedWord();

    if (lookupWord) {
        menuTemplate.unshift(
          { type: 'separator' },
          {
            label: `Look up '${lookupWord}'`,
            click: async() => {
                EventBus.$emit('word-definition', { lookupWord, x: props.x, y: props.y });
            }
          }
        );
    }

    if(menuTemplate.length > 0) remote.Menu.buildFromTemplate(menuTemplate).popup({});

    log.debug('context.text', {
        linkText: props.linkText,
        link: props.linkURL,
        misspelledWord: props.misspelledWord,
        selectionText: props.selectionText,
        titleText: props.titleText
    });
});

let dictDir = path.join(remote.app.getPath('userData'), 'spellchecker');

if(process.platform === 'win32') //get the path in DOS (8-character) format as special characters cause problems otherwise
    exec(`for /d %I in ("${dictDir}") do @echo %~sI`, (_, stdout) => dictDir = stdout.trim());

// electron.webFrame.setSpellCheckProvider(
// '', {spellCheck: (words, callback) => callback(words.filter((x) => spellchecker.isMisspelled(x)))});

function onSettings(s: GeneralSettings): void {
    const logLevel: LogLevelOption = 'warn'
    Logger.transports.console.level = s.risingSystemLogLevel || logLevel;

    // spellchecker.setDictionary(s.spellcheckLang, dictDir);
    // for(const word of s.customDictionary) spellchecker.add(word);
}

EventBus.$on('settings-from-main', onSettings);

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
let settings = JSON.parse(params['settings']!) as GeneralSettings;

// console.log('SETTINGS', settings);

if (params['import'] !== undefined) {
    try {
        if(SlimcatImporter.canImportGeneral() && confirm(l('importer.importGeneral'))) {
            SlimcatImporter.importGeneral(settings);
            electron.ipcRenderer.send('save-login', settings.account, settings.host);
        }
    } catch {
        alert(l('importer.error'));
    }
}
onSettings(settings);


log.debug('init.chat.core');

const connection = new Connection(`F-Chat 3.0 (Web)`, '3.0.16', Socket);
initCore(connection, settings, Logs, SettingsStore, Notifications);

window.addEventListener('keydown', handleEscape, { capture: true }); // run before bubbling listeners

function isInput(e: any): e is HTMLInputElement | HTMLTextAreaElement {
    return e && (e instanceof HTMLTextAreaElement
             || (e instanceof HTMLInputElement && ['text', 'search', 'email', 'tel', 'url'].includes(e.type))
    )
}

/**
 * Perform the 3 escaping activities:
 * 1. Unfocus a focused element (except primary focus)
 * 2. Close a modal
 * 3. Give focus to primary input element.
 * We can ignore 3 if there's still 2 to do.
 * @param e
 * @returns
 */
function handleEscape(e: KeyboardEvent) {
    if (e.key !== 'Escape')
        return;

    const active = document.activeElement as HTMLElement | null;

    // 1
    if (isInput(active) && active !== core.runtime.primaryInput) {
        logC.debug(`Blurring: ${active.className}`);
        active.blur();

        // Allow propogation to normal pick ups (primary input focus)
        if (core.runtime.dialogStack.length > 0)
            e.stopPropagation();

        return;
    }

    // 2
    if (core.runtime.dialogStack.length > 0) {
        logC.debug(`Hiding dialog: ${core.runtime.dialogStack[0].action}`);
        core.runtime.dialogStack[core.runtime.dialogStack.length - 1].hideWithCheck();
        e.stopPropagation();
        return;
    }

    // 3
    if (core.runtime.primaryInput) {
        logC.debug(`Primary input found: ${core.runtime.primaryInput.className}`);
        core.runtime.primaryInput.focus();
        // Allow fall-through - useful for scrolling the active window.
        // e.stopPropagation();
    }
}

log.debug('init.chat.vue');
new Index({
    el: '#app',
    data: {
        // Useless to pass settings through, they're initiated into the core right above!
        settings,
        hasCompletedUpgrades: JSON.parse(params['hasCompletedUpgrades']!)
    }
});

log.debug('init.chat.vue.done');
