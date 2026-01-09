// SPDX-License-Identifier: AGPL-3.0-or-later
export type ProfileStoreCommand =
  | 'init'          | 'start'               | 'stop'
  | 'update-meta'
  | 'get-profile'   /*| 'get-profile-batch'*/   | 'store-profile'   | 'flush-profiles'
  | 'get-overrides' | 'get-overrides-batch' | 'store-overrides' | 'flush-overrides';

  export type ProfileStoreRequest = IndexedRequest<ProfileStoreCommand>;

export interface IndexedRequest<T> {
  cmd: T;
  id: string;
  params: Record<string, any>;
}

export interface WaiterDef<T> {
  id: string;
  resolve(result?: any): void;
  reject(result?: any): void;
  initiated: number;
  request: IndexedRequest<T>;
}

export interface IndexedResponse {
  id: string;
  type: 'event' | 'res';
  state: 'err' | 'ok';
  result?: any;
  msg?: string;
}
