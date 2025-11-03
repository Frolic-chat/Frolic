<template>
    <div @mouseover="onMouseOver" id="page" style="position:relative;padding:5px 10px 10px" :class="getThemeClass()" @auxclick.prevent @click.middle="unpinUrlPreview">
        <div v-html="styling"></div>
        <div v-if="!characters" style="display:flex; align-items:center; justify-content:center; height: 100%;">
            <div class="card bg-light" style="width: 400px;">

                <BBCodeTester v-show="false"></BBCodeTester>

                <h3 class="card-header" style="margin-top:0;display:flex">
                    {{l('title')}}

                    <a href="#" @click.prevent="showLogs()" class="btn" style="flex:1;text-align:right">
                        <span class="fa fa-file-alt"></span>
                        <span class="btn-text">{{l('logs.title')}}</span>
                    </a>
                </h3>
                <div class="card-body">
                    <div class="alert alert-danger" v-show="error">
                        {{error}}
                    </div>
                    <div class="form-group"><!-- account -->
                        <label class="control-label" for="account">{{l('login.account')}}</label>
                        <input class="form-control" id="account" v-model="settings.account" @keypress.enter="login()"
                            :disabled="loggingIn"/>
                    </div>
                    <div class="form-group"><!-- password -->
                        <label class="control-label" for="password">{{l('login.password')}}</label>
                        <input class="form-control" type="password" id="password" v-model="password" @keypress.enter="login()"
                            :disabled="loggingIn"/>
                    </div>
                    <div class="form-group" v-show="showAdvanced">
                        <label class="control-label" for="host">{{l('login.host')}}</label>
                        <div class="input-group">
                            <input class="form-control" id="host" v-model="settings.host" @keypress.enter="login()" :disabled="loggingIn || !allowedToLogin"/>
                            <div class="input-group-append">
                                <button class="btn btn-outline-secondary" @click="resetHost()">
                                    <span class="fas fa-undo-alt"></span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="form-group"><!-- advanced settings -->
                        <label for="advanced">
                            <input type="checkbox" id="advanced" v-model="showAdvanced"/> {{l('login.advanced')}}
                        </label>
                    </div>
                    <div class="form-group"><!-- save login -->
                        <label for="save">
                            <input type="checkbox" id="save" v-model="saveLogin"/> {{l('login.save')}}
                        </label>
                    </div>
                    <div class="form-group" style="margin:0;text-align:right"><!-- login button -->
                        <button v-if="!createHookFinished || tasksStillRunning" key="login-denied" class="btn btn-primary" disabled>
                            <span class="text-center">Loading...</span>
                        </button>

                        <button v-else-if="!fatalError()" key="login" class="btn btn-primary" @click="login" :disabled="loggingIn">
                            {{ l(loggingIn ? 'login.working' : 'login.submit') }}
                        </button>
                    </div>

                    <div class="container form-group loading-block">
                        <login-tasks :tasks="tasks"></login-tasks>
                    </div>
                </div>
            </div>
        </div>
        <chat v-else :ownCharacters="characters" :defaultCharacter="defaultCharacter" ref="chat"></chat>
        <div ref="linkPreview" class="link-preview"></div>
        <modal :action="l('importer.importing')" ref="importModal" :buttons="false">
            <span style="white-space:pre-wrap">{{l('importer.importingNote')}}</span>
            <div class="progress" style="margin-top:5px">
                <div class="progress-bar" :style="{width: importProgress * 100 + '%'}"></div>
            </div>
        </modal>
        <modal :buttons="false" ref="profileViewer" dialogClass="profile-viewer" >
            <character-page :authenticated="true" :oldApi="true" :name="profileName" ref="characterPage"></character-page>
            <template slot="title">
                {{profileName}}
                <a class="btn" @click="openProfileInBrowser"><i class="fa fa-external-link-alt"></i></a>
                <a class="btn" @click="openConversation"><i class="fa fa-comment"></i></a>
                <a class="btn" @click="reloadCharacter"><i class="fa fa-sync"></i></a>

                <i class="fas fa-circle-notch fa-spin profileRefreshSpinner" v-show="isRefreshingProfile()"></i>

                <bbcode :text="profileStatus" v-show="!!profileStatus" class="status-text"></bbcode>

                <div class="profile-title-right">
                  <button class="btn" @click="prevProfile" :disabled="!prevProfileAvailable()"><i class="fas fa-arrow-left"></i></button>
                  <button class="btn" @click="nextProfile" :disabled="!nextProfileAvailable()"><i class="fas fa-arrow-right"></i></button>
                </div>
            </template>
        </modal>
        <modal :action="l('fixLogs.action')" ref="fixLogsModal" @submit="fixLogs" buttonClass="btn-danger">
            <span style="white-space:pre-wrap">{{l('fixLogs.text')}}</span>
            <div class="form-group">
                <label class="control-label">{{l('fixLogs.character')}}</label>
                <select id="import" class="form-control" v-model="fixCharacter">
                    <option v-for="character in fixCharacters" :value="character">{{character}}</option>
                </select>
            </div>
        </modal>
        <modal :buttons="false" ref="wordDefinitionViewer" dialogClass="word-definition-viewer">
            <word-definition :expression="wordDefinitionLookup" ref="wordDefinitionLookup"></word-definition>
            <template slot="title">
                {{wordDefinitionLookup}}
                <a class="btn wordDefBtn dictionary" @click="openDefinitionWithDictionary"><i>D</i></a>
                <a class="btn wordDefBtn thesaurus" @click="openDefinitionWithThesaurus"><i>T</i></a>
                <a class="btn wordDefBtn urbandictionary" @click="openDefinitionWithUrbanDictionary"><i>UD</i></a>
                <a class="btn wordDefBtn wikipedia" @click="openDefinitionWithWikipedia"><i>W</i></a>

                <a class="btn" @click="openWordDefinitionInBrowser"><i class="fa fa-external-link-alt"></i></a>
            </template>
        </modal>
        <logs ref="logsDialog"></logs>
    </div>
