<template>
    <modal :action="`Ads for ${conversation.name}`" :disabled="true" ref="dialog" @open="load()" dialogClass="w-100" :buttonText="l('channel.ads.start')">

        <div class="phased-out-warning">
          <h4>Deprecated</h4>
          <h5>Channel-specific ads are out of service.</h5>
          <p>
            Use <button class="btn btn-outline-secondary" @click="openAdEditor()">Ad Editor</button>
            and <button class="btn btn-outline-secondary" @click="openPostAds()">Post Ads</button>
            instead, available on the left sidebar.
          </p>

          <p>
            <button v-if="ads.length > 0" class="btn btn-secondary" @click="copyAds()">Copy Channel Ads to Ad Editor</button>
          </p>
        </div>

        <div class="form-group ad-list" v-for="(_ad, index) in ads">
            <label :for="'ad' + conversation.key + '-' + index" class="control-label">Ad #{{(index + 1)}}
                <a v-if="(index > 0)" @click="moveAdUp(index)" title="Move Up"><i class="fa fa-arrow-up"></i></a>
                <a v-if="(index < ads.length - 1)" @click="moveAdDown(index)" title="Move Down"><i class="fa fa-arrow-down"></i></a>
                <a @click="removeAd(index)" title="Remove Ad"><i class="fas fa-times-circle"></i></a>
            </label>

            <editor :id="'ad' + conversation.key + '-' + index" v-model="ads[index]" :hasToolbar="true" class="form-control" :maxlength="core.connection.vars.lfrp_max">
            </editor>
        </div>
    </modal>
</template>

<script lang="ts">
    import {Component, Prop} from '@f-list/vue-ts';
    import CustomDialog from '../../components/custom_dialog';
    import Modal from '../../components/Modal.vue';
    import {Conversation} from '../interfaces';
    import l from '../localize';
    import {Editor} from '../bbcode';
    import core from '../core';
    import { Dialog } from '../../helpers/dialog';
    import AdCenterDialog from './AdCenter.vue';
    import _ from 'lodash';

    @Component({
        components: {modal: Modal, editor: Editor}
    })
    export default class ConversationAdSettings extends CustomDialog {
        @Prop({required: true})
        readonly conversation!: Conversation;
        l = l;
        setting = Conversation.Setting;
        ads: string[] = [];
        randomOrder = false;
        core = core;

        load(): void {
            const settings = this.conversation.settings;

            this.ads = settings.adSettings.ads.slice(0);
            this.randomOrder = !!settings.adSettings.randomOrder;
        }

        submit(): void {
            this.conversation.settings = {
                ...this.conversation.settings,

                adSettings: {
                  ...this.conversation.settings.adSettings,
                  ads: this.ads.map((ad: string) => ad.trim()).filter((ad: string) => (ad.length > 0)),
                  randomOrder: this.randomOrder
                }
            };
        }


        addAd(): void {
            this.ads.push('');
        }

        removeAd(index: number): void {
            // if (confirm('Are you sure you wish to remove this ad?')) {
            if (Dialog.confirmDialog('Are you sure you wish to remove this ad?')) {
                this.ads.splice(index, 1);
            }
        }

        moveAdUp(index: number): void {
            const ad = this.ads.splice(index, 1);

            this.ads.splice(index - 1, 0, ad[0]);
        }


        moveAdDown(index: number): void {
            const ad = this.ads.splice(index, 1);

            this.ads.splice(index + 1, 0, ad[0]);
        }

        openAdEditor() {
          this.hide();
          (<AdCenterDialog>this.$parent.$parent.$refs['adCenter']).show();
        }

        openPostAds() {
          this.hide();
          (<AdCenterDialog>this.$parent.$parent.$refs['adLauncher']).show();
        }

        async copyAds(): Promise<void> {
          await Promise.all(this.ads.map(
            async ad => {
              if (core.adCenter.isMissingFromAdCenter(ad))
                await core.adCenter.add(ad);
            }
          ));

          this.openAdEditor();
        }
    }
</script>

<style lang="scss">
  .w-100 {
    min-width: 70%;
  }

  .form-group.ad-list {
    label {
      font-size: 140%;

      a {
        padding-right: 0.3rem;
        opacity:0.3;
        font-size: 70%;

        &:hover {
          opacity:0.6
        }
      }
    }

    .bbcode-preview {
      margin-top: 0;
      border: 1px solid;
      padding: 5px;
      border-radius: 0 5px 5px 5px;
      background: var(--input-bg);
      border-color: var(--secondary);
    }

    .bbcode-editor {
      border: none;
      background: none;
      height: auto;

      textarea {
        width: 100%;
        color: var(--input-color);
        background-color: var(--input-bg);
        border-radius: 0 5px 5px 5px;
      }
    }
  }

  .phased-out-warning {
    border: 1px solid orange;
    padding: 15px;
    margin-bottom: 2rem;
  }
</style>
