import { IndexedRequest, IndexedResponse, WaiterDef } from './types';

import NewLogger from '../../../helpers/log';
const log = NewLogger('worker');

export class WorkerClient<CommandType> {
  // @ts-ignore
  private _isVue = true;

  private readonly worker: Worker;

  private idCounter = 0;

  private waiters: WaiterDef<CommandType>[] = [];

  constructor(jsFile: string) {
    this.worker = new Worker(jsFile);
    this.worker.onmessage = this.generateMessageProcessor();
  }


  private generateId(): string {
    this.idCounter++;

    return `wc-${this.idCounter}`;
  }


  private when(id: string, resolve: (result?: any) => void, reject: (reason?: any) => void, request: IndexedRequest<CommandType>): void {
    this.waiters.push({ id, resolve, reject, request, initiated: Date.now() });
  }

  // @ts-ignore `TS2315: Type 'MessageEvent' is not generic.` in webpack TS.
  private generateMessageProcessor(): (e: MessageEvent<IndexedResponse>) => void {
    return e => {
      const res = e.data;

      if (!res) { // A crime happened here.
        log.error('store.worker.client.msg.invalid', { res });
        return;
      }

      const waiter = this.waiters.find(w => w.id === res.id);

      if (!waiter) {
        log.error('store.worker.client.msg.unknown', { res });
        return;
      }

      if (res.state === 'ok') {
        log.silly('store.worker.client.msg.timer', {
          t: Date.now() - waiter.initiated / 1000,
          req: waiter.request,
          res,
        });

        waiter.resolve(res.result);
      }
      else {
        log.error('store.worker.client.msg.err', {
          t: (Date.now() - waiter.initiated) / 1000,
          msg: res.msg,
          req: waiter.request,
        });

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

  /**
   * Async handlers; the waiters handle caching of the resolve/reject code and the promise remains unresolved until the thread responds. In effect, we handle the thread like other async code.
   * @param cmd
   * @param params
   * @returns
   */
  async request(cmd: CommandType, params: Record<string, any> = {}): Promise<any> {
    const id = this.generateId();

    const request: IndexedRequest<CommandType> = {
      cmd, id, params,
    };

    return new Promise(
      (resolve, reject) => {
        try {
          this.when(id, resolve, reject, request);
          this.worker.postMessage(request);
        }
        catch (err) {
          reject(err);
          this.clearWaiter(id);
        }
      }
    );
  }

  stop() {
    this.worker.terminate();
  }
}
