<template>
    <modal ref="dialog" :action="l('chat.status.history')" :buttonText="l('general.select')" @open="onMounted()" @submit="selectStatus" dialogClass="w-100 modal-lg">
        <form class="status-picker" v-if="history.length > 0">
            <div class="form-row" v-for="(historicStatus, index) in history" :class="{ 'selected-row': (index === selectedStatus)}">
                <div class="form-col radio-col">
                    <input type="radio" :id="'history_status_' + index" :name="'history_status_' + index" v-model="selectedStatus" v-bind:value="index" />
                </div>
                <div class="form-col content-col" @click="select(index)" @dblclick="submit">
                    <span class="before-content">
                        <i class="fas" :class="{ 'fa-check-circle': (index === selectedStatus) }"></i>
                    </span>
                    <label class="custom-control-label" :for="'history_status_' + index">
                        <bbcode :text="historicStatus"></bbcode>
                    </label>
                    <span class="content-action" @click="removeStatusHistoryEntry(index)">
                        <i class="fas fa-times-circle"></i>
                    </span>
                </div>
            </div>
        </form>
        <div v-else>
            <i>{{ l('chat.status.history.none') }}</i>
        </div>
    </modal>
</template>

<script lang="ts">
    import { Component, Hook, Prop } from '@f-list/vue-ts';
    import Modal from '../components/Modal.vue';
    import CustomDialog from '../components/custom_dialog';
    import core from './core';
    import { BBCodeView } from '../bbcode/view';
    import * as _ from 'lodash';
    import { Dialog } from '../helpers/dialog';
    import l from './localize';

    @Component({
        components: {modal: Modal, bbcode: BBCodeView(core.bbCodeParser)}
    })
    export default class StatusPicker extends CustomDialog {
        @Prop({required: true})
        readonly callback!: (statusMessage: string) => void;

        @Prop({required: true})
        readonly curStatus!: string | undefined;

        history: string[] = [];

        l = l;

        selectedStatus: number | null = null;

        @Hook('mounted')
        async onMounted(): Promise<void> {
            this.history = (await core.settingsStore.get('statusHistory')) || [];
            this.selectedStatus = null;

            if ((this.curStatus) && (this.curStatus.trim() !== '')) {
                const cleanedStatus = this.curStatus.toLowerCase().trim();

                const index = _.findIndex(
                    this.history,
                  (c: string) => (c.toString().toLowerCase().trim() === cleanedStatus)
                );

                if (index >= 0) {
                    this.selectedStatus = index;
                }
            }
        }


        submit(e: Event): void {
          (<Modal>this.$refs.dialog).submit(e);
        }


        selectStatus(): void {
            if (this.selectedStatus !== null) {
                this.callback(this.history[this.selectedStatus]);
            }
        }


        async removeStatusHistoryEntry(index: number): Promise<void> {
          if(Dialog.confirmDialog('Are you sure you want to remove this status message?')) {
              this.history.splice(index, 1);

              await core.settingsStore.set('statusHistory', this.history);
          }
        }


        select(index: number): void {
            this.selectedStatus = index;
        }
    }
</script>

<style lang="scss">
    .status-picker {
        .radio-col {
            display: none;
        }

        label::before {
            display:none !important;
        }

        .content-col {
            min-width: 100%;
            display: flex;

            label {
                flex: 1;
            }

            .before-content {
                width: 1.3rem;
                margin-bottom: auto;
                margin-top: auto;
            }

            .content-action {
                float: right;
                opacity: 0.2;
                margin-bottom: auto;
                margin-top: auto;
                margin-left: 1rem;

                &:hover {
                    opacity: 0.8;
                }
            }
        }

        .form-row {
            margin-bottom: 10px;
            padding: 3px;

            border: 1px solid rgba(0,0,0,0);
            border-radius: 2px;
        }

        .form-row:hover {
            /*background-color: #20203e;*/
            /*border: 1px solid #2d2d6b;*/
            backdrop-filter: invert(30%) !important;
            border-radius: 2px;
        }

        .selected-row,
        .form-row.selected-row:hover {
            /*background-color: #343461;*/
            /*border: 1px solid #6565b2;*/
            backdrop-filter: invert(20%);
            border-radius: 2px;
        }
    }
</style>
