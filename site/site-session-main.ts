import { IpcRendererEvent } from 'electron';
import electronLog from 'electron-log';
const log = electronLog.scope('site-session-main');
import throat from 'throat';
//import * as qs from 'querystring';

import { NoteChecker } from './note-checker';
import { Domain as FLIST_DOMAIN } from '../constants/flist';

import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
//import Cookies from 'js-cookie';


export class SiteSessionInMain {
    private readonly sessionThroat = throat(1);

    private state: 'active' | 'inactive' = 'inactive';

    private jar = new CookieJar(undefined, { rejectPublicSuffixes: false });

    //private request: request.RequestPromiseAPI = request.defaults({ jar: request.jar() });
    private a: AxiosInstance = axios.create({
        baseURL: FLIST_DOMAIN,
        //baseURL: 'http://localhost:8000',
        allowAbsoluteUrls: true,
        withCredentials: true,
        params: {},
        timeout: 10000,
        maxRedirects: 0,
        adapter: 'http',
        jar: this.jar,
    });
    //private request = this.a;
    private request = wrapper(this.a);

    /** U & P are relevant only to the connection,
     * so they should be stored here.
     */
    private username = '';
    private password = '';
    private csrf_token = '';

    private setCredentials(username: string, password: string): void {
        this.username = username;
        this.password = password;
    }


    //private isActive() { return !!(this.csrf); }


    /**
     * Retrieve the csrf_token from the website.
     * This sets `this.csrf`, necessary for the login stage.
     * @returns {string} the csrf_token
     */
    private async get_csrf_token(): Promise<string> {
        log.debug('sitesession.init');

        const res = await this.request.get('');
        if (res.status !== 200)
            throw new Error(`SiteSession.init: Invalid status code: ${res.status}`);

        const input = res.data.match(/<input.*?csrf_token.*?>/);
        if (!input || input.length < 1)
            throw new Error('SiteSession.init: Missing csrf token');

        const csrf = input[0].match(/value="([a-zA-Z0-9]+)"/);
        if (!csrf || csrf.length < 2)
            throw new Error('SiteSession.init: Missing csrf token value');

        log.debug('axios.debug.init', { input, csrf });

        return csrf[1];
    }


    /**
     * Use the csrf_token from `init()` and your username
     * and password to retrieve a login cookie.
     */
    private async login(event: IpcRendererEvent, login: { username: string, password: string, csrf_token: string, roaming?: 'on' }): Promise<boolean> {
        log.debug('sitesession.login');

        if (login.password === '' || login.username === '')
            throw new Error('User credentials not set');

        const localr = await this.request.post(
            'http://localhost:8000',
            login,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        log.verbose('login.info.local', { localr });

        const res = await this.request.post(
            'https://www.f-list.net/action/script_login.php',
            login,
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );

        this.jar.getCookies(FLIST_DOMAIN)

        log.verbose('login.info.flist', { res });

        if (res.status !== 302)
            throw new Error(`Invalid status code ${res.status}`);

        log.debug('sitesession.login.success');

        return true;
    }


    async get( event: IpcRendererEvent, config: AxiosRequestConfig) {
        return await this.sessionThroat(async() => this.request(config));
    }

    async post( event: IpcRendererEvent, config: AxiosRequestConfig) {
        return await this.sessionThroat(async() => this.request(config));
    }
}
