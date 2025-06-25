import * as fs from 'fs';
import * as path from 'path';

import * as remote from '@electron/remote';

import Logger from 'electron-log/renderer';
const log = Logger.scope('eicon/store');

import { EIconUpdater } from './updater';

/**
 * The eicon UI has a maximum display size of 7x7 eicons at a time,
 * so this is one page.
 */
const EICON_PAGE_RESULTS_COUNT = 7 * 7;

/**
 * The current store version will be saved locally with the eicon store to be
 * used for future eicon store upgrades.
 */
const CURRENT_STORE_VERSION = 2.0;

/**
 * Frequency to check for updates from the eicon service.
 */
const UPDATE_FREQUENCY = 60 * 60 * 1000;

// The below functions are so generic they could be moved to a utils file.

/**
 * Flip through entries of an array in the style of a rolodex, rotating them
 * from front to back while preserving the circular order.
 * @param arr The "rolodex" to cycle through; will be modified in-place
 * @param amount Number of results to move from front to back
 * @returns An array of the entries that were flipped through
 */
function Rotate<T>(arr: T[], amount: number): T[] {
    const remove = arr.splice(0, amount);

    arr.push(...remove);

    return remove;
}

/**
 * A fast randomization algorithm.
 * @param arr An array to be randomized; will be modified in-place
 */
async function FisherYatesShuffle(arr: any[]): Promise<void> {
    for (let cp = arr.length - 1; cp > 0; cp--) {
        const np = Math.floor(Math.random() * (cp + 1));
        [arr[cp], arr[np]] = [arr[np], arr[cp]];
    }
}

/**
 * Confirms whether a given subject is an array that contains only strings;
 * useful for runtime verification of files, websites, and
 * other imported data.
 * @param subj Any type; will validate as array before having its values checked
 * @returns Is the subject an array that contains only strings?
 */
function isArrayOfStrings(subj: any): subj is string[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'string');
}

/**
 * Confirms whether a given subject is an array that contains only objects;
 * useful for runtime verification of files, websites, and
 * other imported data.
 *
 * This does not check that the objects contain any
 * particular internal structure.
 * @param subj Any type; will validate as array before having its values checked
 * @returns Is the subject an array that contains only objects?
 */
function isArrayOfObjects(subj: any): subj is object[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'object');
}

/**
 * A test designed to verify data loaded from disk meets the eicon file
 * structure. Tests for `version` and `records` members, and that `records`
 * is an array of strings.
 * @param d A variable to test the structure of.
 * @returns True if the variable is the shape of the eicon store version 2
 * and explicitly has `version: 2`.
 */
