import electronLog from 'electron-log';
const log = electronLog.scope('site-session');
import throat from 'throat';
//import * as qs from 'querystring';

import { NoteChecker } from './note-checker';

import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from 'axios';

/* tslint:disable:no-unsafe-any */

export interface SiteSessionInterface {
    start(): Promise<void>;
    stop(): Promise<void>;
}

export interface SiteSessionInterfaceCollection extends Record<string, SiteSessionInterface> {
    notes: NoteChecker;
}


export class SiteSession {

    readonly interfaces: SiteSessionInterfaceCollection = {
        notes: new NoteChecker(this)
    };

    private state: 'active' | 'inactive' = 'inactive';
    private account:  string = '';
    private password: string = '';
    private csrf:     string = '';


    setCredentials(account: string, password: string): void {
        this.account = account;
        this.password = password;
    }


    //private isActive() { return !!(this.csrf); }

    async start(): Promise<void> {
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

        // renderer.invoke('get_csrf_token', )

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

        // invoke ('site-session-login', {});

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

        config.url = url;
        config.method = 'get';

        log.verbose('siteSession.get.finalConfig', config);
        // invoke('site-session-get', config);
    }


    async post( url: string,
                data: Record<string, any>,
                mustBeLoggedIn: boolean = false,
                config: Partial<AxiosRequestConfig> = {}
              ): Promise<AxiosResponse> {
        if (mustBeLoggedIn)
            await this.ensureLogin();

        config.url = url;
        config.method = 'post';
        config.data = data;

        log.verbose('siteSession.get.finalConfig', { config });
        // invoke('site-session-post', config);
    }


    async onConnectionClosed(): Promise<void> {
        await this.stop();
    }


    async onConnectionEstablished(): Promise<void> {
        await this.start();
    }
}
