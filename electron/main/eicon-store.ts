// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * The EIconStore contains all the structures and methods necessary for
 * managing a full list of avilable eicons so users can quickly search for
 * their desired icon or perform a fully random search, as well as add eicons
 * to their favorites.
 *
 * Exclusively exports an init() factory function that gives you a EiconStoreExport.
 */
import * as Electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import Axios, { AxiosError, AxiosProgressEvent } from 'axios';
import * as Utils from '../../helpers/utils';

// even importing just the type from event-bus doesn't work, though it should
export interface ErrorEvent {
    source:  'eicon' | 'index' | 'core',
    type?:   string,
    message: string,
    fatal?:  boolean,
}

import NewLogger from './custom-logger';
const l_s = process.argv.includes('--debug-eicons');
const logEicon = NewLogger('eicons', () => l_s);

/**
 * URLS for Xariah's eicon service. Maybe there's some optimization available to  fetch full if we're so far out of date?
 */
const FULL_DATA_URL   = 'https://xariah.net/eicons/Home/EiconsDataBase/base.doc';
const DATA_UPDATE_URL = 'https://xariah.net/eicons/Home/EiconsDataDeltaSince';

/**
 * The current store version will be saved locally with the eicon store to be
 * used for future eicon store upgrades.
 */
const CURRENT_STORE_VERSION = 2.0;

/**
 * The eicon UI has a maximum display size of 7x7 eicons at a time,
 * so this is one page.
 */
const EICON_PAGE_RESULTS_COUNT = 7 * 7;

/**
 * Frequency to check for updates from the eicon service.
 */
const UPDATE_FREQUENCY = 60 * 60 * 1000;

/**
 * `store` is an internally-formatted string array of the eicons.
 * `asOfTimestamp` is the timestamp served from the eicon service.
 * `status` is an arbitrary string that can be used to unambiguously identify certain states. There's no pattern except whatever's useful.
 * The `status` can be used to compare two store exports to see if one is preferred. Maybe don't accept an export who's status is "error". ;)
 */
interface EiconStoreExport {
    status: 'ready'   | 'unverified'
          | 'loading' | 'uninitialized' | 'error';
    store:         string[];
    asOfTimestamp: number;
}

export interface EiconUpdateRecord {
    '+': string[];
    '-': string[];
}

export interface EiconUpdateExport {
    status:        EiconStoreExport['status'];
    record:        EiconUpdateRecord;
    asOfTimestamp: EiconStoreExport['asOfTimestamp'];
}

/**
 * The primary structure of the eicon store. Holds the list of eicons that's
 * saved & loaded, shuffled, searched, and paged through.
 */
let store: EiconStoreExport['store'] = [];

/**
 * The timestamp is retrieved from the eicon server when eicons are
 * downloaded. It's stored locally to enable partial updates instead of
 * having to re-download the full eicon db on every app launch.
 */
let asOfTimestamp: EiconStoreExport['asOfTimestamp'] = 0;

let status: EiconStoreExport['status'] = 'uninitialized';

/**
 * Store filename; should be constructed during init();
 */
let storeFile = '';

/**
 * Used for debugging, especially for grabbing timestamps of potentially lengthy processes like shuffling.
 */
const dev = process.env.NODE_ENV === 'development';

/**
 * This init function need to take in the partial file name and convert it to the appropriate version/json filename. IE `eicons-2.json`
 * @param partialPath
 * @returns
 */
export async function init(directory: string, expectedFilename: string): Promise<EiconStoreExport> {
    getStoreFilename(directory, expectedFilename);

    registerIPC();

    // We could delay pushing this information to the public structures, but why? load() returns sanitized data.
    const l = await load();

    if (l.asOfTimestamp && l.store.length && l.status === 'ready') {
        ({ store, asOfTimestamp, status } = l);

        logEicon.debug('store.init.loadsuccess', { store: store.length, asOfTimestamp });
    }

    await checkForUpdates();
    setInterval(() => checkForUpdates(), UPDATE_FREQUENCY);

    Electron.webContents.getAllWebContents().forEach(wc => wc.send('eicon-ready'));

    return {
        store,
        asOfTimestamp,
        status,
    };
}

/**
 * Call with no arguments to register pre-programmed events; provide your own events to register those.
 * @param extraCalls Optional: Tuples of event-name and Function
 */
