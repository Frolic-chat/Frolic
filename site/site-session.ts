import electronLog from 'electron-log';
const log = electronLog.scope('site-session');
import throat from 'throat';
//import * as qs from 'querystring';

import { NoteChecker } from './note-checker';
import { Domain as FLIST_DOMAIN } from '../constants/flist';

import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';
// import { wrapper } from 'axios-cookiejar-support';
// import { CookieJar } from 'tough-cookie';
//import Cookies from 'js-cookie';

/* tslint:disable:no-unsafe-any */

export interface SiteSessionInterface {
    start(): Promise<void>;
    stop(): Promise<void>;
}

export interface SiteSessionInterfaceCollection extends Record<string, SiteSessionInterface> {
    notes: NoteChecker;
}


export class SiteSession {
    private readonly sessionThroat = throat(1);

    readonly interfaces: SiteSessionInterfaceCollection = {
        notes: new NoteChecker(this)
    };

    private state: 'active' | 'inactive' = 'inactive';
    private account:  string = '';
    private password: string = '';
    private csrf:     string = '';

    //private request: request.RequestPromiseAPI = request.defaults({ jar: request.jar() });
    private a: AxiosInstance = axios.create({
        baseURL: FLIST_DOMAIN,
        //baseURL: 'http://localhost:8000',
        allowAbsoluteUrls: true,
        withCredentials: true,
        params: {},
        timeout: 10000,
        maxRedirects: 0,
        adapter: 'fetch',
        //jar: new CookieJar(),
    });

    private request = this.a;
    //private request = wrapper(this.a);


    setCredentials(account: string, password: string): void {
        this.account = account;
        this.password = password;
    }


    //private isActive() { return !!(this.csrf); }

    async start(): Promise<void> {
        this.request.defaults.params = {};
        log.debug('axios.debug.start', { axios: this.request });

        try {
            await this.stop();
            await this.init();
            await this.login();

            this.state = 'active';

            log.debug('start.loggedIn.debug', "This is a break before we start the interfaces.");

            await Promise.all(
                Object.values(this.interfaces).map(i => i.start())
            );
        }
        catch (err) {
            this.state = 'inactive';
            log.error('sitesession.start.error', err);
        }
    }


    async stop(): Promise<void> {
        try {
            await Promise.all(
                Object.values(this.interfaces).map(i => i.stop())
            );
        }
        catch (err) {
            log.error('sitesession.stop.error', err);
        }

        this.csrf = '';
        this.state = 'inactive';
    }


    /**
     * Retrieve the csrf_token from the website.
     * This sets `this.csrf`, necessary for the login stage.
     */
    private async init(): Promise<void> {
        log.debug('sitesession.init');

        // A waste if only called right after stop()
        this.csrf = '';

        const res = await this.request.get('');
        if (res.status !== 200)
            throw new Error(`SiteSession.init: Invalid status code: ${res.status}`);

        const input = res.data.match(/<input.*?csrf_token.*?>/);
        if (!input || input.length < 1)
            throw new Error('SiteSession.init: Missing csrf token');

        const csrf = input[0].match(/value="([a-zA-Z0-9]+)"/);
        if (!csrf || csrf.length < 2)
            throw new Error('SiteSession.init: Missing csrf token value');

        this.csrf = csrf[1];

        log.debug('axios.debug.init', { res });
    }


    /**
     * Use the csrf_token from `init()` and your username
     * and password to retrieve a login cookie.
     */
    private async login(): Promise<void> {
        log.debug('sitesession.login');

        if (this.password === '' || this.account === '')
            throw new Error('User credentials not set');

        // In theory, useless because login() only called after init()
        // if (!this.csrf)
        //     throw new Error('Csrf token unset when it should be.');

        const localr = await this.request.post(
            'http://localhost:8000', {
                username:   this.account,
                password:   this.password,
                csrf_token: this.csrf,
                //roaming:    'on',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        log.verbose('login.info.local', { localr });


        const res = await this.request.post(
            'https://www.f-list.net/action/script_login.php', {
                username:   this.account,
                password:   this.password,
                csrf_token: this.csrf,
                //roaming:    'on',
            },
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
            }
        );

        log.verbose('login.info.flist', { res });

        // const a = new FormData();
        // a.append('username', this.account);
        // a.append('password', "dog's aren't that great~~");
        // a.append('csrf_token', 'ad2fo8ayds8ah457ia582yhahg8ha97psd5agh7pi1gh4a5p2');
        // const re = await axios.post(
        //     'http://localhost:8000',
        //     a,
        //     {
        //         headers: {
        //             'Content-Type': 'application/x-www-form-urlencoded',
        //         },
        //         withCredentials: true,
        //     }
        // );

        //throw new Error('This is just a test.');

        if (res.status !== 302)
            throw new Error(`Invalid status code ${res.status}`);

        log.debug('sitesession.login.success');
    }


  // tslint:disable-next-line:prefer-function-over-method
    private async ensureLogin(): Promise<void> {
        if (this.state !== 'active') {
            throw new Error('Site session not active');
        }
    }


    async get( url: string,
               mustBeLoggedIn: boolean = false,
               config: Partial<AxiosRequestConfig> = {}
             ): Promise<AxiosResponse> {
        if (mustBeLoggedIn)
            await this.ensureLogin();

        log.verbose('siteSession.get.finalConfig', url, config);
        return this.sessionThroat(async() => this.request.get(url, config));
    }


    async post( url: string,
                data: Record<string, any>,
                mustBeLoggedIn: boolean = false,
                config: Partial<AxiosRequestConfig> = {}
              ): Promise<AxiosResponse> {
        if (mustBeLoggedIn)
            await this.ensureLogin();

        log.verbose('siteSession.get.finalConfig', { url, data, config });
        return this.sessionThroat(async() => this.request.post(url, data, config));
    }


    async onConnectionClosed(): Promise<void> {
        await this.stop();
    }


    async onConnectionEstablished(): Promise<void> {
        await this.start();
    }
}
