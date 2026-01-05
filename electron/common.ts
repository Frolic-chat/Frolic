import * as electron from 'electron';
import * as path from 'path';

import * as FLIST from '../constants/flist';

import { LevelOption as LogLevelOption } from 'electron-log';

function getDefaultLanguage(): string {
    try {
        return (electron.app.getLocale() || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || process.env.LANGUAGE || 'en-GB')
            .replace(/[.:].*/, '');
    } catch (err) {
        return 'en-GB';
    }
}

export type GeneralSettingsUpdate = {
    settings:  GeneralSettings,
    timestamp: number,
    character: string | undefined,
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
    risingSystemLogLevel: LogLevelOption = 'info';
    risingDisableWindowsHighContrast: boolean =  false;
    browserPath: string = '';
    browserArgs: string = '%s';
    browserIncognitoArg: string = '';
    defaultToHome: boolean = true;
    profileCacheEntries: number = 1000;
    widgets = {
        inbox:       true,  // Display of notes from site
        scratchpad:  true,  // Text box for player notes
        events:      true,  // Important player events such as rare friend sighting
        news:        true,  // News from the client
        suggestions: false, // Profile helper suggestions
        activity:    true,  // Small console with recent friend/bookmark activity
        match:       true,  // High quality match
    };
    argv: string[] = [];
}

export type LogType =
    | 'main'    | 'core'
    | 'index'   | 'chat'    | 'home'
    | 'connection'  | 'websocket'   | 'conversation'
    | 'settings'    | 'settings-minor'
    | 'worker'  | 'matcher' | 'rtb' | 'cache'
    | 'site-session' | 'devtools'
    | 'ads' | 'filters' | 'profile-helper'
    | 'character-sheet' | 'search'  | 'eicons'
    | 'activity'    | 'collapse'
    | 'memo'    | 'updater' | 'scratchpad'
    | 'logs'    | 'notes'   | 'browser' | 'dictionary'
    | 'user-menu'   | 'chat'    | 'widgets' | 'bbcode'
    | 'custom-gender'   | 'virtual-scroller'
    | 'utils' // This one is bad, but no idea how to fit.
;