function registerIPC(extraCalls?: [ [string, (event: Electron.IpcMainEvent, ...args: any[]) => void] ]) {
    if (extraCalls) {
        logEicon.debug('store.registerIPC.extras', { count: extraCalls.length });

        for (const [ channel, handler ] of extraCalls)
            Electron.ipcMain.on(channel, handler);

        return;
    }

    logEicon.debug('store.registerIPC.start');

    /**
     * IPC:
     *      SEND when loaded and when new data from server.
     *      RECEIVE request: status notifications
     *      RECEIVE request: random page
     *      RECEIVE request: search query
     *      RECEIVE request: hard refresh
     */
    Electron.ipcMain.handle('eicon-status', (): { status?: string, amount: number } => {
        // Count or timestamp may be valuable to return to inform the user how long it's been since they updated.
        return { status: status, amount: store.length };
    });

    Electron.ipcMain.handle('eicon-page', (_e, count?: any): string[] => {
        logEicon.silly('store.handle.eicon-page', count);

        const n = typeof count === 'number' && count >= 0 && count <= store.length
            ? count
            : 0;

        return randomPage(n);
    });

    Electron.ipcMain.handle('eicon-search', (_e, query: any): string[] => {
        logEicon.silly('store.handle.eicon-search', query);

        if (query && typeof query === 'string')
            return search(query);
        else
            return randomPage();
    });

    Electron.ipcMain.handle('eicon-refresh', async (_e, payload): Promise<boolean> => {
        logEicon.silly('store.handle.eicon-refresh', payload);

        await checkForUpdates(!!payload);

        return true;
    });
}

/**
 * Save the eicon store to disk alongside its last-updated timestamp and
 * file version - as long as there is something to save. If it fails, the
 * error is caught, logged, and ignored.
 */
async function save(): Promise<boolean> {
    const filename = getStoreFilename();

    if (!filename) {
        logEicon.error('store.save.filename.failure', "Can't save eicon store because no filename.");

        return false;
    }

    if (store.length) {
        try {
            await fs.promises.writeFile(
                filename,
                JSON.stringify({
                    version: CURRENT_STORE_VERSION,
                    asOfTimestamp,
                    records: store,
                }), {
                    encoding: 'utf-8',
                }
            );

            logEicon.debug('store.save.success.saved', {
                records: store.length,
                asOfTimestamp,
                file: filename,
            });

            return true;
        }
        catch (e) {
            // This is not a showstopper.
            logEicon.error('store.save.disk.failure', { e });

            return false;
        }
    }

    // We don't save, but we shouldn't save, so all is right in the world.
    logEicon.debug('store.save.success.didntsave');

    return true;
}

/**
 * Returns a fully-loaded "eicon export"; including the store populated
 * with data loaded from disk. Failure to load from disk will result in
 * an empty store - safe to populate with data from the server.
 *
 * This method can properly load (and upgrade) the Rising "array of
 * eicon+timestamp objects" as well as the version 2 (post-Rising)
 * "array of eicon names".
 */
