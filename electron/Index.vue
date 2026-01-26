<template>
    <div @mouseover="onMouseOver" id="page" style="position:relative; padding:5px 10px 10px" :class="getThemeClass()" @auxclick.prevent @click.middle="unpinUrlPreview">
        <div v-html="styling"></div>
        <div v-if="!characters" style="display:flex; align-items:center; justify-content:center; height: 100%;">
            <div class="card bg-light" style="width: 400px;">

                <bbcode-tester v-show="debugBBCode"></bbcode-tester>

                <h3 class="card-header" style="margin-top:0; display:flex">
                    {{ l('title') }}

                    <a href="#" @click.prevent="showLogs()" class="btn" style="flex:1; text-align:right">
                        <span class="fa fa-file-alt"></span>
                        <span class="btn-text">
                            {{ l('logs.title') }}
                        </span>
                    </a>
                </h3>
                <div class="card-body">
                    <div class="alert alert-danger" v-show="error">
                        {{ error }}
                    </div>
                    <div class="form-group"><!-- account -->
                        <label class="control-label" for="account">
                            {{ l('login.account') }}
                        </label>
                        <input class="form-control" id="account" v-model="settings.account" @keypress.enter="login()"
                            :disabled="loggingIn"/>
                    </div>
                    <div class="form-group"><!-- password -->
                        <label class="control-label" for="password">
                            {{ l('login.password') }}
                        </label>
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
                        <button v-if="!createHookFinished || tasksStillRunning" class="btn btn-primary" disabled>
                            <span class="text-center">Loading...</span>
                        </button>

                        <button v-else-if="!fatalError()" class="btn btn-primary" @click="login" :disabled="loggingIn">
                            {{ l(loggingIn ? 'login.working' : 'login.submit') }}
                        </button>
                    </div>

                    <div class="container form-group loading-block">
                        <div v-if="!createHookFinished || tasksStillRunning" class="my-2">
                            {{ upgradeMessage }}
                        </div>
                        <login-tasks :tasks="tasks"></login-tasks>
                    </div>
                </div>
            </div>
        </div>
        <chat v-else :ownCharacters="characters" :defaultCharacter="defaultCharacter" ref="chat"></chat>
        <div ref="linkPreview" class="link-preview"></div>
        <modal :action="l('importer.importing')" ref="importModal" :buttons="false">
            <span style="white-space:pre-wrap">{{ l('importer.importingNote') }}</span>
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
                    <option v-for="character in fixCharacters" :value="character">
                        {{ character }}
                    </option>
                </select>
            </div>
        </modal>
        <word-definition-viewer></word-definition-viewer>
        <logs ref="logsDialog"></logs>
    </div>
</template>

