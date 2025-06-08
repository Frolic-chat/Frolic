import * as qs from 'querystring';
import Logger from 'electron-log/renderer';
const log = Logger.scope('browser_option');
import { LevelOption as LogLevelOption } from 'electron-log';

import {GeneralSettings} from './common';
import BrowserOption from './BrowserOption.vue';

log.info('init.browser_option');

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
const settings = <GeneralSettings>JSON.parse(params['settings']!);

const logLevel: LogLevelOption = 'warn';
Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;

log.info('init.browser_option.vue');

new BrowserOption({
    el: '#browserOption',
    data: {settings}
});

log.debug('init.browser_option.vue.done');
