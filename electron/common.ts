import * as electron from 'electron';
import * as path from 'path';

import * as FLIST from '../constants/flist';

import ElectronLog from 'electron-log';
const log = ElectronLog.scope('electron/common');

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
    closeToTray: boolean = true;
    profileViewer: boolean = true;
    host: string = FLIST.DefaultHost;
    logDirectory = path.join(electron.app.getPath('userData'), 'data');
    spellcheckLang: string[] | string | undefined = [getDefaultLanguage()];
    theme: string = FLIST.DefaultTheme;
    version = electron.app.getVersion();
    beta = false;
    customDictionary: string[] = [];
    hwAcceleration: boolean = true;
    risingCacheExpiryDays: number = 30;
    risingSystemLogLevel: ElectronLog.LevelOption = 'info';
    risingDisableWindowsHighContrast: boolean =  false;
    browserPath: string = '';
    browserArgs: string = '%s';
}

log.debug('init.common.done');
