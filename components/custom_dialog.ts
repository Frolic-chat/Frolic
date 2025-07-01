import { Vue, Component } from 'vue-facing-decorator';
import Modal from './Modal.vue';

@Component({
    components: {Modal}
})
export default class CustomDialog extends Vue {
    protected get dialog(): Modal {
        return <Modal>this.$refs.dialog;
    }

    show(keepOpen?: boolean): void {
        this.dialog.show(keepOpen);
    }

    hide(): void {
        this.dialog.hide();
    }
}
