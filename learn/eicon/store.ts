import _ from 'lodash';

import * as remote from '@electron/remote';

import Logger from 'electron-log/renderer';
const log = Logger.scope('eicon/store');

import * as fs from 'fs';
import * as path from 'path';

import { EIconRecord, EIconUpdater } from './updater';

export class EIconStore {
    protected lookup: Record<string, EIconRecord> = {};

    protected asOfTimestamp = 0;

    protected updater = new EIconUpdater();

    async save(): Promise<void> {
        const fn = this.getStoreFilename();
        const recordArray = Object.values(this.lookup);

        log.info('eicons.save', { records: recordArray.length, asOfTimestamp: this.asOfTimestamp, fn });

        if (recordArray.length > 0) {
            fs.writeFileSync(fn, JSON.stringify({
                asOfTimestamp: this.asOfTimestamp,
                records: recordArray
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
            this.lookup = Object.fromEntries((data?.records || []).map((r: EIconRecord) => [r.eicon, r]));

            const recordCount = Object.keys(this.lookup).length;

            log.info('eicons.loaded.local', { records: recordCount, asOfTimestamp: this.asOfTimestamp });

            await this.update();

            log.info('eicons.loaded.update.remote', { records: recordCount, asOfTimestamp: this.asOfTimestamp });
        }
        catch (err) {
            try {
                await this.downloadAll();
            }
            catch (err2) {
                log.error('eicons.load.failure', { err: err2 });
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

        const eicons = await this.updater.fetchAll();

        this.lookup = Object.fromEntries(eicons.records.map(r => [r.eicon, r]));

        Object.values(eicons.records).forEach(changeRecord => this.addIcon(changeRecord));

        this.asOfTimestamp = eicons.asOfTimestamp;

        await this.save();
    }

    async update(): Promise<void> {
        log.info('eicons.update', { asOf: this.asOfTimestamp });

        const changes = await this.updater.fetchUpdates(this.asOfTimestamp);

        const removals = changes.recordUpdates.filter(changeRecord => changeRecord.action === '-');
        const additions = changes.recordUpdates.filter(changeRecord => changeRecord.action === '+');

        removals.forEach(changeRecord => this.removeIcon(changeRecord));
        additions.forEach(changeRecord => this.addIcon(changeRecord));

        this.asOfTimestamp = changes.asOfTimestamp;

        log.info('eicons.update.processed', { removals: removals.length, additions: additions.length, asOf: this.asOfTimestamp });

        if (changes.recordUpdates.length > 0)
            await this.save();
    }

    protected addIcon(record: EIconRecord): void {
        if (record.eicon in this.lookup) {
            this.lookup[record.eicon].timestamp = record.timestamp;
            return;
        }

        const r = {
            eicon: record.eicon,
            timestamp: record.timestamp
        };

        this.lookup[record.eicon] = r;
    }

  protected removeIcon(record: EIconRecord): void {
        if (!(record.eicon in this.lookup)) {
            return;
        }

        delete this.lookup[record.eicon];
    }

    search(searchString: string): EIconRecord[] {
        const lcSearch = searchString.trim().toLowerCase();
        const found = Object.values(this.lookup).filter(r => r.eicon.indexOf(lcSearch) >= 0);

        return found.sort((a, b) => {
            if (a.eicon.substring(0, lcSearch.length) === lcSearch
             && b.eicon.substring(0, lcSearch.length) !== lcSearch)
                return -1;

            if (b.eicon.substring(0, lcSearch.length) === lcSearch
             && a.eicon.substring(0, lcSearch.length) !== lcSearch)
                return 1;

            return a.eicon.localeCompare(b.eicon);
        });
  }

    random(count: number = 49): EIconRecord[] {
        return Object.values(this.lookup)
                     .sort(() => 0.5 - Math.random())
                     .slice(0, count);
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
