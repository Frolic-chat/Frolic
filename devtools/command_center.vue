<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <modal :action="tab === '0' ? 'Spoof!' : 'Logs'" ref="dialog" dialogClass="" @submit="handle" buttonText="Submit">
        <tabs style="flex-shrink:0" :tabs="{ 0: 'Spoof!', 1: 'Logs' }" v-model="tab"></tabs>
        <spoof v-show="tab === '0'" ref="0" id="spoof"></spoof>
        <logs  v-show="tab === '1'" ref="1" id="logs" ></logs>
    </modal>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';
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
}
</script>

<style lang="css">
</style>
