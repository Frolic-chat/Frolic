<template>
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
</template>

<script lang="ts">
import Vue from 'vue';
import { Component } from '@f-list/vue-ts';
import { ServerCommandKeys, ServerCommandMap } from './api';
import debug from './connection';

@Component
export default class Spoof extends Vue {
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
        break;
    case 'UPT':
        this.info = "Informs the client of the server's self-tracked online time, and a few other bits of information";
        break;
    case 'VAR':
        this.info = 'Variables the server sends to inform the client about server variables.';
        break;
    case 'TST':
        this.info = 'Test Command Please Ignore';
        break;
    default:
        this.info = '[NYI] Fallback Info';
        break;
    }
}
}
</script>

<style lang="css">
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

    .btn {
        margin: 1px 3px;
    }
}
</style>
