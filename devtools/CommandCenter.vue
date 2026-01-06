<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
    <modal :action="nameTheModal()" ref="dialog" dialogClass="w-100 modal-xl" @submit="handle" buttonText="Submit">
        <tabs style="flex-shrink:0" :tabs="tabNames" v-model="tab"></tabs>

        <spoof  v-show="tab === '0'" ref="0" id="devtools-spoof"  ></spoof>
        <logs   v-show="tab === '1'" ref="1" id="devtools-logs"   ></logs>
        <div    v-show="tab === '2'" ref="2" id="devtools-outline">
            <input type="checkbox" v-model="outlineDisplayToggle" class="form-input">
            <label>Show outline</label>
        </div>
        <search v-show="tab === '3'" ref="3" id="devtools-search" ></search>
    </modal>
</template>

<script lang="ts">
import { Component, Watch } from '@f-list/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';
import Tabs from '../components/tabs';
import Spoof from './CommandSpoof.vue'
import LogViewer from './LogViewer.vue';
import Search from './Search.vue';

@Component({
    components: {
        modal:  Modal,
        tabs:   Tabs,
        spoof:  Spoof,
        logs:   LogViewer,
        search: Search,
    }
})
export default class DevTools extends CustomDialog {
    tabNames = [ 'Spoof!', 'Logs', 'UI Debug', 'Search' ];
    tab = '0';

    handle() { (this.$refs[this.tab] as { handle?: () => void }).handle?.(); }

    nameTheModal(): string {
        return this.tabNames[Number(this.tab)];
    }


    /**
     * Outline display
     */

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
