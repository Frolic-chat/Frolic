import * as remote from '@electron/remote';
import log from 'electron-log'; //tslint:disable-line:match-default-export-name
import * as fs from 'fs';
import * as path from 'path';

import { EIconUpdater } from './updater';

const EICON_PAGE_RESULTS_COUNT = 49;

// These funtions are so generic they could be moved to a utils file.

function Rotate<T>(arr: T[], amount: number): T[] {
    const remove = arr.splice(0, amount);

    arr = arr.concat(remove);

    return remove;
}

async function FisherYatesShuffle(arr: any[]): Promise<void> {
    for (let cp = arr.length - 1; cp > 0; cp--) {
        const np = Math.floor(Math.random() * (cp + 1));
        [arr[cp], arr[np]] = [arr[np], arr[cp]];
    }
}

export class EIconStore {
    protected lookup: string[] = [];

    protected asOfTimestamp = 0;

    protected updater = new EIconUpdater();

    async save(): Promise<void> {
        const fn = this.getStoreFilename();

        log.info('eicons.save', { records: this.lookup.length, asOfTimestamp: this.asOfTimestamp, fn });

        if (this.lookup.length > 0) {
            fs.writeFileSync(fn, JSON.stringify({
                asOfTimestamp: this.asOfTimestamp,
                records: this.lookup
            }));
        }

        remote.ipcMain.emit('eicons.reload', { asOfTimestamp: this.asOfTimestamp });
    }

    async load(): Promise<void> {
        const fn = this.getStoreFilename();
        log.info('eicons.load', { fn });

        try {
            const data = JSON.parse(fs.readFileSync(fn, 'utf-8'));

            this.asOfTimestamp = data?.asOfTimestamp || 0;

            /** Handling the old format is a must. */
            if (Array.isArray(data?.records) && typeof data.records[0] === 'object') {
                this.lookup = data.records.map((i: { eicon: string }) => i.eicon);
            }
            else if (Array.isArray(data?.records) && typeof data.records[0] === 'string') {
                this.lookup = data.records;
            }
            else {
                this.lookup = [];
            }

            this.asOfTimestamp = data?.asOfTimestamp || 0;

            if (!this.lookup.length || !this.asOfTimestamp) {
              log.warn('eicons.load.failure.disk', { timestamp: data.asOfTimestamp, data: this.lookup.length });
              throw new Error('Data from disk is strange.');
            }

            const recordCount = this.lookup.length;

            log.verbose('eicons.loaded.local', { records: recordCount, asOfTimestamp: this.asOfTimestamp });

            await this.update();

            log.verbose('eicons.loaded.update.remote', { records: recordCount, asOfTimestamp: this.asOfTimestamp });
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

    protected getStoreFilename(): string {
        const baseDir = remote.app.getPath('userData');
        const settingsDir = path.join(baseDir, 'data');

        return path.join(settingsDir, 'eicons.json');
    }

    async downloadAll(): Promise<void> {
        log.info('eicons.downloadAll');

        const data = await this.updater.fetchAll();

        this.lookup = data.eicons;

        this.asOfTimestamp = data.asOfTimestamp;

        await this.save();

        this.shuffle();
    }

    async update(): Promise<void> {
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

        if (changes.recordUpdates.length > 0)
            await this.save();

        this.shuffle();
    }

    protected addIcons(additions: string[]): void {
        additions.forEach(e => {
            if (!this.lookup.includes(e)) this.lookup.push(e);
        })
    }

    protected removeIcons(removals: string[]): void {
        this.lookup = this.lookup.filter(e => !removals.includes(e));
    }

    search(searchString: string): string[] {
        const query = searchString.trim().toLowerCase();
        const found = this.lookup.filter(e => e.indexOf(query) >= 0);

        const l = query.length;

        return found.sort((a, b) => {
            if (a.substring(0, l) === query
             && b.substring(0, l) !== query)
                return -1;

            if (b.substring(0, l) === query
             && a.substring(0, l) !== query)
                return 1;

            return a.localeCompare(b);
        });
    }

    async shuffle(): Promise<void> {
        await FisherYatesShuffle(this.lookup);
    }

    nextPage(amount: number = 0): string[] {
        return Rotate(this.lookup, amount > 0 ? amount : EICON_PAGE_RESULTS_COUNT);
    }

    private static sharedStore: EIconStore | undefined;

    static async getSharedStore(): Promise<EIconStore> {
        if (!EIconStore.sharedStore) {
            EIconStore.sharedStore = new EIconStore();

            await EIconStore.sharedStore.load();

            setInterval(() => EIconStore.sharedStore!.update(), 60 * 60 * 1000);
        }

        return EIconStore.sharedStore;
    }
}