async function load(): Promise<EiconStoreExport> {
    const filename = getStoreFilename();

    if (!filename) {
        logEicon.error('store.load.filename.failure', "Eicon store failed to load because storeFilename didn't resolve.");

        return { store: [], asOfTimestamp: 0, status: 'error' };
    }

    logEicon.verbose('store.load', { store: filename });

    const ret: EiconStoreExport = {
        store: [] as string[],
        asOfTimestamp: 0,
        status: 'uninitialized',
    };

    try {
        const data = JSON.parse(await fs.promises.readFile(filename, { encoding: 'utf-8' }));

        /** Handling old formats is a must.
         *
         * Rising: Object = {
         *    asOfTimestamp: number,
         *    records: [
         *      { eicon: string,
         *        timestamp: number }
         *    ]
         * };
         *
         * v2: Object = {
         *    version: number,
         *    asOfTimestamp: number,
         *    records: [
         *      eicon: string
         *    ]
         * }
         *
         * If you need to add a new version, check FIRST for version number,
         * but leave structure-based detection as a backup and for the original.
         */
        if (ExplicitlyVersion2(data)) {
            logEicon.debug('store.load.version.2.explicit');

            ret.store = data.records;
        }
        else if (ImplicitlyVersion2(data)) {
            logEicon.debug('store.load.version.2.implicit');

            ret.store = data.records;
        }
        else if (ImplicitlyVersion1(data)) {
            logEicon.debug('store.load.version.1.implicit');
            // bad cast; ts overload should have picked it up.
            ret.store = data.records.reduce<string[]>(
                (goodRecords, record) => {
                    // @ts-ignore webpack ts can't figure this out?
                    if ('eicon' in record && typeof record.eicon === 'string')
                        // @ts-ignore webpack ts can't figure this out?
                        goodRecords.push(record.eicon);

                    return goodRecords;
                },
                []
            );
        }

        ret.asOfTimestamp = data?.asOfTimestamp || 0;

        if (!ret.store.length || !ret.asOfTimestamp) {
            logEicon.warn('store.load.disk.failure', { timestamp: data.asOfTimestamp, data: ret.store.length });

            ret.status = 'error';

            throw new Error('Data from disk is strange.');
        }

        logEicon.verbose('store.load.ready', { records: ret.store.length, asOfTimestamp: ret.asOfTimestamp });

        ret.status = 'ready';
    }
    catch (e) {
        logEicon.error('store.load.failure', e);
    }
    finally {
        return ret;
    }
}

    // catch (err) {
    //     try {
    //         await downloadAll();
    //     }
    //     catch (err2) {
    //         logEicon.error('eicons.load.failure.download', { initial: err, explicit: err2 });

    //         emitError({
    //             source:  'eicon',
    //             type:    'load.download',
    //             message: 'Failed to update or download new eicons. Eicon search may provide outdated results.',
    //         });
    //     }
    // }

/**
 * Returns the hardcoded name for the eicon db file.
 *
 * Depends on electron's `userData` path to already be set correctly.
 *
 * Uses "data" as a hardcoded settings directory and "eicons.json" as a
 * hardcoded filename.
 *
 * @param partial partial filename
 * @returns The full path to the eicon db file.
 */
function getStoreFilename(directory?: string, partial?: string): string {
    if (!storeFile) {
        const file = partial || 'eicons';

        if (!directory)
            directory = path.join(Electron.app.getPath('userData'), 'data');

        storeFile = CURRENT_STORE_VERSION
            ? path.join(directory, `${file}-${CURRENT_STORE_VERSION}.json`)
            : path.join(directory, `${file}.json`);
    }

    logEicon.silly('store.getStoreFilename.success', storeFile);

    return storeFile;
}



/**
 * Rebuild the entire eicon table by refetching all data from the eicon
 * server, then saving the new store and shuffling. Ensures the store is fully ready to go.
 *
 * For manual invocation, use {@link checkForUpdates} instead.
 */
async function rebuildFromRemote(): Promise<void> {
    logEicon.info('store.rebuildFromRemote.start');

    const data = await fetchAll();

    if (data.eicons.length) {
        if (data.asOfTimestamp) {
            logEicon.debug('store.rebuildFromRemote.ready');

            asOfTimestamp = data.asOfTimestamp;
            store = data.eicons;
            status = 'ready';
        }
        else {
            logEicon.debug('store.rebuildFromRemote.unverified');
            // don't store bad timestamp so next run can get better data
            store = data.eicons;
            status = 'unverified';
        }

        await save();
        await shuffle();
    }
}

/**
 * Uses the current timestamp to fetch all eicon additions and removals, preventing the need to fetch the entire eicon db from the server on every app launch.
 *
 * For manual invocation, use {@link checkForUpdates} instead.
 * @returns
 */
async function update(): Promise<void> {
    logEicon.verbose('store.update.start', { asOfTimestamp });

    const changes = await fetchUpdates(asOfTimestamp);

    const removals  = changes.record['-'];
    const additions = changes.record['+'];

    addAndRemoveIcons(additions, removals);

    status = changes.status;

    if (changes.status === 'ready')
        asOfTimestamp = changes.asOfTimestamp;

    logEicon.verbose('store.update.processed', {
        asOfTimestamp,
        removals: removals.length,
        additions: additions.length,
    });

    logEicon.debug(`store.update.complete.${changes.status}`);

    await save();
    await shuffle(additions.length);
}

