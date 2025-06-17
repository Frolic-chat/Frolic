<template>
   <modal :action="l('chat.newPM')" ref="dialog" @submit="post_submit" dialogClass="ads-dialog" :buttonText="l('general.open')">
        <div>
            <input type="text" :placeholder="l('general.name')"
                required minlength="2" maxlength="40"
                v-model="name" id="name" class="form-control" ref="name"
                @keyup.enter="keyboard_submit"
            />
            <div v-if="error" class="error">{{error}}</div>
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
    name  = '';
    error = '';
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

    keyboard_submit(e: Event): void {
        this.dialog.keepOpen = true;
        this.$nextTick(() => { this.dialog.keepOpen = false; });

        this.dialog.submit(e);
    }

    /**
     * Use of 'required' and 'minlength' on the input field is for posterity;
     * there's no benefit to try to use them over raw js in vue.
     */
    post_submit(): void {
        const clean = core.characters.validateCharacter(this.name);

        if (clean.err) {
            this.error = clean.err;
            return;
        }

        const char = core.characters.get(clean.out);
        const conversation = core.conversations.getPrivate(char);
        conversation.show();

        this.name  = '';
        this.error = '';

        this.dialog.keepOpen = false;
        this.dialog.hide();
    }
}
</script>
