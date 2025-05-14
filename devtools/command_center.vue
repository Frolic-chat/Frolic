<!--
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
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