/**
 * The checkForUpdates routine is called on a timer to save new data into the eicon store. Check for eicon db updates using the most efficient method.
 *
 * As it's called from a timer, it should handle writing to the export data to the variables itself.
 */
async function checkForUpdates(force?: boolean): Promise<void> {
    if (force || !asOfTimestamp || !store.length || status !== 'ready') {
        await rebuildFromRemote();
    }
    else {
        await update();
    }
}


/**
 * Internet function
 */

async function fetchAll(): Promise<{ eicons: string[], asOfTimestamp: number }> {
    const controller = new AbortController();

    let user_impatience = () => controller.abort("Xariah connection timeout.");
    let no_response = setTimeout(user_impatience, 8000);

    logEicon.debug('store.fetchAll.timeout.start');

    /** How to handle wrong response type?
     * In theory Axios response is `any` type, in reality
     * Axios response types are ResponseType:
     * text, arraybuffer, blob, document, json, stream
     */
    const result = await Axios.get(
        FULL_DATA_URL, {
            signal: controller.signal,
            onDownloadProgress: e => {
                logEicon.debug('store.fetchAll.progress.datareceived');

                clearTimeout(no_response);
                no_response = setTimeout(user_impatience, 5000);

                if (e.lengthComputable)
                    emitProgress(e);
            },
            timeout: 15000,
            timeoutErrorMessage: 'Failed to get Xariah.net eicon database.',
        }
    )
    .catch(e => {
        function isAxios (err: any): err is AxiosError { return err.isAxiosError; }

        if (isAxios(e) && e.response) { // Server responded with failure
            logEicon.info('store.axios.err.response', e.response.status, e.response.headers);

            emitError({
                source:  'eicon',
                type:    'fetchAll.httpResponse',
                message: `HTTP Response ${e.response.status ?? 'NONE'} from eicon server.`,
            });
        }
        else if (isAxios(e) && e.request) { // No response
            const r = (e.request as XMLHttpRequest);
            logEicon.info('store.axios.err.request', { status: r.status, readyState: r.readyState });

            emitError({
                source:  'eicon',
                type:    'fetchAll.httpRequest',
                message: 'There was no response from the eicon server.',
            });
        }
        else {
            logEicon.info('store.axios.err.generic', { err: e });

            emitError({
                source:  'eicon',
                type:    'fetchAll.httpGeneric',
                message: 'Miscellaneous error contacting the eicon server.',
            });
        }

        return undefined;
    });

    clearTimeout(no_response);

    if (!result) {
        logEicon.debug('store.fetchAll.result.none');
        return { asOfTimestamp: 0, eicons: [] };
    }

    const lines = (result.data as string).split('\n');

    const eicons = lines
        .filter(line => line.trim() !== '' && !line.trim().startsWith('#'))
        .map(line => line.split('\t', 2)[0].toLowerCase());

    const asOfLine = lines.find(line => line.startsWith('# As Of: '));
    const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

    if (!asOfTimestamp) {
        logEicon.error('No "# As Of: " line found.');

        emitError({
            source:  'eicon',
            type:    'fetchAll.timestamp',
            message: "Didn't receive timestamp from eicon server.",
        });
    }

    return { asOfTimestamp, eicons };
}

