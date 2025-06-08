import * as qs from 'querystring';

import Logger from 'electron-log/renderer';
const log = Logger.scope('window');
import { LevelOption as LogLevelOption } from 'electron-log';

import {GeneralSettings} from './common';
import Window from './Window.vue';

log.info('init.window');

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
const settings = <GeneralSettings>JSON.parse(params['settings']!);

const logLevel: LogLevelOption = 'warn';
 Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;

log.info('init.window.vue');

//tslint:disable-next-line:no-unused-expression
export default new Window({
    el: '#app',
    data: {settings}
});

log.debug('init.window.vue.done');
