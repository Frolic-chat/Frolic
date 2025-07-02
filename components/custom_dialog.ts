import { Vue, Component, Vanilla } from 'vue-facing-decorator';
import Modal from './Modal.vue';

@Component({
    components: {Modal}
})
export default class CustomDialog extends Vue {
    @Vanilla
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