async function fetchUpdates(fromTimestampInSecs: number): Promise<EiconUpdateExport> {
    const controller = new AbortController();

    let user_impatience = () => controller.abort("Xariah connection timeout.");
    let no_response = setTimeout(user_impatience, 8000);

    logEicon.debug('store.fetchUpdates.timeout.start');

    const result = await Axios.get(`${DATA_UPDATE_URL}/${fromTimestampInSecs}`, {
        signal: controller.signal,
        onDownloadProgress: e => {
            logEicon.debug('store.fetchUpdates.progress.datareceived');

            clearTimeout(no_response);
            no_response = setTimeout(user_impatience, 5000);

            if (e.lengthComputable)
                emitProgress(e);
        },
        timeout: 15000,
        timeoutErrorMessage: 'Failed to get Xariah.net eicon database.',
    })
    .catch(() => emitError({
        source:  'eicon',
        type:    'fetchUpdates.connection',
        message: "Didn't receive timestamp from eicon server.",
    }));

    // bad result; lets pretend this update never happened.
    if (!result || typeof result.data !== 'string')
        return { asOfTimestamp: fromTimestampInSecs, record: { '+': [], '-': [] }, status: 'error' };

    const recordUpdates: EiconUpdateRecord = {
        '+': [],
        '-': [],
    };

    const lines = result.data.split('\n');

    lines.forEach(l => {
        const line = l.trim();
        if (!line || line.startsWith('#'))
            return;

        const [action, eicon] = line.split('\t', 3);

        if (action === '+' || action === '-')
            recordUpdates[action].push(eicon.toLowerCase());
    });

    const asOfLine = lines.find(line => line.startsWith('# As Of: '));
    const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

    if (!asOfTimestamp) {
        logEicon.error('No "# As Of: " line found.');

        emitError({
            source:  'eicon',
            type:    'fetchUpdates.timestamp',
            message: "Didn't receive timestamp from eicon server.",
        });
    }

    logEicon.debug('store.fetchUpdates.success', { asOfTimestamp, additions: recordUpdates['+'].length, removals: recordUpdates['-'].length });

    return {
        asOfTimestamp: asOfTimestamp || fromTimestampInSecs,
        record: recordUpdates,
        status: asOfTimestamp ? 'ready' : 'unverified',
    };
}

async function emitError(err: ErrorEvent) {
    Electron.webContents.getAllWebContents().forEach(wc => wc.send('eicon-error', err));
}

async function emitProgress(e: AxiosProgressEvent) {
    Electron.webContents.getAllWebContents().forEach(wc => wc.send('eicon-progress', e));
}

/**
 * Contained functions
 */

/**
 * Search eicon names for a given query.
 * @param searchString The user query
 * @returns A locale sorted array of all eicons whos names contain the given searchString.
 */
function search(searchString: string): string[] {
    logEicon.silly('store.search.start', searchString);

    if (!searchString)
        return randomPage();

    const query = searchString.toLowerCase();

    if (query.startsWith('category:'))
        return getCategoryResults(query.substring(9).trim());

    // else:
    const found = store.filter(e => e.includes(query));

    found.sort((a, b) => {
        if (a.startsWith(query) && !b.startsWith(query))
            return -1;

        if (b.startsWith(query) && !a.startsWith(query))
            return 1;

        return a.localeCompare(b);
    });

    // Prevent a flood of eicons for generic search phrases
    const desired_count = EICON_PAGE_RESULTS_COUNT * query.length * 1.43;
    if (found.length > desired_count)
        found.length = desired_count;

    return found;
}

/**
 * Randomize the eicon db using the fast Fisher-Yates shuffle, capable of shuffing only a select few cards at a time.
 */
async function shuffle(amount?: number): Promise<void> {
    logEicon.silly('store.shuffle', amount);

    if (dev) console.time(`shuffle ${amount}`);

    await Utils.FisherYatesShuffle(store, amount);

    if (dev) console.timeEnd(`shuffle ${amount}`);
}

/**
 * Retrieve the first `amount` of eicons from the (presumably shuffled) eicon
 * db.
 * @param amount The number of results to return in this page
 * @returns An array of eicon names
 */
function randomPage(amount: number = 0): string[] {
    const r = Utils.Rotate(store, amount || EICON_PAGE_RESULTS_COUNT);

    shuffle(r.length);

    return r;
}

/**
 * Add and remove eicons from the local store in an efficient manner. (~80ms vs 3 seconds using this scenario with 1 million unique entry array and 25000 entry small array with no collisions)
 *
 * Adding to a "unique" array requires checking your new addition doesn't exist; removing requires finding index and splicing to remove it for each removal, or filtering all at once.
 * @param removals Array of eicon names
 */
function addAndRemoveIcons(removals: string[] = [], additions: string[] = []): void {
    logEicon.silly('store.addAndRemoveIcons.start');

    logEicon.debug('Logging eicon timer:', dev);

    if (dev) console.time('addAndRemoveIcons');

    const store_set = new Set(store);

    if (dev) console.timeLog('addAndRemoveIcons');

    removals.forEach(r => store_set.delete(r));

    if (dev) console.timeLog('addAndRemoveIcons');

    additions.forEach(a => store_set.add(a));

    if (dev) console.timeLog('addAndRemoveIcons');

    store = Array.from(store_set);

    if (dev) console.timeEnd('addAndRemoveIcons');
}