</template>

<script lang="ts">
    import { Component, Hook, Watch } from '@f-list/vue-ts';
    import Axios from 'axios';
    import * as electron from 'electron';
    import * as remote from '@electron/remote';

    import electronLog from 'electron-log';
    const log = electronLog.scope('Index');

    import * as fs from 'fs';
    import * as path from 'path';
    import * as qs from 'querystring';
    // import {promisify} from 'util';
    import Vue from 'vue';
    import Chat from '../chat/Chat.vue';
    import { ipcRenderer } from 'electron';
    import { Settings } from '../chat/common';
    import core /*, { init as initCore }*/ from '../chat/core';
    import l from '../chat/localize';
    import Logs from '../chat/Logs.vue';
    import Socket from '../chat/WebSocket';
    import Modal from '../components/Modal.vue';
    import {SimpleCharacter} from '../interfaces';
    // import { BetterSqliteStore } from '../learn/store/better-sqlite3';
    // import { Sqlite3Store } from '../learn/store/sqlite3';
    import CharacterPage from '../site/character_page/character_sheet.vue';
    import WordDefinition from '../learn/dictionary/WordDefinition.vue';
    import ProfileAnalysis from '../learn/recommend/ProfileAnalysis.vue';
    import { default as LoginTasks, Task } from './LoginTasks.vue';
    import {GeneralSettings} from './common';
    import * as FLIST from '../constants/flist';
    import { fixLogs /*SettingsStore, Logs as FSLogs*/ } from './renderer/filesystem';
    import * as SlimcatImporter from './renderer/importer';
    import { EventBus } from '../chat/preview/event-bus';
    import * as ErrorHandler from './error-service';

    import BBCodeTester from '../bbcode/Tester.vue';
    import { BBCodeView } from '../bbcode/view';
    import { EIconStore } from '../learn/eicon/store';

    const webContents = remote.getCurrentWebContents();
    const parent = remote.getCurrentWindow().webContents;

    // Allow requests to imgur.com
    const session = remote.session;

    /* tslint:disable:no-unsafe-any no-any no-unnecessary-type-assertion */
    session.defaultSession.webRequest.onBeforeSendHeaders(
        {
            urls: [ 'https://api.imgur.com/*', 'https://i.imgur.com/*' ],
        },
        (details, callback) => {
            details.requestHeaders['Origin'] = '';
            callback({requestHeaders: details.requestHeaders});
        }
    );

    @Component({
        components: {
            chat: Chat,
            modal: Modal,
            characterPage: CharacterPage,
            logs: Logs,
            'word-definition': WordDefinition,
            BBCodeTester: BBCodeTester,
            bbcode: BBCodeView(core.bbCodeParser),
            'profile-analysis': ProfileAnalysis,
            'login-tasks': LoginTasks,
        }
    })
    export default class Index extends Vue {
        showAdvanced = false;
        saveLogin = false;
        loggingIn = false;
        password = '';
        character?: string;
        characters?: SimpleCharacter[];
        error = '';
        defaultCharacter?: number;
        l = l;

        settings!: GeneralSettings;
        hasCompletedUpgrades!: boolean;

        importProgress = 0;
        profileName = '';
        profileStatus = '';
        adName = '';
        fixCharacters: ReadonlyArray<string> = [];
        fixCharacter = '';
        wordDefinitionLookup = '';

        profileNameHistory: string[] = [];
        profilePointer = 0;

        fatalError(): boolean {
            return Object.values(this.errors).some(v => v.fatal);
        }

        get tasksStillRunning() {
            return this.tasks.some(t => t.running === true);
        }

        get allowedToLogin() {
            log.debug('index.login.allowedCheck', {
                tasks:         this.tasksStillRunning,
                loggingIn:     this.loggingIn,
                fatalError:    this.fatalError(),
                createHookRan: this.createHookFinished,
            });

            return !this.tasksStillRunning
                && !this.loggingIn
                && !this.fatalError()
                && this.createHookFinished;
        }

        createHookFinished: boolean = false;

        tasks: Task[] = [];
        errors = ErrorHandler.store;

        @Watch('profileName')
        onProfileNameChange(newName: string): void {
            if (this.profileNameHistory[this.profilePointer] !== newName) {
                this.profileNameHistory = this.profileNameHistory
                        .slice(0, this.profilePointer + 1)
                        .filter(n => n !== newName)
                        .slice(-30);

                this.profileNameHistory.push(newName);

                this.profilePointer = this.profileNameHistory.length - 1;
            }
        }

        @Hook('mounted')
        onMounted(): void {
            log.debug('init.chat.mounted');

            EventBus.$on('word-definition', event => {
                this.wordDefinitionLookup = event.lookupWord;

                if (event.lookupWord)
                    (<Modal>this.$refs.wordDefinitionViewer).show();
            });
        }

        @Hook('created')
        async created(): Promise<void> {
            // Event bus is supposed to be for only character/cache/preview updates.
            EventBus.$on('error', ErrorHandler.capture);

            await this.start.taskDisplay();

            this.awaitStartUpTask('core',  this.start.cache);
            this.awaitStartUpTask('eicon', this.start.eicons);
            if (this.settings.account)
                this.awaitStartUpTask('index', this.start.restoreLogin);

            parent.send('rising-upgrade-complete');
            electron.ipcRenderer.send('rising-upgrade-complete');
            this.hasCompletedUpgrades = true;

            Vue.set(core.state, 'generalSettings', this.settings);

            await this.start.listeners();

            this.createHookFinished = true;
        }

        async login(): Promise<void> {
            if (!this.allowedToLogin)
                return;

            this.loggingIn = true;

            try {
                if (!this.saveLogin) {
                    await ipcRenderer.invoke('deletePassword', 'f-list-net', this.settings.account);
                }

                core.siteSession.setCredentials(this.settings.account, this.password);

                const data = <{ticket?: string, error: string, characters: {[key: string]: number}, default_character: number}>
                    (await Axios.post('https://www.f-list.net/json/getApiTicket.php', qs.stringify({
                        account: this.settings.account, password: this.password, no_friends: true, no_bookmarks: true,
                        new_character_list: true
                    }))).data;

                if (data.error !== '') {
                    this.error = data.error;
                    return;
                }

                if (this.saveLogin) {
                    electron.ipcRenderer.send('save-login', this.settings.account, this.settings.host);
                    await ipcRenderer.invoke('setPassword', 'f-list.net', this.settings.account, this.password);
                }

                Socket.host = this.settings.host;

                core.connection.onEvent('connecting', async() => {
                    if (!electron.ipcRenderer.sendSync('connect', core.connection.character)) {
                        alert(l('login.alreadyLoggedIn'));
                        return core.connection.close();
                    }

                    parent.send('connect', webContents.id, core.connection.character);
                    this.character = core.connection.character;

                    if ((await core.settingsStore.get('settings')) === undefined &&
                        SlimcatImporter.canImportCharacter(core.connection.character)) {
                        if (!confirm(l('importer.importGeneral')))
                            return core.settingsStore.set('settings', new Settings());

                        (<Modal>this.$refs['importModal']).show(true);

                        await SlimcatImporter.importCharacter(core.connection.character, (progress) => this.importProgress = progress);

                        (<Modal>this.$refs['importModal']).hide();
                    }
                });
                core.connection.onEvent('connected', () => {
                    core.watch(
                        () => core.conversations.hasNew,
                        newValue => parent.send('has-new', webContents.id, newValue),
                    );
                });
                core.connection.onEvent('closed', () => {
                    if (this.character === undefined)
                        return;

                    electron.ipcRenderer.send('disconnect', this.character);
                    this.character = undefined;
                    parent.send('disconnect', webContents.id);
                });

                core.connection.setCredentials(this.settings.account, this.password);

                this.characters = Object.keys(data.characters)
                        .map(name => ({ name, id: data.characters[name], deleted: false }))
                        .sort((x, y) => x.name.localeCompare(y.name));

                this.defaultCharacter = data.default_character;
            }
            catch (e) {
                this.error = l('login.error');
                log.error('connect.error', e);
                if (process.env.NODE_ENV !== 'production')
                    throw e;
            }
            finally {
                this.loggingIn = false;
            }
        }

        fixLogs(): void {
            if (!electron.ipcRenderer.sendSync('connect', this.fixCharacter))
                return alert(l('login.alreadyLoggedIn'));

            try {
                fixLogs(this.fixCharacter);
                alert(l('fixLogs.success'));
            }
            catch(e) {
                alert(l('fixLogs.error'));
                throw e;
            }
            finally {
                electron.ipcRenderer.send('disconnect', this.fixCharacter);
            }
        }

        resetHost(): void {
            this.settings.host = FLIST.DefaultHost;
        }

        onMouseOver(e: MouseEvent): void {
            const preview = (<HTMLDivElement>this.$refs.linkPreview);
            if ((<HTMLElement>e.target).tagName === 'A') {
                const target = <HTMLAnchorElement>e.target;
                if (target.hostname !== '') {
                    //tslint:disable-next-line:prefer-template
                    preview.className = 'link-preview ' +
                        (e.clientX < window.innerWidth / 2 && e.clientY > window.innerHeight - 150 ? ' right' : '');
                    preview.textContent = target.href;
                    preview.style.display = 'block';
                    return;
                }
            }
            preview.textContent = '';
            preview.style.display = 'none';
        }

        async openProfileInBrowser(): Promise<void> {
            electron.ipcRenderer.send('open-url-externally', `https://www.f-list.net/c/${this.profileName}`);

            // tslint:disable-next-line: no-any no-unsafe-any
            (this.$refs.profileViewer as any).hide();
        }

        openConversation(): void {
            const character = core.characters.get(this.profileName);
            const conversation = core.conversations.getPrivate(character);

            conversation.show();

            // tslint:disable-next-line: no-any no-unsafe-any
            (this.$refs.profileViewer as any).hide();
        }


        isRefreshingProfile(): boolean {
          const cp = this.$refs.characterPage as CharacterPage;

          return cp && cp.refreshing;
        }


        reloadCharacter(/* payload: MouseEvent */): void {
            // tslint:disable-next-line: no-any no-unsafe-any
            (this.$refs.characterPage as any).reload(/* payload.shiftKey || payload.button === 2 */);
        }


        getThemeClass(): Record<string, boolean> {
          // console.log('getThemeClassIndex', core.state.generalSettings?.risingDisableWindowsHighContrast);

            try {
            // Hack!
                if (process.platform === 'win32') {
                    if (core.state.generalSettings.risingDisableWindowsHighContrast) {
                        document.querySelector('html')?.classList.add('disableWindowsHighContrast');
                    }
                    else {
                        document.querySelector('html')?.classList.remove('disableWindowsHighContrast');
                    }
                }

                return {
                    [`theme-${core.state.settings.risingCharacterTheme || this.settings.theme}`]: true,
                    colorblindMode: core.state.settings.risingColorblindMode,
                    disableWindowsHighContrast: core.state.generalSettings.risingDisableWindowsHighContrast || false
                };
            }
            catch(err) {
                return { [`theme-${this.settings.theme}`]: true };
            }
        }

        nextProfile(): void {
            if (!this.nextProfileAvailable())
                return;

            this.profilePointer++;

            this.openProfile(this.profileNameHistory[this.profilePointer]);
        }


        nextProfileAvailable(): boolean {
            return (this.profilePointer < this.profileNameHistory.length - 1);
        }


        prevProfile(): void {
            if (!this.prevProfileAvailable()) {
                return;
            }

            this.profilePointer--;

            this.openProfile(this.profileNameHistory[this.profilePointer]);
        }


        prevProfileAvailable(): boolean {
            return (this.profilePointer > 0);
        }

        openProfile(name: string) {
            this.profileName = name;

            const character = core.characters.get(name);

            this.profileStatus = character.statusText || '';
        }

        get styling(): string {
            try {
                return `<style id="themeStyle">${fs.readFileSync(path.join(__dirname, `themes/${((this.character != undefined && core.state.settings.risingCharacterTheme) || this.settings.theme)}.css`), 'utf8').toString()}</style>`;
            }
            catch (e) {
                if ((<Error & { code: string }>e).code === 'ENOENT' && this.settings.theme !== 'default') {
                    this.settings.theme = 'default';
                    return this.styling;
                }

                throw e;
            }
        }

        showLogs(): void {
            (<Logs>this.$refs['logsDialog']).show();
        }


        async openDefinitionWithDictionary(): Promise<void> {
            (this.$refs.wordDefinitionLookup as any).setMode('dictionary');
        }


        async openDefinitionWithThesaurus(): Promise<void> {
            (this.$refs.wordDefinitionLookup as any).setMode('thesaurus');
        }


        async openDefinitionWithUrbanDictionary(): Promise<void> {
            (this.$refs.wordDefinitionLookup as any).setMode('urbandictionary');
        }


        async openDefinitionWithWikipedia(): Promise<void> {
            (this.$refs.wordDefinitionLookup as any).setMode('wikipedia');
        }


        async openWordDefinitionInBrowser(): Promise<void> {
            electron.ipcRenderer.send('open-url-externally', (this.$refs.wordDefinitionLookup as any).getWebUrl());
            //await remote.shell.openExternal((this.$refs.wordDefinitionLookup as any).getWebUrl());

            // tslint:disable-next-line: no-any no-unsafe-any
            (this.$refs.wordDefinitionViewer as any).hide();
        }


        unpinUrlPreview(e: Event): void {
            const imagePreview = (this.$refs['chat'] as Chat)?.getChatView()?.getImagePreview();

            // const imagePreview = this.$refs['imagePreview'] as ImagePreview;

            if (imagePreview?.isVisible() && imagePreview.sticky) {
                e.stopPropagation();
                e.preventDefault();

                EventBus.$emit('imagepreview-toggle-sticky', { force: true });
            }
        }

        start = {
            taskDisplay: async () => {
                if (this.settings.account) {
                    this.tasks.push(
                        { id: 'index', name: 'Restore Password', running: true },
                    );
                }
                this.tasks.push(
                    { id: 'core',  name: 'Core Services', running: true },
                    { id: 'eicon', name: 'Eicon Service',  running: true },
                );
            },
            cache: async () => {
                log.debug('init.chat.cache.start');

                try {
                    await core.cache.start(this.settings, this.hasCompletedUpgrades);
                }
                catch (e) {
                    const msg = typeof e === 'string'
                        ? e : e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
                            ? e.message : '';

                    EventBus.$emit('error', {
                        source:  'core',
                        type:    'cache.start',
                        message: msg,
                        fatal:   true,
                    });
                };

                log.debug('init.chat.cache.done');
            },
            eicons: async () => {
                await EIconStore.getSharedStore(); // intentionally background
                log.debug('init.eicons.update.done');
            },
            listeners: async () => {
                electron.ipcRenderer.on('open-profile', (_e, name: string) => {
                    const profileViewer = <Modal>this.$refs['profileViewer'];

                    this.openProfile(name);

                    profileViewer.show();
                });

                electron.ipcRenderer.on('reopen-profile', _e => {
                    if (this.profileNameHistory.length > 0
                    && this.profilePointer < this.profileNameHistory.length
                    && this.profilePointer >= 0) {
                        const name = this.profileNameHistory[this.profilePointer];
                        const profileViewer = <Modal>this.$refs['profileViewer'];

                        if (this.profileName === name && profileViewer.isShown) {
                            profileViewer.hide();
                            return;
                        }

                        this.openProfile(name);
                        profileViewer.show();
                    }
                });

                electron.ipcRenderer.on('fix-logs', async() => {
                    this.fixCharacters = await core.settingsStore.getAvailableCharacters();
                    this.fixCharacter = this.fixCharacters[0];
                    (<Modal>this.$refs['fixLogsModal']).show();
                });

                electron.ipcRenderer.on('update-zoom', (_e, zoomLevel) => {
                    webContents.setZoomLevel(zoomLevel);
                    // log.info('INDEXVUE ZOOM UPDATE', zoomLevel);
                });

                electron.ipcRenderer.on('active-tab', () => {
                    core.cache.setTabActive(true);
                });

                electron.ipcRenderer.on('inactive-tab', () => {
                    core.cache.setTabActive(false);
                });

                log.debug('init.chat.listeners.done');
            },
            restoreLogin: async () => {
                this.saveLogin = true;
                try {
                    this.password = await ipcRenderer.invoke('getPassword', 'f-list.net', this.settings.account);

                    log.debug('init.chat.keystore.get.done');
                }
                catch (e) {
                    EventBus.$emit('error', {
                        source: 'index',
                        type: 'account.getPassword',
                        message: e && typeof e === 'object'
                            && 'message' in e && typeof e.message === 'string'
                            ? e.message : '',
                    });

                    log.info('init.chat.keystore.get.error');
                }
            }
        };

        async awaitStartUpTask(n: string, f: () => Promise<void>): Promise<boolean> {
            await f();

            // Finished
            const t = this.tasks.find(t => t.id === n);

            if (t) {
                t.running = false;
                //if (this.errors[t.name]) Vue.set(t, 'error', this.errors[t.name]);
                t.error = this.errors[t.id] || undefined;
            }

            return !!t;
        }
    }
