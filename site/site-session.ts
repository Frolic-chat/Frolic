import throat from 'throat';
import request from 'request-promise';
import { Response } from 'request';

import { NoteChecker } from './note-checker';
import { Domain as FLIST_DOMAIN } from '../constants/flist';

import Logger from 'electron-log/renderer';
const log = Logger.scope('site-session');

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
    private account = '';
    private password = '';
    private csrf = '';

    private request = request.defaults({ jar: request.jar() });


    setCredentials(account: string, password: string): void {
        this.account = account;
        this.password = password;
    }


    async start(): Promise<void> {
        try {
            await this.stop();
            await this.init();
            await this.login();

            this.state = 'active';

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


    private async init(): Promise<void> {
        log.debug('sitesession.init');

        this.request = request.defaults({ jar: request.jar() });
        this.csrf = '';

        const res = await this.get('');

        if (res.statusCode !== 200)
            throw new Error(`SiteSession.init: Invalid status code: ${res.statusCode}`);

        if (typeof res.body !== 'string')
            throw new Error(`SiteSession.init: body is type ${typeof res.body}`);

        const input = res.body.match(/<input.*?csrf_token.*?>/);

        if (!input || input.length < 1)
            throw new Error('SiteSession.init: Missing csrf token');

        const csrf = input[0].match(/value="([a-zA-Z0-9]+)"/);

        if (!csrf || csrf.length < 2)
            throw new Error('SiteSession.init: Missing csrf token value');

        this.csrf = csrf[1];
    }


    private async login(): Promise<void> {
        log.debug('sitesession.login');

        if (this.password === '' || this.account === '')
            throw new Error('User credentials not set');

        const res = await this.post(
            'action/script_login.php',
            false,
            {
                followRedirect: false,
                simple: false,
                form: {
                    username: this.account,
                    password: this.password,
                    csrf_token: this.csrf
                },
                // headers: {
                        // Implied
                //     'content-type': 'application/x-www-form-urlencoded'
                // }
            },
        );

        if (res.statusCode !== 302)
            throw new Error('Invalid status code');

        log.debug('sitesession.login.success');
    }


  // tslint:disable-next-line:prefer-function-over-method
    private async ensureLogin(): Promise<void> {
        if (this.state !== 'active')
            throw new Error('Site session not active');
    }


    private prepareRequest(   method: string,
                              uri: string,
                              mustBeLoggedIn: boolean = false,
                              config: Partial<request.Options> = {}
                          ): request.OptionsWithUri {
        if (mustBeLoggedIn)
            this.ensureLogin();

        return {
            ...config,
            method: config.method ?? method,
            uri: FLIST_DOMAIN + uri,
            resolveWithFullResponse: true,
        };
    }


    async get(  uri: string,
                config: Partial<request.Options>
             ): Promise<request.RequestPromise<Response>>;
    async get(  uri: string,
                mustBeLoggedIn?: boolean,
                config?: Partial<request.Options>
             ): Promise<request.RequestPromise<Response>>;
    async get(  uri: string,
                loggedInOrConfig: boolean | Partial<request.Options> = false,
                config: Partial<request.Options> = {}
             ): Promise<request.RequestPromise<Response>> {
        let mustBeLoggedIn: boolean = true;
        let conf: Partial<request.Options>;

        if (typeof loggedInOrConfig === 'boolean') {
            mustBeLoggedIn = loggedInOrConfig;
            conf = config;
        }
        else {
            mustBeLoggedIn = true;
            conf = loggedInOrConfig;
        }

        // TODO: This can/should be fixed by moving to axios or equivalent.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.sessionThroat(
            async () => {
                const finalConfig = this.prepareRequest('get', uri, mustBeLoggedIn, conf);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return this.request(finalConfig);
            }
        );
    }


    async post( uri: string,
                config: Partial<request.Options>
              ): Promise<request.RequestPromise<Response>>;
    async post( uri: string,
                mustBeLoggedIn: boolean,
                config?: Partial<request.Options>
              ): Promise<request.RequestPromise<Response>>;
    async post( uri: string,
                loggedInOrConfig: boolean | Partial<request.Options> = false,
                config: Partial<request.Options> = {}
              ): Promise<request.RequestPromise<Response>> {
        let mustBeLoggedIn: boolean = true;
        let conf: Partial<request.Options>;

        if (typeof loggedInOrConfig === 'boolean') {
            mustBeLoggedIn = loggedInOrConfig;
            conf = config;
        }
        else {
            mustBeLoggedIn = true;
            conf = loggedInOrConfig;
        }

        // TODO: This can/should be fixed by moving to axios or equivalent.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return this.sessionThroat(
            async () => {
                const finalConfig = this.prepareRequest('post', uri, mustBeLoggedIn, conf);

                // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                return this.request(finalConfig);
            }
        );
    }


    async onConnectionClosed(): Promise<void> {
        await this.stop();
    }


    async onConnectionEstablished(): Promise<void> {
        await this.start();
    }
}
