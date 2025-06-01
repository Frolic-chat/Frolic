import * as qs from 'querystring';
import ElectronLog from 'electron-log';
const log = ElectronLog.scope('window');

import {GeneralSettings} from './common';
import Window from './Window.vue';

log.info('init.window');

const params = <{[key: string]: string | undefined}>qs.parse(window.location.search.substring(1));
const settings = <GeneralSettings>JSON.parse(params['settings']!);

const logLevel = 'info';

ElectronLog.transports.file.level    = settings.risingSystemLogLevel || logLevel;
ElectronLog.transports.console.level = settings.risingSystemLogLevel || logLevel;
ElectronLog.transports.file.maxSize = 5 * 1024 * 1024;

log.info('init.window.vue');

//tslint:disable-next-line:no-unused-expression
export default new Window({
    el: '#app',
    data: {settings}
});

log.debug('init.window.vue.done');
