import throat from 'throat';
import Bluebird from 'bluebird';
import { IpcMainEvent } from 'electron';

import ElectronLog from 'electron-log'; //tslint:disable-line:match-default-export-name
const log = ElectronLog.scope('ad-host');

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

        await Bluebird.delay(waitTime);

        log.debug('adid.request.host.grant', {adId, sinceLastPost, waitTime});

        event.reply('grant-send-ad', adId);

        this.lastPost = Date.now();
      }
    );
  }
}