/**
 * Helpers
 */

/**
 * A test designed to verify data loaded from disk meets the eicon file
 * structure. Tests for `version` and `records` members, and that `records`
 * is an array of strings.
 * @param d A variable to test the structure of.
 * @returns True if the variable is the shape of the eicon store version 2
 * and explicitly has `version: 2`.
 */
function ExplicitlyVersion2(d: any): d is { version: 2, records: string[] } {
    return d?.version === 2 && ImplicitlyVersion2(d);
}

/**
 * A test designed to verify data loaded from disk meets the eicon file
 * structure. Tests that `records` member is an array of strings. This is a
 * fallback in case the eicon store is missing a `version` member. Use
 * {@link ExplicitlyVersion2} to test for `version` member.
 * @param d A variable to test the structure of.
 * @returns True if the variable is the shape of the eicon store version 2.
 */
function ImplicitlyVersion2(d: any): d is { records: string[] } {
    return Utils.isArrayOfStrings(d?.records);
}

/**
 * A test designed to verify data loaded from disk meets the eicon file
 * structure. Tests that `records` member is an array of objects. This is the
 * implicit shape of the Rising eicon file. The Rising eicon file has no
 * explicit version, so it's been defaulted to version 1.
 * @param d A variable to test the structure of.
 * @returns True if the variable is the shape of the Rising eicon store.
 */
function ImplicitlyVersion1(d: any): d is { records: object[] } {
    return Utils.isArrayOfObjects(d?.records);
}

/**
 * Bulk
 */

