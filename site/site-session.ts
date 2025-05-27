import electronLog from 'electron-log';
const log = electronLog.scope('site-session');

import { NoteChecker } from './note-checker';

import { Domain as FLIST_DOMAIN } from '../constants/flist';

import throat from 'throat';
import request from 'request-promise';
import { Response } from 'request';

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

    private request: request.RequestPromiseAPI = request.defaults({ jar: request.jar() });


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
        catch(err) {
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
        catch(err) {
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

        log.debug('init.debug', { headers: res.headers, code: res.statusCode, body: res.body });

        if (res.statusCode !== 200) {
            throw new Error(`SiteSession.init: Invalid status code: ${res.statusCode}`);
        }

        const input = res.body.match(/<input.*?csrf_token.*?>/);

        if (!input || input.length < 1) {
            throw new Error('SiteSession.init: Missing csrf token');
        }

        const csrf = input[0].match(/value="([a-zA-Z0-9]+)"/);

        if (!csrf || csrf.length < 2) {
            throw new Error('SiteSession.init: Missing csrf token value');
        }

        this.csrf = csrf[1];
    }


    private async login(): Promise<void> {
        log.debug('sitesession.login');

        if (this.password === '' || this.account === '') {
            throw new Error('User credentials not set');
        }

        const res = await this.post(
            'action/script_login.php',
            {
                username: this.account,
                password: this.password,
                csrf_token: this.csrf
            },
            false,
            {
                followRedirect: false,
                simple: false
            }
        );

        log.debug('login.debug', { url: res.request.uri, headers: res.headers, code: res.statusCode, body: res.body });

        if (res.statusCode !== 302) {
            throw new Error(`Invalid status code ${res.statusCode}`);
        }

        log.debug('sitesession.login.success');
    }


  // tslint:disable-next-line:prefer-function-over-method
    private async ensureLogin(): Promise<void> {
        if (this.state !== 'active')
            throw new Error('Site session not active');
    }


    private async prepareRequest(
                                    method: string,
                                    uri: string,
                                    mustBeLoggedIn: boolean,
                                    config: Partial<request.Options>
                                ): Promise<request.OptionsWithUri> {
        if (mustBeLoggedIn) {
            await this.ensureLogin();
        }

        return {
            method,
            uri: FLIST_DOMAIN + uri,
            resolveWithFullResponse: true,
            ...config
        };
  }


    async get(uri: string, mustBeLoggedIn: boolean = false, config: Partial<request.Options> = {}): Promise<request.RequestPromise<Response>> {
        return this.sessionThroat(
            async() => {
                const finalConfig = await this.prepareRequest('get', uri, mustBeLoggedIn, config);

                log.debug('get.debug', finalConfig);

                return this.request(finalConfig);
            }
        );
    }


  async post(   uri: string,
                data: Record<string, any>,
                mustBeLoggedIn: boolean = false,
                config: Partial<request.Options> = {}
            ): Promise<request.RequestPromise<Response>> {
        return this.sessionThroat(
            async() => {
                const finalConfig = await this.prepareRequest('post', uri, mustBeLoggedIn, { form: data, ...config });

                log.debug('post.debug', finalConfig);

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
