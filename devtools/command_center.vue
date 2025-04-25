<!--
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
-->
<template>
    <modal action="Spoof!" ref="dialog" dialogClass="ads-dialog" @submit="handle">
        <div id="body">
            <div class="info">{{ info }}</div>
            <input type="text" v-model="data">
            <div class="buttons">
                <button type="button" class="btn btn-secondary" @click="display(cmd)"
                    v-for="cmd in commands">{{ cmd }}
                </button>
                <button type="button" class="btn btn-secondary" @click="display('TST')">
                    TST
                </button>
            </div>
        </div>
    </modal>
</template>

<script lang="ts">
import { Component } from '@f-list/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';
import { ServerCommandKeys, ServerCommandMap } from './api';
import debug from './connection';



@Component({
    components: { modal: Modal }
})
export default class DevTools extends CustomDialog {
commands = ServerCommandKeys;

info = 'Command Spoofing';

key: typeof ServerCommandKeys[number] | 'TST' = 'TST';
data = '';

handle(): void {
    let data: object | undefined;

    try {
        data = this.data.length > 2
                        ? <object>JSON.parse(this.data)
                        : undefined;
    }
    catch (e) {
        this.key = 'TST';
        data = <object>JSON.parse(`{ "message": "${e}" }`);
    }

    debug.send(this.key, data);
}

display(cmd: string): void {
    this.key = cmd as typeof ServerCommandKeys[number] | 'TST';

    this.data = ServerCommandMap[this.key] ?? '{"test": test}'; // for 'TST'

    switch(this.key) {
    case 'BRO':
        this.info = 'Incoming admin broadcast.';
        // this.data = '{ "character": string, "message": string }';
        break;
    case 'CIU':
        this.info = 'Invites a user to a channel.';
        // this.data = '{ "sender": string, "title": string, "name": string }';
        break;
    case 'UPT':
        this.info = "Informs the client of the server's self-tracked online time, and a few other bits of information";
        // this.data = '{ "time": int, "starttime": int, "startstring": string, "accepted": int, "channels": int, "users": int, "maxusers": int }';
        break;
    case 'VAR':
        this.info = 'Variables the server sends to inform the client about server variables.';
        // this.data = '{ "variable": string, "value": int/float }';
        break;
    case 'TST':
        this.info = 'Test Command Please Ignore';
        // this.data = '{ "message": string }';
        break;
    default:
        //this.key  = 'TST';
        this.info = '[NYI] Fallback Info';
        // this.data = '{ "message": string }';
        break;
    }
}
}
</script>

<style>
#body {
    display: flex;
    flex-direction: column;

    .info {
        width: 100%;
        align-items: center;
        justify-content: center;
    }

    input {
        width: 100%;
    }

    .buttons {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-around;
    }
}
</style>
