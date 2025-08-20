import throat from 'throat';
import { IpcMainEvent } from 'electron';

import { sleep } from '../../helpers/utils';

import Logger from 'electron-log/main';
const log = Logger.scope('AdCoordinatorHost');

const adCoordinatorThroat = throat(1);


export class AdCoordinatorHost {
  static readonly MIN_DISTANCE = 7500;
  private lastPost = Date.now();

  async processAdRequest(event: IpcMainEvent, adId: string): Promise<void> {
    await adCoordinatorThroat(
      async() => {
        const sinceLastPost = Date.now() - this.lastPost;
        const waitTime = Math.max(0, AdCoordinatorHost.MIN_DISTANCE - sinceLastPost);

        log.debug('adid.request.host', {adId, sinceLastPost, waitTime});

        await sleep(waitTime);

        log.debug('adid.request.host.grant', {adId, sinceLastPost, waitTime});

        event.reply('grant-send-ad', adId);

        this.lastPost = Date.now();
      }
    );
  }
}
