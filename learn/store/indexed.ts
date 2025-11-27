// SPDX-License-Identifier: AGPL-3.0-or-later
import {Character as ComplexCharacter, CharacterGroup, Guestbook} from '../../site/character_page/interfaces';
import { CharacterAnalysis } from '../matcher';
import { CharacterOverrides } from '../../fchat/characters';
import { PermanentIndexedStore, ProfileRecord, OverrideRecord, CharacterOverridesBatch } from './types';
import { CharacterImage, SimpleCharacter } from '../../interfaces';
import core from './worker/slimcore';
import { deepEqual } from '../../helpers/utils';

/**
 * Fancy way to turn callback-style async into promise-style async.
 * @param req Request you're awaiting.
 * @returns Promise containing `result` from onsuccess() or `error` from onerror()
 */
async function promisifyRequest<T>(req: IDBRequest): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(<T>req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Worker-side of the threaded store.
 * See WorkerStore for renderer-side.
 */
export class IndexedStore implements PermanentIndexedStore {
    protected dbName: string;
    protected db: IDBDatabase;

    protected static readonly STORE_NAME = 'profiles';
    protected static readonly LAST_FETCHED_INDEX_NAME = 'idxLastFetched';
    protected static readonly AUX_STORE_NAME = 'overrides';

    constructor(db: IDBDatabase, dbName: string) {
        this.dbName = dbName;
        this.db = db;
    }

    static async open(dbName: string = 'flist-ascending-profiles'): Promise<IndexedStore> {
        // v3 = last Rising version
        const request = indexedDB.open(dbName, 3);

        request.onupgradeneeded = async event => {
            const db = request.result;

            if (!db.objectStoreNames.contains(IndexedStore.STORE_NAME)) {
                db.createObjectStore(IndexedStore.STORE_NAME, { keyPath: 'id' });
            }

            // technically v4 "upgrade"
            if (!db.objectStoreNames.contains(IndexedStore.AUX_STORE_NAME)) {
                db.createObjectStore(IndexedStore.AUX_STORE_NAME, { keyPath: 'id' });
                const store = request.transaction!.objectStore(IndexedStore.AUX_STORE_NAME);

                store.createIndex(
                    IndexedStore.LAST_FETCHED_INDEX_NAME,
                    'lastFetched', {
                        unique: false,
                        multiEntry: false
                   }
                );

                // Upgrading Gender -> Gender[] in profile storage?
                // Thankfully we don't need to; gender from the store isn't used anywhere, so we can only use new gender arrays and wait for cache expiry to remove the old ones. TIME solves all problems. :)
            }

            if (event.oldVersion < 2) {
                const store = request.transaction!.objectStore(IndexedStore.STORE_NAME);

                store.createIndex(
                    IndexedStore.LAST_FETCHED_INDEX_NAME,
                    'lastFetched',
                  {
                      unique: false,
                      multiEntry: false
                  }
                );
            }

            if (event.oldVersion < 3) {
                const store = request.transaction!.objectStore(IndexedStore.STORE_NAME);
                const req = store.clear();

                await promisifyRequest(req);
            }
        };

        return new IndexedStore(await promisifyRequest<IDBDatabase>(request), dbName);
    }


    // tslint:disable-next-line prefer-function-over-method
    protected toProfileId(name: string): string {
        return name.toLowerCase();
    }


    async getProfile(name: string): Promise<ProfileRecord | undefined> {
        const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readonly');
        const store = tx.objectStore(IndexedStore.STORE_NAME);
        const getRequest = store.get(this.toProfileId(name));

        // tslint:disable-next-line no-any
        const data = await promisifyRequest<ProfileRecord | undefined>(getRequest);

        if (!data) {
            // console.info('IDX empty profile', name);
            return;
        }

        // tslint:disable-next-line: no-unsafe-any
        data.profileData = data.profileData as ComplexCharacter;

        // fix to clean out extra customs that somehow sometimes appear:
        if (Array.isArray(data.profileData.character.customs)) {
            console.warn('character.customs.strange.indexed.getProfile', {name: data.profileData.character.name, data, customs: data.profileData.character.customs});

            data.profileData.character.customs = {};

            await this.storeProfile(data.profileData);
        }

        // console.log('IDX profile', name, data);

        return data as ProfileRecord;
    }


    private async prepareProfileData(c: ComplexCharacter): Promise<ProfileRecord> {
        const existing = await this.getProfile(c.character.name);
        const overrides = core.characters.get(c.character.name).overrides;

        if (Object.keys(overrides).length)
            console.debug('Using overrides in indexed:', overrides);

        const ca = new CharacterAnalysis(c.character, overrides);

        // fix to clean out extra customs that somehow sometimes appear:
        if (Array.isArray(c.character.customs) || (c.character.customs !== null && !(typeof c.character.customs === 'object'))) {
            console.debug('character.customs.strange.indexed.prepareProfileData', {name: c.character.name, c, customs: c.character.customs});
            c.character.customs = {};
        }

        const data: ProfileRecord = {
            id: this.toProfileId(c.character.name),
            name: c.character.name,
            profileData: c,
            firstSeen: Math.round(Date.now() / 1000),
            lastFetched: Math.round(Date.now() / 1000),
            gender: ca.gender,
            orientation: ca.orientation,
            furryPreference: ca.furryPreference,
            species: ca.species,
            age: ca.age,
            domSubRole: ca.subDomRole, // domSubRole
            position: ca.position, // position

            lastMetaFetched: null,
            guestbook: null,
            images: null,
            friends: null,
            groups: null
        };

        if (!existing)
            return data;

        // What does the first dump of existing do?? It seems like all modern data in the structure is going to get overwritten. But residual ancient data still persists?
        const { firstSeen, lastMetaFetched, guestbook, images, friends, groups } = existing;
        return  { ...existing, ...data, firstSeen, lastMetaFetched, guestbook, images, friends, groups };
    }


    async storeProfile(character: ComplexCharacter): Promise<void> {
        const data = await this.prepareProfileData(character);

        const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readwrite');
        const putRequest = tx.objectStore(IndexedStore.STORE_NAME).put(data);

        // tslint:disable-next-line no-any
        await promisifyRequest(putRequest);

        // console.log('IDX store profile', c.character.name, data);
    }

    async getOverrides(name: string): Promise<OverrideRecord | undefined> {
        const tx = this.db.transaction(IndexedStore.AUX_STORE_NAME, 'readonly');
        const getRequest = tx.objectStore(IndexedStore.AUX_STORE_NAME)
            .get(this.toProfileId(name));

        try {
            const data = await promisifyRequest<OverrideRecord | undefined>(getRequest);
            if (!data)
                return;

            const output = {
                id: data.id,
                ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
                ...(data.gender    && { gender:    data.gender    }),
                ...(data.status    && { status:    data.status    }),
                lastFetched: data.lastFetched,
            }

            const o = core.characters.get(name.toLowerCase()).overrides;
            if (data.avatarUrl) o.avatarUrl = data.avatarUrl;
            if (data.gender)    o.gender    = data.gender;
            if (data.status)    o.status    = data.status;

            // Save character overrides.

            return output;
        }
        catch {
            return; // Don't need errors.
        }
    }

    async getOverridesBatch(names: string[]): Promise<CharacterOverridesBatch> {
        const tx = this.db.transaction(IndexedStore.AUX_STORE_NAME, 'readonly');
        const store = tx.objectStore(IndexedStore.AUX_STORE_NAME);

        // Considered:
        // const requests = names.map(n => promisifyRequest<CharacterOverrides>(store.get(n)));
        // const results = await Promise.allSettled(requests);
        // ...but then looping results and mapping to names by index... seems sketch.

        const results: CharacterOverridesBatch = {};

        const tasks = names.map(async name => {
            try {
                const or = await promisifyRequest<OverrideRecord | undefined>(store.get(this.toProfileId(name)));
                if (or) {
                    const { id, lastFetched, ...rest } = or;

                    if (Object.keys(rest).length)
                        results[name] = rest;
                }
            }
            catch { /* Devoured. */ }
        });

        await Promise.allSettled(tasks);

        Object.entries(results).forEach(r => {
            const o = core.characters.get(r[0]).overrides;
            if (r[1].avatarUrl) o.avatarUrl = r[1].avatarUrl;
            if (r[1].gender)    o.gender    = r[1].gender;
            if (r[1].status)    o.status    = r[1].status;
        })



        return results;
    };

    async storeOverrides(name: string, overrides: CharacterOverrides): Promise<void> {
        const existing_overrides = core.characters.get(name).overrides;

        if (deepEqual(existing_overrides, overrides)) {
            console.debug('Storing same overrides? Aborting.', {
                existing_overrides,
                overrides,
            });
            return;
        }

        // prepare()
        const o: OverrideRecord = {
            ...overrides,
            id: this.toProfileId(name),
            lastFetched: Math.round(Date.now() / 1000),
        }

        const tx = this.db.transaction(IndexedStore.AUX_STORE_NAME, 'readwrite');
        const auxRequest = tx.objectStore(IndexedStore.AUX_STORE_NAME)
            .put(o);

        await promisifyRequest<void>(auxRequest);
    }

    // async updateProfileCounts(
    //     name: string,
    //     guestbookCount: number | null,
    //     friendCount: number | null,
    //     groupCount: number | null
    // ): Promise<void> {
    //     const existing = await this.getProfile(name);
    //
    //     if (!existing) {
    //         return;
    //     }
    //
    //     const data = _.merge(
    //         existing,
    //         {
    //             lastCounted: Math.round(Date.now() / 1000),
    //             guestbookCount,
    //             friendCount,
    //             groupCount
    //         }
    //     );
    //
    //     const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readwrite');
    //     const store = tx.objectStore(IndexedStore.STORE_NAME);
    //     const putRequest = store.put(data);
    //
    //     // tslint:disable-next-line no-any
    //     await promisifyRequest<any>(putRequest);
    //
    //     // console.log('IDX update counts', name, data);
    // }

    async updateProfileMeta(
        name: string,
        images: CharacterImage[] | null,
        guestbook: Guestbook | null,
        friends: SimpleCharacter[] | null,
        groups: CharacterGroup[] | null
    ): Promise<void> {
        const existing = await this.getProfile(name);

        if (!existing) {
            return;
        }

        const data = {
            ...existing,
            lastMetaFetched: Math.round(Date.now() / 1000),
            guestbook,
            friends,
            groups,
            images
        };

        const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IndexedStore.STORE_NAME);
        const putRequest = store.put(data);

        // tslint:disable-next-line no-any
        await promisifyRequest<any>(putRequest);

        // console.log('IDX update counts', name, data);
    }

    async start(): Promise<void> {
        // empty
    }

    async stop(): Promise<void> {
        // empty
    }


    async flushProfiles(daysToExpire: number): Promise<void> {
        const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IndexedStore.STORE_NAME);
        const idx = store.index(IndexedStore.LAST_FETCHED_INDEX_NAME);

        //const totalRecords = await promisifyRequest<number>(store.count());

        const expirationTime = Math.round(Date.now() / 1000) - (daysToExpire * 24 * 60 * 60);
        const getAllKeysRequest = idx.getAllKeys(IDBKeyRange.upperBound(expirationTime));
        const result = await promisifyRequest<IDBValidKey[]>(getAllKeysRequest);

        //log.verbose('character.cache.expire', {daysToExpire, totalRecords, removableRecords: result.length});

        return new Promise(
          (resolve, reject) => {
            const gen = (index: number): void => {
                if(index >= result.length) {
                    resolve();
                    return;
                }

                const pk = result[index];
                //log.silly('character.cache.expire.name', { name: pk });

                const req = store.delete(pk);

                req.onsuccess = () => gen(index + 1);
                req.onerror = reject;
            };

            gen(0);
          }
        );
    }

    /**
     * Currently, we don't flush overrides. What's the point? They don't take remotely as much space as a full profile, and we store ~3000 profiles in <100MB.
     * @param daysToExpire Purge older than this many days.
     */
    async flushOverrides(daysToExpire: number): Promise<void> {
        const tx = this.db.transaction(IndexedStore.STORE_NAME, 'readwrite');
        const store = tx.objectStore(IndexedStore.STORE_NAME);
        const idx = store.index(IndexedStore.LAST_FETCHED_INDEX_NAME);

        const expiration = Math.round(Date.now() / 1000) - (daysToExpire * 24 * 60 * 60);
        const getAllKeysRequest = idx.getAllKeys(IDBKeyRange.upperBound(expiration));
        const keys = await promisifyRequest<IDBValidKey[]>(getAllKeysRequest);

        await Promise.all(keys.map(k => promisifyRequest<void>(store.delete(k))))
    }
}
