<template>
   <modal :action="l('chat.newPM')" ref="dialog" @submit="submit" dialogClass="ads-dialog" :buttonText="l('general.open')">
        <div>
            <input type="text" id="name" v-model="name" :placeholder="l('general.name')" ref="name" />
            <div class="error" v-if="error">{{error}}</div>
        </div>

   </modal>
</template>


<script lang="ts">
import { Component, Prop, Watch } from '@f-list/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';
import core from './core';
import l from './localize';

@Component({
    components: {modal: Modal}
})
export default class PmPartnerAdder extends CustomDialog {
    name = '';
    error: string | null = null;
    l = l;

    @Prop
    readonly switch!: boolean;

    @Watch('switch')
    open(): void {
        this.$nextTick(() => {
            (this.$refs.name as HTMLInputElement).focus();
        });

        this.error = '';
    }

    submit(): void {
        const c = core.characters.get(this.name);


        if (c) {
            const conversation = core.conversations.getPrivate(c);

            conversation.show();

            this.name = '';
            this.error = '';
        } else {
            this.error = l('chat.unknownChar');
        }
    }
}
</script>
