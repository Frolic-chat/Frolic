// SPDX-License-Identifier: AGPL-3.0-or-later
export type ProfileStoreCommand =
  | 'init'          | 'start'               | 'stop'
  | 'update-meta'
  | 'get-profile'   /*| 'get-profile-batch'*/   | 'store-profile'   | 'flush-profiles'
  | 'get-overrides' | 'get-overrides-batch' | 'store-overrides' | 'flush-overrides';

export interface IndexedRequest {
  cmd: ProfileStoreCommand;
  id: string;
  params: Record<string, any>;
}

export interface IndexedResponse {
  id: string;
  type: 'event' | 'res';
  state: 'err' | 'ok';
  result?: any;
  msg?: string;
}
