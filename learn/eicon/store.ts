import * as fs from 'fs';
import * as path from 'path';

import * as remote from '@electron/remote';

import Logger from 'electron-log/renderer';
const log = Logger.scope('eicon/store');

import { EIconUpdater } from './updater';

// The eicon modal displays 7x7 at a time, so this is one page.
const EICON_PAGE_RESULTS_COUNT = 7 * 7;

const CURRENT_STORE_VERSION = 2.0;

const UPDATE_FREQUENCY = 60 * 60 * 1000;

// Shuffle and rotate are so generic they could be moved to a utils file.

function Rotate<T>(arr: T[], amount: number): T[] {
    const remove = arr.splice(0, amount);

    arr.push(...remove);

    return remove;
}

async function FisherYatesShuffle(arr: any[]): Promise<void> {
    for (let cp = arr.length - 1; cp > 0; cp--) {
        const np = Math.floor(Math.random() * (cp + 1));
        [arr[cp], arr[np]] = [arr[np], arr[cp]];
    }
}

function isArrayOfStrings(subj: any): subj is string[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'string');
}

function isArrayOfObjects(subj: any): subj is object[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'object');
}

function ExplicitlyVersion2(d: any): boolean {
    return d?.version === 2 && ImplicitlyVersion2(d);
}

function ImplicitlyVersion2(d: any): boolean {
    return isArrayOfStrings(d?.records);
}

function ImplicitlyVersion1(d: any): boolean {
    return isArrayOfObjects(d?.records);
}

export class EIconStore {
    private lookup: string[] = [];

    private asOfTimestamp = 0;

    private updater = new EIconUpdater();

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

    private getStoreFilename(): string {
        const baseDir = remote.app.getPath('userData');
        const settingsDir = path.join(baseDir, 'data');

        if (CURRENT_STORE_VERSION)
            return path.join(settingsDir, `eicons-${CURRENT_STORE_VERSION}.json`);
        else
            return path.join(settingsDir, 'eicons.json');
    }

    private async downloadAll(): Promise<void> {
        log.info('eicons.downloadAll');

        const data = await this.updater.fetchAll();

        this.lookup = data.eicons;

        this.asOfTimestamp = data.asOfTimestamp;

        await this.save();

        this.shuffle();
    }

    async checkForUpdates(force?: boolean): Promise<void> {
        if (!this.asOfTimestamp || !this.lookup.length || force)
            await this.downloadAll();
        else
            await this.update();
    }

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

    private addIcons(additions: string[]): void {
        this.lookup.push(...additions.filter(e => !this.lookup.includes(e)));
    }

    private removeIcons(removals: string[]): void {
        this.lookup = this.lookup.filter(e => !removals.includes(e));
    }

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

    async shuffle(): Promise<void> {
        await FisherYatesShuffle(this.lookup);
    }

    nextPage(amount: number = 0): string[] {
        return Rotate(this.lookup, amount || EICON_PAGE_RESULTS_COUNT);
    }

    private static sharedStore: EIconStore | undefined;

    static async getSharedStore(): Promise<EIconStore> {
        if (!EIconStore.sharedStore) {
            EIconStore.sharedStore = new EIconStore();

            await EIconStore.sharedStore.load();

            setInterval(() => EIconStore.sharedStore!.checkForUpdates(), UPDATE_FREQUENCY);
        }

        return EIconStore.sharedStore;
    }
}
