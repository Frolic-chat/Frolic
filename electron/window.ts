import * as qs from 'querystring';

import Logger from 'electron-log/renderer';
const log = Logger.scope('window');
import { LevelOption as LogLevelOption } from 'electron-log';

import {GeneralSettings} from './common';
import { createApp } from 'vue';
import Window from './Window.vue';

log.info('init.window');

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
const settings = <GeneralSettings>JSON.parse(params['settings']!);

const logLevel: LogLevelOption = 'warn';
 Logger.transports.console.level = settings.risingSystemLogLevel || logLevel;

log.info('init.window.vue');

const app = createApp(Window, {});
app.provide('settings', settings);
app.mount('#app');

log.debug('init.window.vue.done');
