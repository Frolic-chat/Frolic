<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div><!-- v-show="tab === 'x'" -->
    <h5>{{ l('settings.browser.title') }}</h5>
    <div class="app-wide-setting-notice">{{ l('settings.notice.appWide') }}</div>

    <div class="warning">
        <h5>{{ l('settings.browser.warning.title') }}</h5>
        <div>{{ l('settings.browser.warning.msg') }}</div>
        <div v-if="isMac">
            <hr/>
            <p>{{ l('settings.browser.warning.mac1') }}</p>
            <p>{{ l('settings.browser.warning.mac2') }}</p>
            <p>{{ l('settings.browser.warning.mac3') }}</p>
        </div>
    </div>

    <div class="form-group col-12">
        <label class="control-label" for="browserPath">{{l('settings.browser.path')}}</label>
        <div class="row">
            <div class="col-10">
            <input type="text" class="form-control" id="browserPath" :value="browserPath" @change="setBrowserPath" :placeholder="l('settings.browser.default')"/>
            </div>
            <div class="col-2">
            <button class="btn btn-primary" @click.prevent.stop="browseForPath()">{{l('settings.browser.browse')}}</button>
            </div>
        </div>
    </div>

    <div class="form-group col-12"><hr></div>

    <div class="form-group col-12">
        <label class="control-label" for="browserArgs">{{l('settings.browser.arguments')}}</label>
        <div class="row">
            <div class="col-12">
                <input type="text" class="form-control" id="browserArgs" :value="browserArgs" @change="setBrowserArgs"/>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <small class="form-text text-muted">{{l('settings.browser.argumentsHelp')}}</small>
                <small v-if="browserPath" class="form-text text-muted">{{ l('settings.browser.current') }}{{ example }}</small>
            </div>
        </div>
    </div>

    <div class="form-group col-12"><hr></div>

    <div class="form-group col-12">
        <label class="control-label" for="incognitoArg">{{ l('settings.browser.incognito.title') }}</label>
        <div class="row">
            <div class="col-10">
                <input type="text" class="form-control" id="incognitoArg" :value="incognitoArg" @change="setIncogArgs"/>
            </div>
            <div class="col-2">
                <button class="btn btn-primary" @click.prevent.stop="autoFillIncognitoArg()">{{ l('settings.browser.incognito.auto') }}</button>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <small class="form-text text-muted">{{ l('settings.browser.incognito.help') }}</small>
                <small class="form-text" :class="incognitoMessageTextClass">{{ incognitoMessage }}</small>
            </div>
        </div>
    </div>
    <div class="form-group col-12">
        <div class="row">
            <div class="col-4">
                <button class="btn btn-danger" @click.prevent.stop="resetToDefault()">{{l('settings.browser.reset')}}</button>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <small class="form-text text-muted">⚠ This will clear the entire form.</small>
            </div>
        </div>
    </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Watch } from '@f-list/vue-ts';
import * as Electron from 'electron';

import core from '../core';
import l from '../localize';
import { IncognitoArgFromBrowserPath } from '../../constants/general';

import NewLogger from '../../helpers/log';
const log = NewLogger('CustomBrowserPage');

@Component({
    components: {
    }
})
export default class BrowserSettings extends Vue {
    l = l;

    browserPath  = core.state.generalSettings.browserPath;
    browserArgs  = core.state.generalSettings.browserArgs;
    incognitoArg = core.state.generalSettings.browserIncognitoArg;

    example = '';
    incognitoMessage = '';
    incognitoMessageTextClass = 'text-muted';
    isMac = process.platform === 'darwin';

    @Hook('mounted')
    async onMount() {
        // Tab 5
        let queueSend = false;

        if (!this.browserArgs) {
            this.browserArgs = '%s';
            queueSend = true;
        }
        else if (!this.browserArgs.includes('%s')) {
            this.browserArgs += ' %s';
            queueSend = true;
        }

        if (!this.incognitoArg) {
            const oldarg = this.incognitoArg;
            this.autoFillIncognitoArg();

            if (this.incognitoArg !== oldarg)
                queueSend = true;
        }

        if (queueSend)
            Electron.ipcRenderer.send('browser-option-update', this.browserPath, this.browserArgs, this.incognitoArg);
    }

    setBrowserPath(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value;
        log.debug('setBrowserPath', { old: this.browserPath, new: v });
        this.browserPath = v;
        // Other logic here.
    }

    setBrowserArgs(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value;
        log.debug('setBrowserArgs', { old: this.browserArgs, new: v });
        this.browserArgs = v;
        // Other logic here.
    }

    setIncogArgs(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value;
        log.debug('setIncogArgs', { old: this.incognitoArg, new: v });
        this.incognitoArg = v;
        // Other logic here.
    }

    @Watch('browserPath')
    @Watch('browserArgs')
    @Watch('incognitoArg')
    updateExample(): void {
        if (!this.browserPath) {
            this.example = '';
            this.incognitoMessage = l('settings.browser.incognito.auto.warning');
            this.incognitoMessageTextClass = 'text-warning';

            log.debug('updateExample !browserPath');
            return;
        }

        if (!this.browserArgs)
            this.browserArgs = '%s';
        else if (!this.browserArgs.includes('%s'))
            this.browserArgs = this.browserArgs.trimEnd() + ' %s';

        if (!this.incognitoArg)
            this.autoFillIncognitoArg();

        // Output
        const parsed_args = this.browserArgs.replaceAll(/%s/g, '"https://example.com/page"');
        this.example = `"${this.browserPath}" ${parsed_args}`;
        this.incognitoMessage = l('settings.browser.current') + `"${this.browserPath}" ${this.incognitoArg} ${parsed_args}`;
        this.incognitoMessageTextClass = 'text-muted';
    }

    autoFillIncognitoArg(): void {
        const incognitoArg = IncognitoArgFromBrowserPath(this.browserPath);

        log.debug('autoFillIncognitoArg', { old: this.incognitoArg, new: incognitoArg, browser: this.browserPath });

        if (incognitoArg) {
            this.incognitoArg = incognitoArg;
        }
        else {
            this.incognitoMessage = l('settings.browser.incognito.auto.warning');
            this.incognitoMessageTextClass = 'text-warning';
        }
    }

    resetToDefault(): void {
        this.browserPath = '';
        this.browserArgs = '%s';
    }

    browseForPath(): void {
        Electron.ipcRenderer.invoke('browser-option-browse')
        .then(result => {
            if (typeof result === 'string')
                this.browserPath = result;
        });
    }

    /**
     * Strip this away.
     */
    submit(): void {
        this.browserArgs = this.browserArgs.trim();

        if (!this.browserArgs)
            this.browserArgs = '%s';
        else if (!this.browserArgs.includes('%s'))
            this.browserArgs += ' %s';

        if (!this.incognitoArg)
            this.autoFillIncognitoArg();

        Electron.ipcRenderer.send('browser-option-update', this.browserPath, this.browserArgs, this.incognitoArg);
    }
}
</script>

<style lang="scss">
</style>
