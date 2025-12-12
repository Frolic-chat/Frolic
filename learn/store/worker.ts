// SPDX-License-Identifier: AGPL-3.0-or-later
import {Character as ComplexCharacter, CharacterGroup, Guestbook} from '../../site/character_page/interfaces';
import { PermanentIndexedStore, ProfileRecord, OverrideRecord, CharacterOverridesBatch } from './types';
import { CharacterImage, SimpleCharacter } from '../../interfaces';
import { CharacterOverrides } from '../../fchat/characters';

import { WorkerClient } from './worker/client';

import core from '../../chat/core';

import NewLogger from '../../helpers/log';
const log = NewLogger('worker', () => core.state.generalSettings.argv.includes('--debug-worker'));
const logC = NewLogger('worker', () => core.state.generalSettings.argv.includes('--debug-custom-gender'));


/**
 * Renderer-side of the threaded store.
 * See IndexedStore for worker-side.
 */
export class WorkerStore implements PermanentIndexedStore {
    // @ts-ignore
    private _isVue = true;

    protected readonly workerClient: WorkerClient;

    constructor(jsEndpointFile: string) {
      this.workerClient = new WorkerClient(jsEndpointFile);
    }


    static async open(jsEndpointFile: string, dbName?: string): Promise<WorkerStore> {
      const store = new WorkerStore(jsEndpointFile);

      await store.workerClient.request('init', { dbName });

      return store;
    }


    async getProfile(name: string): Promise<ProfileRecord | undefined> {
        const record: ProfileRecord | undefined = await this.workerClient.request('get-profile', { name });

        // fix custom kinks to prevent hangs

        if (record && Array.isArray(record.profileData.character.customs)) {
            log.warn('character.customs.strange.worker.getProfile', {name: record.profileData.character.name, record, customs: record.profileData.character.customs});

            // fix customs because it will crash the client
            const customsObject: ProfileRecord['profileData']['character']['customs'] = {};

            console.warn(`Fixing broken customs object for ${record.name}:`, record.profileData.character.customs);

            for (const [key, value] of Object.entries(record.profileData.character.customs)) {
                if (value !== undefined) customsObject[key] = value;
            }

            record.profileData.character.customs = customsObject;

            await this.storeProfile(record.profileData);
        }

        logC.silly(`get Profile request for ${name}`);

        return record;
    }

    async storeProfile(character: ComplexCharacter): Promise<void> {
        return this.workerClient.request('store-profile', { character });
    }

    async getOverrides(name: string): Promise<OverrideRecord | undefined> {
        const record: OverrideRecord = await this.workerClient.request('get-overrides', { name });

        logC.debug('get Overrides request', { name, record });

        return record;
    }

    async getOverridesBatch(names: string[]): Promise<CharacterOverridesBatch> {
        const record: CharacterOverridesBatch = await this.workerClient.request('get-overrides-batch', { names });

        logC.debug('get Overrides batch request', { names, record });

        return record;
    };

    /**
     * Under what conditons do we store the overrides? How do we tell they're recent? If they're not from cache, presumably.
     * @param name
     * @param overrides
     * @returns
     */
    async storeOverrides(name: string, overrides: CharacterOverrides): Promise<void> {
        const filtered = Object.fromEntries(
            Object.entries(overrides).filter(([_, v]) => v !== undefined)
        );

        logC.debug('store Overrides request', { overrides, filtered });

        if (Object.keys(filtered).length)
            return this.workerClient.request('store-overrides', { name, overrides: filtered });
    }

    async updateProfileMeta(
        name: string,
        images: CharacterImage[] | null,
        guestbook: Guestbook | null,
        friends: SimpleCharacter[] | null,
        groups: CharacterGroup[] | null
    ): Promise<void> {
      return this.workerClient.request('update-meta', { name, images, guestbook, friends, groups });
    }

    async start(): Promise<void> {
        return this.workerClient.request('start');
    }

    async stop(): Promise<void> {
        // This never actually executed any code:
        //return this.workerClient.request('stop');

        // Unfortunately, this initial webworker for some reason is the worker that handles various data requests. Removing it causes breakage of the bookmarks and friends lists. The breakage *seems to be* a race-condition, so it may not always be apparent that it's broken or that you've fixed it.
        // Once that's fixed, we can shut down the extra webworker when shutting down the core. Re-enable the below `stop()` to do that.
        //this.workerClient.stop();
    }


    async flushProfiles(daysToExpire: number): Promise<void> {
        return this.workerClient.request('flush-profiles', { daysToExpire });
    }

    async flushOverrides(daysToExpire: number): Promise<void> {
        return this.workerClient.request('flush-overrides', { daysToExpire });
    }
}