function ExplicitlyVersion2(d: any): boolean {
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
function ImplicitlyVersion2(d: any): boolean {
    return isArrayOfStrings(d?.records);
}

/**
 * A test designed to verify data loaded from disk meets the eicon file
 * structure. Tests that `records` member is an array of objects. This is the
 * implicit shape of the Rising eicon file. The Rising eicon file has no
 * explicit version, so it's been defaulted to version 1.
 * @param d A variable to test the structure of.
 * @returns True if the variable is the shape of the Rising eicon store.
 */
function ImplicitlyVersion1(d: any): boolean {
    return isArrayOfObjects(d?.records);
}

/**
 * The EIconStore contains all the structures and methods necessary for
 * managing a full list of avilable eicons so users can quickly search for
 * their desired icon or perform a fully random search, as well as add eicons
 * to their favorites.
 *
 * Initialize a local reference of the store using {@link EIconStore.getSharedStore}.
 */
export class EIconStore {
    /**
     * The primary structure of the eicon store. Holds the list of eicons that's
     * saved & loaded, shuffled, searched, and paged through.
     */
    private lookup: string[] = [];

    /**
     * The timestamp is retrieved from the eicon server when eicons are
     * downloaded. It's stored locally to enable partial updates instead of
     * having to re-download the full eicon db on every app launch.
     */
    private asOfTimestamp = 0;

    /**
     * A mini-structure for the download functions.
     */
    private updater = new EIconUpdater();

    /**
     * Save the eicon store to disk alongside its last-updated timestamp and
     * file version - as long as there is something to save. If it fails, the
     * error is caught, logged, and ignored.
     */
    private async save(): Promise<void> {
        if (this.lookup.length) {
            log.info(
                'eicons.save', {
                    records: this.lookup.length,
                    asOfTimestamp: this.asOfTimestamp,
                    file: this.getStoreFilename(),
                }
            );

            try {
                fs.writeFileSync(
                    this.getStoreFilename(),
                    JSON.stringify({
                        version: CURRENT_STORE_VERSION,
                        asOfTimestamp: this.asOfTimestamp,
                        records: this.lookup,
                    })
                );
            }
            catch (e) {
                // This is not a showstopper.
                log.error('eicons.save.failure', { e });
            }
        }

        remote.ipcMain.emit('eicons.reload', { asOfTimestamp: this.asOfTimestamp });
    }

    /**
     * Loads the local eicon db and upates it with data from Xariah's eicon
     * service.
     *
     * Called from {@link getSharedStore} any time a new tab is opened,
     * including when launching the app.
     *
     * This method can properly load (and upgrade) the Rising "array of
     * eicon+timestamp objects" as well as the version 2 (post-Rising)
     * "array of eicon names".
     */
    private async load(): Promise<void> {
        log.info('eicons.load', { store: this.getStoreFilename() });

        try {
            const data = JSON.parse(fs.readFileSync(this.getStoreFilename(), 'utf-8'));

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
            if (ExplicitlyVersion2(data) || ImplicitlyVersion2(data))
                this.lookup = data.records;
            else if (ImplicitlyVersion1(data))
                this.lookup = data.records.map((i: { eicon: string }) => i.eicon);
            else
                this.lookup = [];

            this.asOfTimestamp = data?.asOfTimestamp || 0;

            if (!this.lookup.length || !this.asOfTimestamp) {
                log.warn('eicons.load.failure.disk', { timestamp: data.asOfTimestamp, data: this.lookup.length });
                throw new Error('Data from disk is strange.');
            }

            log.verbose('eicons.loaded.local', { records: this.lookup.length, asOfTimestamp: this.asOfTimestamp });

            await this.checkForUpdates();

            log.verbose('eicons.loaded.update.remote', { records: this.lookup.length, asOfTimestamp: this.asOfTimestamp });
        }
        catch (err) {
            try {
                await this.downloadAll();
            }
            catch (err2) {
                log.error('eicons.load.failure.download', { initial: err, explicit: err2 });
            }
        }
    }

    /**
     * Returns the hardcoded name for the eicon db file.
     *
     * Depends on electron's `userData` path to already be set correctly.
     *
     * Uses "data" as a hardcoded settings directory and "eicons.json" as a
     * hardcoded filename.
     *
     * @returns The full path to the eicon db file.
     */
    private getStoreFilename(): string {
        const baseDir = remote.app.getPath('userData');
        const settingsDir = path.join(baseDir, 'data');

        if (CURRENT_STORE_VERSION)
            return path.join(settingsDir, `eicons-${CURRENT_STORE_VERSION}.json`);
        else
            return path.join(settingsDir, 'eicons.json');
    }

    /**
     * Rebuild the entire eicon table by refetching all data from the eicon
     * server.
     *
     * For manual invocation, use {@link checkForUpdates} instead.
     */
    private async downloadAll(): Promise<void> {
        log.info('eicons.downloadAll');

        const data = await this.updater.fetchAll();

        this.lookup = data.eicons;

        this.asOfTimestamp = data.asOfTimestamp;

        await this.save();

        this.shuffle();
    }

    /**
     * Check for eicon db updates using the most efficient method.
     */
    async checkForUpdates(force?: boolean): Promise<void> {
        if (!this.asOfTimestamp || !this.lookup.length || force)
            await this.downloadAll();
        else
            await this.update();
    }

    /**
     * Uses the current timestamp to fetch all eicon additions and removals,
     * preventing the need to fetch the entire eicon db from the server on every
     * app launch.
     *
     * For manual invocation, use {@link checkForUpdates} instead.
     */
    private async update(): Promise<void> {
        log.verbose('eicons.update', { asOf: this.asOfTimestamp });

        const changes = await this.updater.fetchUpdates(this.asOfTimestamp);

        const removals = changes.recordUpdates
                .filter(changeRecord => changeRecord.action === '-')
                .map(i => i.eicon);

        this.removeIcons(removals);

        const additions = changes.recordUpdates
                .filter(changeRecord => changeRecord.action === '+')
                .map(i => i.eicon);

        this.addIcons(additions);

        this.asOfTimestamp = changes.asOfTimestamp;

        log.verbose('eicons.update.processed', { removals: removals.length, additions: additions.length, asOf: this.asOfTimestamp });

        await this.save();

        this.shuffle();
    }

    /**
     * Adds eicons to the local store, avoiding duplicates.
     * @param additions Array of eicon names
     */
    private addIcons(additions: string[]): void {
        this.lookup.push(...additions.filter(e => !this.lookup.includes(e)));
    }

    /**
     * Removes eicons from the local store.
     * @param removals Array of eicon names
     */
    private removeIcons(removals: string[]): void {
        this.lookup = this.lookup.filter(e => !removals.includes(e));
    }

    /**
     * Search eicon names for a given query.
     * @param searchString The user query
     * @returns A locale sorted array of all eicons whos names contain the given searchString.
     */
    search(searchString: string): string[] {
        const query = searchString.toLowerCase();
        const found = this.lookup.filter(e => e.includes(query));

        return found.sort((a, b) => {
            if (a.startsWith(query) && !b.startsWith(query))
                return -1;

            if (b.startsWith(query) && !a.startsWith(query))
                return 1;

            return a.localeCompare(b);
        });
    }

    /**
     * Randomize the eicon db using the fast Fisher-Yates shuffle.
     */
    async shuffle(): Promise<void> {
        await FisherYatesShuffle(this.lookup);
    }

    /**
     * Retrieve the first `amount` of eicons from the (presumably shuffled) eicon
     * db.
     * @param amount The number of results to return in this page
     * @returns An array of eicon names
     */
    nextPage(amount: number = 0): string[] {
        return Rotate(this.lookup, amount || EICON_PAGE_RESULTS_COUNT);
    }

    /**
     * Storage container for a singleton. The proper way to retrieve the store
     * is by invoking {@link EIconStore.getSharedStore}.
     */
    private static sharedStore: EIconStore | undefined;

    /**
     * A custom implementation of a singleton. Useful because there are multiple
     * eicon selector UIs and each one will try to instantiate the eicon store.
     * @returns The active instance of EIconStore, or a new one if it doesn't exist
     */
    static async getSharedStore(): Promise<EIconStore> {
        if (!EIconStore.sharedStore) {
            EIconStore.sharedStore = new EIconStore();

            await EIconStore.sharedStore.load();

            setInterval(() => EIconStore.sharedStore!.checkForUpdates(), UPDATE_FREQUENCY);
        }

        return EIconStore.sharedStore;
    }
}