</script>

<style lang="scss">
@import "~bootstrap/scss/bootstrap";

    html, body, #page {
        height: 100%;
    }

    a[href^="#"]:not([draggable]) {
        -webkit-user-drag: none;
        -webkit-app-region: no-drag;
    }

    .profileRefreshSpinner {
        font-size: 12pt;
        opacity: 0.5;
    }

    .profile-viewer {
        .modal-title {
            width: 100%;
            position: relative;

            .profile-title-right {
                float: right;
                top: -7px;
                right: 0;
                position: absolute;
            }

            .status-text {
                font-size: 12pt;
                display: block;
                max-height: 3.13em;
                overflow: auto;
            }
        }
    }

    .btn.wordDefBtn {
        background-color: red;
        padding: 0.2rem 0.2rem;
        line-height: 90%;
        margin-right: 0.2rem;
        text-align: center;

        i {
            font-style: normal !important;
            color: white;
            font-weight: bold
        }

        &.thesaurus {
            background-color: #F44725
        }

        &.urbandictionary {
            background-color: #d96a36;

            i {
                color: #fadf4b;
                text-transform: lowercase;
                font-family: monospace;
            }
        }

        &.dictionary {
            background-color: #314ca7;
        }

        &.wikipedia {
            background-color: white;

            i {
                color: black;
                font-family: serif;
            }
        }
    }

    .modal {
        .word-definition-viewer {
            max-width: 50rem !important;
            width: 70% !important;
            min-width: 22rem !important;

            .modal-content {
                min-height: 75%;
            }

            .definition-wrapper {
                position: absolute;
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                margin-left: 20px;
                margin-right: 20px;

                webview {
                    height: 100%;
                    padding-bottom: 10px;
                }
            }
        }
    }

    .disableWindowsHighContrast, .disableWindowsHighContrast * {
        forced-color-adjust: none;
    }
</style>
