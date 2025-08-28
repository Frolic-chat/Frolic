// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * @license
 * This file is part of Frolic!
  * Copyright (C) 2019 F-Chat Rising Contributors, 2025 Frolic Contributors listed in `COPYING.md`
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program; if not, see <https://www.gnu.org/licenses>.
 *
 * This license header applies to this file and all of the non-third-party assets it includes.
 * @file The entry point for the store worker thread of Frolic.
 * @copyright 2021 F-Chat Rising Contributors, 2025 Frolic Contributors
 * @author F-Chat Rising Contributors, Frolic Contributors
 * @version 0.7.10
 * @see {@link https://github.com/frolic-chat/frolic|GitHub repo}
 */
import { IndexedStore } from '../indexed';
import { IndexedRequest, ProfileStoreCommand } from './types';

type IndexedCallback = (params: Record<string, any>) => Promise<any>;

let indexed: IndexedStore;

const reply = (req: IndexedRequest, result?: any, err?: string | Error): void => {
  const res: any = {
    type: 'res',
    id: req.id,
    state: err ? 'err' : 'ok',
    result
  };

  if (err) {
    console.error('store.worker.endpoint.error', err);
    res.msg = typeof err === 'string' ? err : err.message;
  }

  // log.debug('store.worker.endpoint.reply', { req, res });

  postMessage(res);
};


const generateMessageProcessor = () => {
  const messageMapper: Record<ProfileStoreCommand, IndexedCallback> = {
    flush: (params: Record<string, any>) => indexed.flushProfiles(params.daysToExpire),
    start: () => indexed.start(),
    stop: () => indexed.stop(),
    get: (params: Record<string, any>) => indexed.getProfile(params.name),
    store: (params: Record<string, any>) => indexed.storeProfile(params.character),

    'update-meta': (params: Record<string, any>) =>
      indexed.updateProfileMeta(params.name, params.images, params.guestbook, params.friends, params.groups),

    init: async(params: Record<string, any>): Promise<void> => {
      indexed = await IndexedStore.open(params.dbName);
    }
  };

  return async(e: Event) => {
    // log.silly('store.worker.endpoint.msg', { e });

    const req = (e as any).data as IndexedRequest;

    if (!req) {
      return;
    }

    if (!(req.cmd in messageMapper)) {
      reply(req, undefined, 'unknown command');
      return;
    }

    try {
      const result = await messageMapper[req.cmd](req.params);
      reply(req, result);
    } catch(err) {
      reply(req, undefined, <Error | string>err);
    }
  };
};


onmessage = generateMessageProcessor();
