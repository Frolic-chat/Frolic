<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div><!-- v-show="tab === 'x'" -->
  <div class="settings-search-result-marker">
    <h5>{{ l('settings.browser.title') }}</h5>
    <div>{{ l('settings.notice.appWide') }}</div>
  </div>

  <div class="warning settings-search-result-marker">
    <h5>{{ l('settings.browser.warning.title') }}</h5>
    <div>{{ l('settings.browser.warning.msg') }}</div>
    <div v-if="isMac">
      <hr>
      <p>{{ l('settings.browser.warning.mac1') }}</p>
      <p>{{ l('settings.browser.warning.mac2') }}</p>
      <p>{{ l('settings.browser.warning.mac3') }}</p>
    </div>
  </div>

  <div class="form-group settings-search-result-marker">
    <div class="row">
      <label class="control-label col" for="browserPath">{{ l('settings.browser.path') }}</label>
    </div>
    <div class="row">
      <div class="col">
        <input id="browserPath" type="text" class="form-control" :value="settings.browserPath" :placeholder="l('settings.browser.default')" @change="setBrowserPath">
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" @click.prevent.stop="browseForPath()">{{ l('settings.browser.browse') }}</button>
      </div>
    </div>
  </div>

  <div class="form-group"><hr></div>

  <div class="form-group settings-search-result-marker">
    <div class="row">
      <label class="control-label col" for="browserArgs">{{ l('settings.browser.arguments') }}</label>
    </div>
    <div class="row">
      <div class="col">
        <input id="browserArgs" type="text" class="form-control" :value="settings.browserArgs" @change="setBrowserArgs">
      </div>
    </div>
    <div class="row settings-search-result-marker">
      <div class="col">
        <small class="form-text text-muted">{{ l('settings.browser.argumentsHelp') }}</small>
        <small v-if="settings.browserPath" class="form-text text-muted" style="user-select: text;">{{ l('settings.browser.current') }}{{ example }}</small>
      </div>
    </div>
  </div>

  <div class="form-group"><hr></div>

  <div class="form-group settings-search-result-marker">
    <div class="row">
      <label class="control-label" for="incognitoArg">{{ l('settings.browser.incognito.title') }}</label>
    </div>
    <div class="row">
      <div class="col">
        <input id="incognitoArg" type="text" class="form-control" :value="settings.browserIncognitoArg" @change="setIncogArgs">
      </div>
      <div class="col-auto">
        <button class="btn btn-primary" @click.prevent.stop="autoFillIncognitoArg()">{{ l('settings.browser.incognito.auto') }}</button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <small class="form-text text-muted">{{ l('settings.browser.incognito.help') }}</small>
        <small class="form-text" :class="incognitoMessageTextClass" style="user-select: text;">{{ incognitoMessage }}</small>
      </div>
    </div>
  </div>
  <div class="form-group settings-search-result-marker">
    <div class="row">
      <div class="col-auto">
        <button class="btn btn-danger" @click.prevent.stop="resetToDefault()">{{ l('settings.browser.reset') }}</button>
      </div>
    </div>
    <div class="row">
      <div class="col">
        <small class="form-text text-muted">⚠ This will clear the entire form.</small>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook, Watch } from '@frolic/vue-ts';
import * as Electron from 'electron';

import core from '../core';
import l from '../localize';
import { IncognitoArgFromBrowserPath } from '../../constants/general';

import NewLogger from '../../helpers/log';
const log = NewLogger('browser');

@Component({})
export default class BrowserSettings extends Vue {
    l = l;

    settings = core.state.generalSettings;

    example = '';
    incognitoMessage = '';
    incognitoMessageTextClass = 'text-muted';
    isMac = process.platform === 'darwin';

    @Hook('mounted')
    onMount() {
        if (!this.settings.browserArgs)
            this.settings.browserArgs = '%s';
        else if (!this.settings.browserArgs.includes('%s'))
            this.settings.browserArgs += ' %s';

        if (!this.settings.browserIncognitoArg)
            this.autoFillIncognitoArg();

        this.updateExample();
    }

    setBrowserPath(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value.trim();
        log.debug('setBrowserPath', { old: this.settings.browserPath, new: v });

        this.settings.browserPath = v;
    }

    setBrowserArgs(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value.trim();
        log.debug('setBrowserArgs', { old: this.settings.browserArgs, new: v });

        if (!v)
            this.settings.browserArgs = '%s';
        else if (!v.includes('%s'))
            this.settings.browserArgs = v + ' %s';
        else
            this.settings.browserArgs = v;

        this.$forceUpdate();
    }

    setIncogArgs(e: Event) {
        const input = e.target as HTMLInputElement;
        const v = input.value.trim();
        log.debug('setIncogArgs', { old: this.settings.browserIncognitoArg, new: v });

        if (!v)
            this.autoFillIncognitoArg();
        else
            this.settings.browserIncognitoArg = v;

        this.$forceUpdate();
    }

    @Watch('settings.browserPath')
    @Watch('settings.browserArgs')
    @Watch('settings.incognitoArg')
    updateExample(): void {
        if (!this.settings.browserPath) {
            this.example = '';
            this.incognitoMessage = l('settings.browser.incognito.auto.warning');
            this.incognitoMessageTextClass = 'text-warning';

            log.debug('updateExample !browserPath');
            return;
        }

        // Output
        const parsed_args = this.settings.browserArgs.replaceAll(/%s/g, '"https://example.com/page"');
        this.example = `"${this.settings.browserPath}" ${parsed_args}`;
        this.incognitoMessage = l('settings.browser.current') + `"${this.settings.browserPath}" ${this.settings.browserIncognitoArg} ${parsed_args}`;
        this.incognitoMessageTextClass = 'text-muted';
    }

    autoFillIncognitoArg(): void {
        const incognitoArg = IncognitoArgFromBrowserPath(this.settings.browserPath);

        log.debug('autoFillIncognitoArg', { old: this.settings.browserIncognitoArg, new: incognitoArg, browser: this.settings.browserPath });

        if (incognitoArg) {
            this.settings.browserIncognitoArg = incognitoArg;
        }
        else {
            this.incognitoMessage = l('settings.browser.incognito.auto.warning');
            this.incognitoMessageTextClass = 'text-warning';
        }
    }

    resetToDefault(): void {
        this.settings.browserPath = '';
        this.settings.browserArgs = '%s';
    }

    browseForPath(): void {
        void Electron.ipcRenderer.invoke('browser-option-browse')
            .then(result => {
                if (typeof result === 'string')
                    this.settings.browserPath = result;
            });
    }
}
</script>

<style lang="scss">
</style>
