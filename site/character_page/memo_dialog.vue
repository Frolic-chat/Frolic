<template>
    <Modal :action="'Memo for ' + name" :buttonText="this.editing ? 'Save and Close' : 'Close'" @close="onClose" @submit="save" dialog-class="modal-lg modal-dialog-centered">
        <div class="form-group" v-if="editing">
            <textarea v-model="message" maxlength="1000" class="form-control"></textarea>
        </div>
        <div v-else>
            <p>{{ message }}</p>
            <p><a href="#" @click="editing=true">Edit</a></p>
        </div>
    </Modal>
</template>

<script lang="ts">
    import { Component, Prop, Watch, Emit } from 'vue-facing-decorator';
    import CustomDialog from '../../components/custom_dialog';
    import Modal from '../../components/Modal.vue';
    import {SimpleCharacter} from '../../interfaces';
    import * as Utils from '../utils';
    // import {methods} from './data_store';
    import { MemoManager } from '../../chat/character/memo';

    export interface Memo {
        id: number
        memo: string
        character: SimpleCharacter
        created_at: number
        updated_at: number
    }

    @Component({
        components: {Modal}
    })
    export default class MemoDialog extends CustomDialog {
        @Prop({required: true})
        readonly character!: {id: number, name: string};
        @Prop({ default: null })
        readonly memo!: Memo | null;
        message: string | null = null;
        editing: boolean = false;
        saving: boolean = false;

        get name(): string {
            return this.character.name;
        }

        show(): void {
            super.show();
            this.setMemo();
        }

        @Watch('memo')
        setMemo(): void {
            if(this.memo)
                this.message = this.memo.memo;
        }

        onClose(): void {
            this.editing = false;
        }

        @Emit('memo')
        emitMemo(m: ReturnType<MemoManager['get']>) { return m };

        async save(): Promise<void> {
            if (!this.editing) return;

            try {
                this.saving = true;

                if (this.message === '')
                    this.message = null;

                const memoManager = new MemoManager(this.character.name);
                await memoManager.set(this.message);

                this.emitMemo(memoManager.get());
                this.hide();
            } catch(e) {
                Utils.ajaxError(e, 'Unable to set memo.');
            }
            this.saving = false;
        }
    }
</script>
