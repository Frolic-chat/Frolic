import * as qs from 'querystring';

import Logger from 'electron-log/renderer';
const log = Logger.scope('window');
import { LevelOption as LogLevelOption } from 'electron-log';

import {GeneralSettings} from './common';
import Window from './Window.vue';

log.verbose('init.window');

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
const settings                = JSON.parse(params['settings']!) as GeneralSettings;
const upgradeRoutineShouldRun = JSON.parse(params['upgradeRoutineShouldRun']!) as boolean;

const logLevel: LogLevelOption = 'warn';
 Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;

log.verbose('init.window.vue');

export default new Window({
    el: '#app',
    data: {
        settings,
        upgradeRoutineShouldRun,
    }
});

log.debug('init.window.vue.done');
