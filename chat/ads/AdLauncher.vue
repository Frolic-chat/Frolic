<template>
<modal ref="dialog" :action="l('ads.post.title')" dialogClass="w-100" class="adLauncher" :buttonText="l('ads.post.start')" @submit="submit" @reopen="load" @open="load">
  <div v-if="hasAds()">
    <h4>{{ l('ads.post.tagTitle') }}</h4>
    <div class="form-group">
      <p>{{ l('ads.post.desc') }}</p>

      <label v-for="(tag,index) in tags" :key="index" class="control-label" :for="`adr-tag-${index}`">
        <input :id="`adr-tag-${index}`" v-model="tag.value" type="checkbox" />
        {{ tag.title }}
      </label>
    </div>

    <h4>{{ l('ads.post.target.title') }}</h4>
    <div class="form-group">
      <p>{{ l('ads.post.target') }}</p>

      <p v-if="channels.length === 0">{{ l('ads.post.noChannels') }}</p>

      <label class="control-label">
        <input id="ard-all-channels" type="checkbox" @change="selectAllChannels" />
        <i>{{ l('ads.post.selectAll') }}</i>
      </label>

      <label v-for="(channel,index) in channels" :key="index" class="control-label" :for="`adr-channel-${index}`">
        <input :id="`adr-channel-${index}`" v-model="channel.value" type="checkbox" />
        {{ channel.title }}
      </label>
    </div>

    <h4>{{ l('ads.post.order.title') }}</h4>
    <div class="form-group">
      <label class="control-label" for="adOrderRandom">
        <input id="adOrderRandom" v-model="adOrder" type="radio" value="random" />
        {{ l('ads.post.random') }}
      </label>
      <label class="control-label" for="adOrderAdCenter">
        <input id="adOrderAdCenter" v-model="adOrder" type="radio" value="ad-center" />
        {{ l('ads.post.ordered') }}
      </label>
    </div>

    <h4>{{ l('ads.post.campaign') }}</h4>
    <div class="form-group">
      <label class="control-label" for="timeoutMinutes">
        {{ l('ads.post.timeout') }}
      </label>

      <select id="timeoutMinutes" v-model="timeoutMinutes" class="form-control">
        <option v-for="(timeout, index) in timeoutOptions" :key="index" :value="timeout.value">{{ timeout.title }}</option>
      </select>
    </div>

    <p class="matches"><b>{{ matchCount }}</b>{{ l('ads.post.used') }}</p>
  </div>
  <div v-else>
    <h4>{{ l('ads.post.noAds') }}</h4>

    <p>{{ l('ads.post.create1') }}<button class="btn btn-outline-secondary" @click="openAdEditor()">{{ l('ads.post.adEditor') }}</button>{{ l('ads.post.create2') }}</p>
  </div>
</modal>
</template>

<script lang="ts">
import { Component, Watch } from '@frolic/vue-ts';
import CustomDialog from '../../components/custom_dialog';
import Modal from '../../components/Modal.vue';
import core from '../core';
import l from '../localize';
import type AdCenterDialog from './AdCenter.vue';

@Component({ components: { modal: Modal } })
export default class AdLauncherDialog extends CustomDialog {
    l = l;

    adOrder: 'random' | 'ad-center' = 'random';

    matchCount = 0;

    timeoutMinutes = 180;

    tags: { value: boolean, title: string }[] = [];

    channels: { value: boolean, title: string, id: string }[] = [];

    timeoutOptions = [ /* eslint-disable @stylistic/key-spacing */
        { value:  30, title: '30 ' + l('ads.post.minutes') },
        { value:  60, title:  '1 ' + l('ads.post.hour')    },
        { value: 120, title:  '2 ' + l('ads.post.hours')   },
        { value: 180, title:  '3 ' + l('ads.post.hours')   },
    ]; /* eslint-enable @stylistic/key-spacing */

    load() {
        this.channels = core.channels.joinedChannels
            .filter(c => c.mode === 'ads' || c.mode === 'both')
            .map(c => ({ value: false, title: c.name, id: c.id }));

        this.tags = core.adCenter.getActiveTags()
            .map(t => ({ value: false, title: t }));

        this.checkCanSubmit();
    }

    hasAds(): boolean {
        return core.adCenter.getActiveAds().length > 0;
    }

    @Watch('tags', { deep: true })
    updateTags(): void {
        this.matchCount = core.adCenter.getMatchingAds(this.getWantedTags()).length;
        this.checkCanSubmit();
    }

    @Watch('channels', { deep: true })
    updateChannels(): void {
        this.checkCanSubmit();
    }

    checkCanSubmit() {
        const channelCount = this.channels.filter(channel => channel.value).length;
        const tagCount = this.tags.filter(tag => tag.value).length;

        this.dialog.forceDisabled(tagCount === 0 || channelCount === 0);
    }

    getWantedTags(): string[] {
        return this.tags.filter(t => t.value).map(t => t.title);
    }

    getWantedChannels(): string[] {
        return this.channels.filter(t => t.value).map(t => t.id);
    }

    openAdEditor(): void {
        this.hide();
        (this.$parent.$refs['adCenter'] as AdCenterDialog).show();
    }

    selectAllChannels(e: Event): void {
        const newValue = (e.target as HTMLInputElement).checked;

        e.preventDefault();
        e.stopPropagation();

        this.channels.forEach(c => c.value = newValue);
    }

    submit(e: Event) {
        const tags = this.getWantedTags();
        const channelIds = this.getWantedChannels();

        if (tags.length === 0) {
            e.preventDefault();
            window.alert(l('ads.post.alert.tag'));
            return;
        }

        if (channelIds.length === 0) {
            e.preventDefault();
            window.alert(l('ads.post.alert.channel'));
            return;
        }

        if (!channelIds.every(id => {
            if (core.adCenter.isSafeToOverride(id))
                return true;

            const chan = core.channels.getChannel(id);

            if (!chan)
                return true;

            return window.confirm(l('ads.post.warn', chan.name));
        })) {
            e.preventDefault();
            return;
        }

        core.adCenter.schedule(
            tags,
            channelIds,
            this.adOrder,
            this.timeoutMinutes
        );

        this.hide();
    }
}
</script>

<style lang="scss">
.adLauncher {
    label {
        display: block;
        margin-left: 0.75rem;
        color: var(--gray-dark);
    }

    select {
        margin-left: 0.75rem;
        width: auto;
        padding-right: 1.5rem;
    }

    .matches {
        margin: 0;
        margin-top: 2rem;
        color: var(--gray);
    }
}
</style>
