// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Exclusively exports an init() factory function that gives you a ScratchpadExport.
 * We don't actually use or care about the object in main; this is entirely a renderer<->file controller :)
 */
import * as Electron from 'electron';
import * as fs from 'fs';

import NewLogger from './custom-logger';
const l_s = process.argv.includes('--debug-scratchpad');
const log = NewLogger('scratchpad', () => l_s);

let scratchpad = '';
let saveFile: string = '';
let timestamp = 0;

export type ScratchpadUpdate = {
    scratchpad: string,
    timestamp: number,
    character: string | undefined,
}

type ScratchpadExport = {
    raw: Readonly<string>,
    set: (value: string) => void,
}

// Set readonly as we get closer to completion.
export default function init(savePath: string): ScratchpadExport {
    if (savePath)
        saveFile = savePath;

    if (fs.existsSync(savePath)) {
        try {
            const text = fs.readFileSync(savePath, 'utf8');
            scratchpad = text; // sanitize?;
            timestamp = Date.now();
        }
        catch (e) {
            log.error(`Error loading scratchpad: ${e}`);
            scratchpad = 'There was an error loading your scratchpad data. Please report this as a bug. The file may still exist in your Frolic data, but it could not be read.';
        }
    }

    registerIPC();

    return {
        raw: scratchpad,
        set,
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

    Electron.ipcMain.handle('scratchpad-initial', () => ({ scratchpad, timestamp }));

    Electron.ipcMain.on('scratchpad', (e, d: ScratchpadUpdate) => {
        if (d.timestamp > timestamp) {
            timestamp = d.timestamp;
            log.debug('Received and storing scratchpad.', e.sender.id, {
                stale: scratchpad,
                incoming: d.scratchpad,
            });

            set(d.scratchpad, e.sender.id);
        }
        else {
            log.warn('Outdated scratchpad reached main.', {
                from:      d.character,
                'from-wc': e.sender.id,
                to:        'electron-main',
                current:   timestamp,
                new:       d.timestamp,
            });
        }
    });
}

/**
 * Call update instead of save when we need to update the timestamp - IE, the update is generated in electron main side. `saveScratchpad` is invoked internally and will broadcast the new timestamp to the renderers with the new scratchpad object. Failure to call this function and update the timestamp will cause renderers to ignore your "out-of-date" update.
 */
function updateScratchpad(s: string): void {
    timestamp = Date.now();
    log.debug("Internal update to scratchpad. You'll see 'saving and broadcasting' next", timestamp);
    saveScratchpad(s);
}

/**
 * Optionally takes a webcontents we're saving from. If unprovided, this save will re-propogate to the renderer we received from.
 * @param s
 * @param wc Optional: a webcontents we received an updated scratchpad from.
 */
function saveScratchpad(s: string, wcid?: number): void {
    if (wcid !== undefined)
        log.debug('Received update; saving and broadcasting.', wcid, timestamp);
    else
        log.debug('Local update; broadcasting scratchpad...', timestamp);

    if (saveFile) {
        try {
            fs.writeFileSync(saveFile, s);
        }
        catch (e) {
            console.error(e);
        }
    }

    for (const w of Electron.webContents.getAllWebContents()) {
        if (wcid === w.id)
            log.debug('Found webcontents match; Good once per timestamp.', w.id, timestamp);
        else
            w.send('scratchpad', { scratchpad: s, timestamp });
    }
}

/**
 * External access to overwrite scratchpad.
 * @param value value to overwrite scratchpad with
 * @param webContentsId Pass -1 to skip saving an update; undefined/empty to propogate to all renderers
 * @returns
 */
function set(newValue: string, webContentsId?: number) {
    if (scratchpad !== newValue) {
        scratchpad = newValue;

        if (webContentsId === undefined)
            updateScratchpad(scratchpad);
        else if (webContentsId >= 0)
            saveScratchpad(scratchpad, webContentsId);

        return true;
    }
    else {
        return false;
    }
}
