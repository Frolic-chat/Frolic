<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <modal :action="tab === '0' ? 'Spoof!' : 'Logs'" ref="dialog" dialogClass="" @submit="handle" buttonText="Submit">
        <tabs style="flex-shrink:0" :tabs="[ 'Spoof!', 'Logs', 'UI Debug' ]" v-model="tab"></tabs>
        <spoof v-show="tab === '0'" ref="0" id="spoof"  ></spoof>
        <logs  v-show="tab === '1'" ref="1" id="logs"   ></logs>
        <div   v-show="tab === '2'" ref="2" id="outline">
            <input type="checkbox" v-model="outlineDisplayToggle" class="form-input">
            <label>Show outline</label>
        </div>
    </modal>
</template>

<script lang="ts">
import { Component, Watch } from '@f-list/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';
import Tabs from '../components/tabs';
import Spoof from './command_spoof.vue'
import LogViewer from './log_viewer.vue';

@Component({
    components: {   modal: Modal, tabs: Tabs,
                    spoof: Spoof, logs: LogViewer }
})
export default class DevTools extends CustomDialog {
    tab = '0';

    handle() { (this.$refs[this.tab] as any).handle(); }

    outlineDisplayToggle = false;

    @Watch('outlineDisplayToggle')
    onOutlineDisplayToggled(newValue: boolean) {
        if (newValue)
            document.body.classList.add('show-debug-outline');
        else
            document.body.classList.remove('show-debug-outline');
    }

}
</script>

<style lang="css">
.show-debug-outline * {
    outline: 1px solid #ff00d8 !important;
}
</style>
