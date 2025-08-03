import { EventBus } from '../../../chat/preview/event-bus';
import { IndexedRequest, IndexedResponse, ProfileStoreCommand } from './types';

import Logger from 'electron-log/renderer';
const log = Logger.scope('worker/client');

export interface WaiterDef {
  id: string;
  resolve(result?: any): void;
  reject(result?: any): void;
  initiated: number;
  request: IndexedRequest;
}

export class WorkerClient {
  // @ts-ignore
  private _isVue = true;

  private readonly worker: Worker;

  private idCounter = 0;

  private waiters: WaiterDef[] = [];

  constructor(jsFile: string) {
    this.worker = new Worker(jsFile);
    this.worker.onmessage = this.generateMessageProcessor();
  }


  private generateId(): string {
    this.idCounter++;

    return `wc-${this.idCounter}`;
  }


  private when(id: string, resolve: (result?: any) => void, reject: (reason?: any) => void, request: IndexedRequest): void {
    this.waiters.push({ id, resolve, reject, request, initiated: Date.now() });
  }


  private generateMessageProcessor(): ((e: Event) => void) {
    return (e: Event) => {
      const res = (e as any).data as IndexedResponse;

      // log.silly('store.worker.client.msg', { res });

      if (!res) {
        log.error('store.worker.client.msg.invalid', { res });
        return;
      }

      const waiter = this.waiters.find(w => w.id === res.id);

      if (!waiter) {
        log.error('store.worker.client.msg.unknown', { res });
        return;
      }

      if (res.state === 'ok') {
        const t = Date.now() - waiter.initiated;

        if (t > 200) {
          log.info('store.worker.client.msg.slow', { t: t / 1000, req: waiter.request, res });
        }

        waiter.resolve(res.result);
      } else {
        log.error('store.worker.client.msg.err', { t: (Date.now() - waiter.initiated) / 1000, msg: res.msg, req: waiter.request });
        EventBus.$emit('error', { source: 'store.worker.client', type: typeof res, message: res.msg ?? '' })

        const err = new Error(res.msg);
        waiter.reject(err);
      }

      this.clearWaiter(waiter.id);
    };
  }


  private clearWaiter(id: string): void {
    this.waiters = this.waiters.filter(w => w.id !== id);

    // log.silly('store.worker.waiter.clear', this.waiters.length);
  }


  async request(cmd: ProfileStoreCommand, params: Record<string, any> = {}): Promise<any> {
    const id = this.generateId();

    const request: IndexedRequest = {
      cmd,
      id,
      params,
    };

    return new Promise(
      (resolve, reject) => {
        try {
          this.when(
            id,
            resolve,
            reject,
            request,
          );

          this.worker.postMessage(request);
        }
        catch (err) {
          reject(err);
          this.clearWaiter(id);
        }
      }
    );
  }
}