function getCategoryResults(category: string): string[] {
    switch(category) {
    case 'random':
        return randomPage();

    case 'expressions':
        return [
                        // Memetic
            'shhh', 'excuse me',
                        // Anime:
            'no tax refund', 'kizunaai', 'robotsmug', 'angyraihan', 'heartseyes', 'confused01', 'moronyeh', 'ashemote3', 'howembarrassing', 'hyperahegao', 'luminosebleed', 'baisergushing', 'aijam',
                        // Cartoon-ish:
            'nuttoohard', 'bangfingerbang', 'simpwaifu', 'paishake', 'lip',
                        // Cartoon:
            'fluttersorry', 'thirstytwi', 'horseeyes', 'horsepls',
                        // Emoji adjacent:
            'catblob',  'catblobangery', 'blobhugs', 'geblobcatshrug', 'badkitty', 'eggplantemoji', 'peachemoji', 'splashemoji', 'eyes emoji',
                        // Emoji:
            'flushedemoji', 'pensiveemoji', 'heart eyes', 'kissing heart', 'melting emoji', 'thinkingemoji', 'party emoji', 'triumphemoji', 'uwuemoji', 'bottomfingers', 'heartflooshed', 'blushpanic', 'love2', 'whentheohitsright', 'embarassment', 'twittersob',
        ];

    case 'soft':
        return [
                        // Hi!:
            'dogdoin', 'doggohi', 'smile5', 'fluffbrain', 'coolraccoon', 'cat sit', 'kittypeeky',
                        // Fun:
            'kicky', 'yappers', 'nyehe', 'nyeheh', 'kittygiggle', 'samodance', 'dogewut', 'wibbl', 'dogcited', 'wagglebrow', 'fennec2', 'blobfoxbongo', 'akittyclap', 'nodnodnod', 'catbop', 'ermtime', 'bunnana', 'cateatingchips', 'catkiss',
                        // Soft:
            'imdieforever', 'waitingcuddles', 'waitingforforeheadkissie', 'blushcat', 'bunhug', 'meowhuggies', 'bunanxiety', 'cat_waddle',
                        // Chaos:
            'catnapping', 'catheadempty', 'bunnywavedash', 'bunnyscrem8', 'cry cat', 'yote gasp', 'cat2back', 'stupid little woo woo boy', 'chedoggo', 'scuffedhamster', 'angydoggo', 'kittyangy',
                        // Bye:
            'eepy', 'sleepdog', 'cat faceplant',
        ];

    case 'sexual':
        return [
                        // Act:
            'asutired1', 'asutired2', 'vanessamasturbate', 'musclefuck2', 'worshipping3', 'lapgrind', 'salivashare', 'slurpkiss', 'cockiss', 'lovetosuck', 'donglove', 'horseoral9a', 'swallowit', 'paiplop', 'satsukinailed', 'kntbch1', 'dickslurp',
                        // Showing Off:
            'influencerhater', 'sloppy01', 'fingersucc', 'cmontakeit', 'hopelessly in love', 'ahega01 2', 'absbulge', 'edgyoops', 'oralcreampie100px', 'debonairdick4', 'kirari1e', 'pinkundress', 'georgiethot',
                        // Body:
            'jhab1', 'coralbutt4', 'rorobutt2', 'ballsack3', 'blackshem1', 'cheegrope2', 'dropsqueeze', 'flaunt', 'haigure',
                        // BDSM:
            'gagged2', 'cumringgag',
                        // Symbols:
            'thekonlook', 'melodypeg', 'heart beat', 'lovebreeders', 'cummies', 'a condom', 'kissspink',
        ];

    case 'bubbles':
        return [
                        // Memetic:
            'speedl', 'speedr', 'notcashmoney', 'taftail', 'fuckyouasshole', 'ciaig', 'crimes', 'nagagross', 'rude1', 'helpicantstopsuckingcocks', 'eyesuphere', 'peggable2', 'sydeanothere', 'dickdick', 'frfister',
                        // Cutesy:
            'iacs', 'pat my head', 'pawslut', 'inbagg',
                        // Sexual:
            'lickme', 'takemetohornyjail', 'knotslutbubble', 'toofuckinghot', 'pbmr', 'imabimbo', 'fatdick', 'callmemommy', 'breakthesubs', 'fuckingnya', 'suckfuckobey', 'breedmaster', 'buttslutbb', 'simpbait', 'muskslut', '4lewdbubble', 'hypnosiss', 'imahypnoslut', 'notahealslut', '5lewdbubble', 'ratedmilf', 'ratedstud', 'ratedslut',  'xarcuminme', 'xarcumonme', 'fuckbun', 'fuckpiggy', 'plappening', 'goodboy0', 'spitinmouth',
        ];

    case 'symbols':
        return [
                        // Gender:
            'gender-cuntboy', 'gender-female', 'gender-herm', 'gender-male', 'gender-mherm', 'gender-none', 'gender-shemale', 'gender-transgender',
                        // Mosaics:
            'no ai', 'xpgameover1', 'xpgameover2', 'goldboomboxl', 'goldboomboxr',
                        // Pop culture:
            'getnorgetout', 'playstation', 'autobotsemblem', 'decepticonemblem',
                        // Cards
            'suitspades', 'suithearts', 'suitdiamonds',  'suitclubs',
                        // Letters and numbers:
            'num-1', 'num-2', 'num-3', 'num-4', 'num-5', 'num-6', 'num-7', 'num-8', '9ball', 'agrade',
                        // Emoji adjacent:
            'pimpdcash', 'discovered', 'pls stop', 'question mark', 'questget', 'music', 'speaker emoji', 'cam',
                        // Misc:
            'goldendicegmgolddicegif', 'smashletter', 'pentagramo', 'cuffed', 'paw2', 'sunnyuhsuperlove', 'transflag', 'streamlive', 'computer', 'you got mail',
        ];

    case 'memes':
        return [
            'flowercatnopls', 'flowercatpls', 'bad eicon detected', 'admiss', 'perish', 'fsquint', 'kille', 'majimamelon', 'dogboom', 'catexplode',  'despairing', 'doorkick', 'doorkick2', 'emptyhand', 'sweat 1', 'tap the sign', 'soypoint', 'pethand', 'tailwaggy', 'tailsooo', 'e62pog', 'thehorse', 'guncock', 'nct1', 'michaelguns', 'squirtlegun', 'palpatine', 'thatskindahot', 'ygod', 'flirting101', 'loudnoises', 'nyancat', 'gayb', 'apologize to god', 'jabbalick', 'raisefinger', 'whatislove', 'surprisemothafucka', 'thanksihateit', 'hell is this', 'confused travolta', 'no words', 'coffindance', 'homelander', 'thatsapenis', 'kermitbusiness', 'imdyingsquirtle', 'goodbye', 'oag',
        ];

    case 'favorites':
        //return Object.keys(core.state.favoriteEIcons);
        // New format is category:username
        return []; // TODO:
    }

    return [];
}