<script lang="ts">
    import { Component, Hook, Watch } from '@frolic/vue-ts';
    import Vue from 'vue';

    import Chat from '../chat/Chat.vue';
    import Modal from '../components/Modal.vue';
    import CharacterPage from '../site/character_page/character_sheet.vue';
    import Logs from '../chat/Logs.vue';
    import { default as LoginTasks, Task } from './LoginTasks.vue';
    import BBCodeTester from '../bbcode/Tester.vue';
    import WordDefinitionViewer from './WordDefinitionViewer.vue';

    import * as Electron from 'electron';
    import Axios from 'axios';
    import * as fs from 'fs';
    import * as path from 'path';
    import * as qs from 'querystring';

    import core from '../chat/core';
    import l from '../chat/localize';
    import { GeneralSettings } from './common';
    import { Settings } from '../chat/common';
    import Socket from '../chat/WebSocket';
    import {SimpleCharacter} from '../interfaces';
    import * as FLIST from '../constants/flist';
    import EventBus from '../chat/preview/event-bus';
    import { fixLogs } from './renderer/filesystem';
    import * as SlimcatImporter from './renderer/importer';
    import * as ErrorHandler from './error-service';
    import { BBCodeView } from '../bbcode/view';

    import NewLogger from '../helpers/log';
    const log = NewLogger('index');
    const logC = NewLogger('cache');
    // const logBB = NewLogger('bbcode');

    @Component({
        components: {
            chat: Chat,

            bbcode: BBCodeView(core.bbCodeParser),

            modal: Modal,
            'word-definition-viewer': WordDefinitionViewer,
            logs: Logs,
            'character-page': CharacterPage,
            'bbcode-tester': BBCodeTester,

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

        // This data is passed in via new Index() in chat.ts
        settings!: GeneralSettings;
        upgradeRoutineShouldRun!: boolean;

        upgradeMessage = '';
        debugBBCode = false;
        importProgress = 0;
        profileName = '';
        profileStatus = '';
        adName = '';
        fixCharacters: ReadonlyArray<string> = [];
        fixCharacter = '';

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

        @Hook('created')
        async created(): Promise<void> {
            EventBus.$on('error', ErrorHandler.capture);

            this.debugBBCode = this.settings.argv.includes('--debug-bbcode');

            await this.start.taskDisplay();

            if (this.upgradeRoutineShouldRun)
                void this.awaitStartUpTask('core', this.start.cache);

            if (this.settings.account)
                void this.awaitStartUpTask('index', this.start.restoreLogin);

            if (this.upgradeRoutineShouldRun) {
                this.upgradeMessage = 'Version upgrade; this may take a while.';

                // It is pointless to make this wait for anything to actually change; app version is already upgraded to latest in electron main, so we'll never "rerun" an upgrade even if it fails.
                Electron.ipcRenderer.send('rising-upgrade-complete');
                this.upgradeRoutineShouldRun = false;
            }

            await this.start.listeners();

            this.createHookFinished = true;
        }

        async login(): Promise<void> {
            if (!this.allowedToLogin)
                return;

            this.loggingIn = true;

            try {
                if (!this.saveLogin) {
                    log.debug('login.savelogin.deletePassword');
                    await Electron.ipcRenderer.invoke('deletePassword', 'f-list-net', this.settings.account);
                }

                core.siteSession.setCredentials(this.settings.account, this.password);

                const res = await Axios.post('https://www.f-list.net/json/getApiTicket.php', qs.stringify({
                        account: this.settings.account, password: this.password, no_friends: true, no_bookmarks: true,
                        new_character_list: true
                    }));

                const data = res.data as {ticket?: string, error: string, characters: {[key: string]: number}, default_character: number};

                if (data.error !== '') {
                    this.error = data.error;
                    return;
                }

                if (this.saveLogin) {
                    Electron.ipcRenderer.send('save-login', this.settings.account, this.settings.host);
                    await Electron.ipcRenderer.invoke('setPassword', 'f-list.net', this.settings.account, this.password);
                }

                Socket.host = this.settings.host;

                core.connection.onEvent('connecting', async() => {
                    if (!Electron.ipcRenderer.sendSync('connect', core.connection.character)) {
                        alert(l('login.alreadyLoggedIn'));
                        return core.connection.close();
                    }

                    this.character = core.connection.character;

                    if ((await core.settingsStore.get('settings')) === undefined &&
                        SlimcatImporter.canImportCharacter(core.connection.character)) {
                        if (!confirm(l('importer.importGeneral')))
                            return core.settingsStore.set('settings', new Settings());

                        (this.$refs['importModal'] as Modal).show(true);

                        await SlimcatImporter.importCharacter(core.connection.character, (progress) => this.importProgress = progress);

                        (this.$refs['importModal'] as Modal).hide();
                    }
                });
                core.connection.onEvent('connected', () => {
                    core.watch(
                        () => core.conversations.hasNew,
                        newValue => Electron.ipcRenderer.send('has-new-propogate', newValue),
                    );
                });
                core.connection.onEvent('closed', () => {
                    if (!this.character)
                        return;

                    Electron.ipcRenderer.send('disconnect', this.character);
                    this.character = undefined;
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
            if (!Electron.ipcRenderer.sendSync('connect', this.fixCharacter))
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
                Electron.ipcRenderer.send('disconnect', this.fixCharacter);
            }
        }

        resetHost(): void {
            this.settings.host = FLIST.DefaultHost;
        }

        onMouseOver(e: MouseEvent): void {
            const preview = (this.$refs.linkPreview as HTMLDivElement);
            if ((e.target as HTMLElement).tagName === 'A') {
                const target = e.target as HTMLAnchorElement;
                if (target.hostname) {
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
            Electron.ipcRenderer.send('open-url-externally', `https://www.f-list.net/c/${this.profileName}`);

            (this.$refs.profileViewer as Modal).hide();
        }

        openConversation(): void {
            const character = core.characters.get(this.profileName);
            const conversation = core.conversations.getPrivate(character);

            conversation.show();

            (this.$refs.profileViewer as Modal).hide();
        }


        // Is there a reason it's possible to invoke this without the character sheet existing? This SFC's page "loads fully" before any of its child components???
        isRefreshingProfile(): boolean {
            return !!(this.$refs.characterPage && (this.$refs.characterPage as CharacterPage).refreshing);
        }


        reloadCharacter(/* payload: MouseEvent */): void {
            (this.$refs.characterPage as CharacterPage).reload(/* payload.shiftKey || payload.button === 2 */);
        }


        getThemeClass(): Record<string, boolean> {
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
            catch {
                return { [`theme-${this.settings.theme}`]: true };
            }
        }

        nextProfile(): void {
            if (!this.nextProfileAvailable())
                return;

            this.profilePointer++;

            const name = this.profileNameHistory[this.profilePointer];
            if (name)
                this.openProfile(name);
        }


        nextProfileAvailable(): boolean {
            return (this.profilePointer < this.profileNameHistory.length - 1);
        }


        prevProfile(): void {
            if (!this.prevProfileAvailable())
                return;

            this.profilePointer--;

            const name = this.profileNameHistory[this.profilePointer];
            if (name)
                this.openProfile(name);
        }


        prevProfileAvailable(): boolean {
            return (this.profilePointer > 0);
        }

        openProfile(name: string) {
            this.profileName = name;

            const character = core.characters.get(name);

            this.profileStatus = character.statusText;
        }

        get styling(): string {
            try {
                const theme_file_path = path.join(__dirname, `themes/${((this.character && core.state.settings.risingCharacterTheme) || this.settings.theme)}.css`);

                const theme_file = fs.readFileSync(theme_file_path, 'utf8').toString()

                return `<style id="themeStyle">${theme_file}</style>`;
            }
            catch (e) {
                const err_code = (e as Error & { code: string }).code;

                if (err_code === 'ENOENT' && this.settings.theme !== 'default') {
                    log.warn("Couldn't read file matching current theme; safely resetting to default.");
                    this.settings.theme = 'default';

                    return this.styling;
                }

                // Error on default theme access.
                throw e;
            }
        }

        showLogs(): void {
            (this.$refs['logsDialog'] as Logs).show();
        }

        unpinUrlPreview(e: Event): void {
            const imagePreview = (this.$refs['chat'] as Chat)?.getChatView()?.getImagePreview();

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

                if (this.upgradeRoutineShouldRun) {
                    this.tasks.push(
                        { id: 'core',  name: 'Core Services', running: true },
                    );
                }
            },
            cache: async () => {
                logC.debug('init.chat.cache.start');

                try {
                    // Early cache start to deal with removing old profiles.
                    await core.cache.start(true);
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

                logC.debug('init.chat.cache.done');
            },
            listeners: async () => {
                Electron.ipcRenderer.on('open-profile', (_e, name: string) => {
                    this.openProfile(name);

                    (this.$refs['profileViewer'] as Modal).show();
                });

                Electron.ipcRenderer.on('reopen-profile', _e => {
                    if (this.profileNameHistory.length
                    && this.profilePointer < this.profileNameHistory.length
                    && this.profilePointer >= 0) {
                        const name = this.profileNameHistory[this.profilePointer];
                        const profileViewer = this.$refs['profileViewer'] as Modal;

                        if (this.profileName === name && profileViewer.isShown) {
                            profileViewer.hide();
                            return;
                        }

                        if (name)
                            this.openProfile(name);

                        profileViewer.show();
                    }
                });

                Electron.ipcRenderer.on('fix-logs', async() => {
                    this.fixCharacters = await core.settingsStore.getAvailableCharacters();

                    if (this.fixCharacters[0])
                        this.fixCharacter = this.fixCharacters[0];
                    else
                        return;

                    (this.$refs['fixLogsModal'] as Modal).show();
                });

                Electron.ipcRenderer.on('active-tab',   () => core.cache.setTabActive(true));
                Electron.ipcRenderer.on('inactive-tab', () => core.cache.setTabActive(false));

                log.debug('init.chat.listeners.done');
            },
            restoreLogin: async () => {
                this.saveLogin = true;

                try {
                    this.password = await Electron.ipcRenderer.invoke('getPassword', 'f-list.net', this.settings.account);

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

    .disableWindowsHighContrast, .disableWindowsHighContrast * {
        forced-color-adjust: none;
    }
</style>
