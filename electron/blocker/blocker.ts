import Logger from 'electron-log/main';
const log = Logger.scope('blocker');
import { ElectronBlocker, Request } from '@ghostery/adblocker-electron';
// @ts-ignore no-unused-variable
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import * as electron from 'electron';

import lockdownPermissions from '../main/lockdown-permissions';

export class BlockerIntegration {
  protected static readonly adBlockerLists = [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt', // EasyPrivacy
      'https://secure.fanboy.co.nz/fanboy-cookiemonster.txt', // Easy Cookies
      'https://easylist.to/easylist/fanboy-social.txt', // Fanboy Social
      'https://easylist.to/easylist/fanboy-annoyance.txt', // Fanboy Annoyances
      'https://filters.adtidy.org/extension/chromium/filters/2.txt', // AdGuard Base
      'https://filters.adtidy.org/extension/chromium/filters/11.txt', // AdGuard Mobile Ads
      'https://filters.adtidy.org/extension/chromium/filters/4.txt', // AdGuard Social Media
      'https://filters.adtidy.org/extension/chromium/filters/14.txt', // AdGuard Annoyances
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt', // uBlock Origin Annoyances
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt', // uBlock Origin Filters
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt', // uBlock Origin Privacy
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt', // uBlock Origin Badware
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt', // uBlock Origin Resource Abuse
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt' // uBlock Origin Unbreak
  ];

  // tslint:disable-next-line:max-line-length
  constructor(protected readonly baseDir: string, protected readonly blocker?: ElectronBlocker, protected readonly session?: electron.Session) {
    // nothing yet
  }

  static async factory(baseDir: string): Promise<BlockerIntegration> {
    log.debug('adblock.init');

    try {
      const blocker = await ElectronBlocker.fromLists(
          fetch,
          BlockerIntegration.adBlockerLists,
          {
              enableCompression: true
          },
          {
              path: path.join(baseDir, 'adblocker.bin'),
              read: fs.promises.readFile,
              write: fs.promises.writeFile
          }
      );

      log.debug('adblock.load.complete');

      const session = electron.session.fromPartition('persist:adblocked', { cache: true });
      lockdownPermissions(session);

      // Block downloads
      session.on('will-download', e => e.preventDefault());

      log.debug('adblock.session.created');

      blocker.enableBlockingInSession(session);

      log.debug('adblock.enabled');

      BlockerIntegration.configureBlocker(blocker, session);

      log.debug('adblock.session.attached');

      return new BlockerIntegration(baseDir, blocker, session);
    } catch (err) {
        log.warn('adblock.init.error', 'Adblocker failed to initialize.'
            + 'This does not break Frolic, but may produce slower image previews.'
            + 'Please report this as a bug', err);

        return new BlockerIntegration(baseDir);
    }
  }

  protected static configureBlocker(blocker: ElectronBlocker, session: electron.Session): void {

    blocker.blockFonts();

    log.debug('adblock.preloaders', { loaders: session.getPreloadScripts() });

    blocker.on('request-blocked', (request: Request) => {
        log.debug('adblock.request.blocked', { url: request.url });
    });

    blocker.on('request-redirected', (request: Request) => {
        log.debug('adblock.request.redirected', { url: request.url });
    });

    blocker.on('request-whitelisted', (request: Request) => {
        log.debug('adblock.request.whitelisted', { url: request.url });
    });

    blocker.on('csp-injected', (request: Request) => {
        log.debug('adblock.inject.csp', { url: request.url });
    });

    blocker.on('script-injected', (script: string, url: string) => {
        log.debug('adblock.inject.script', { length: script.length, url });
    });

    blocker.on('style-injected', (style: string, url: string) => {
        log.debug('adblock.inject.style', { length: style.length, url });
    });
  }
}
