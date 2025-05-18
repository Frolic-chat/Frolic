import * as electron from 'electron';
import * as path from 'path';

import * as FLIST from '../constants/flist';

import ElectronLog from 'electron-log';
const log = ElectronLog.scope('electron/common')

log.debug('init.common');

function getDefaultLanguage(): string {
    try {
        return (electron.app.getLocale() || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || process.env.LANGUAGE || 'en-GB')
            .replace(/[.:].*/, '');
    } catch (err) {
        return 'en-GB';
    }
}

export class GeneralSettings {
    account = '';
    closeToTray = true;
    profileViewer = true;
    host: string = FLIST.DefaultHost;
    logDirectory = path.join(electron.app.getPath('userData'), 'data');
    spellcheckLang: string[] | string | undefined = [getDefaultLanguage()];
    theme: string = FLIST.theme;
    version = electron.app.getVersion();
    beta = false;
    customDictionary: string[] = [];
    hwAcceleration = true;
    risingCacheExpiryDays = 30;
    risingSystemLogLevel: ElectronLog.LevelOption = 'info';
    risingDisableWindowsHighContrast =  false;
    browserPath = '';
    browserArgs = '%s';
}

// //tslint:disable
// const Module = require('module');
//
// export function nativeRequire<T>(module: string): T {
//     return Module.prototype.require.call({paths: Module._nodeModulePaths(__dirname)}, module);
// }
//
// //tslint:enable

log.debug('init.common.done');
