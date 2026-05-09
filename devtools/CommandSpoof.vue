<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<template>
<div id="command-spoofer">
  <div class="info">
    {{ info }}
  </div>
  <!--<input v-model="data" type="text">-->
  <textarea id="command-input" v-model="data" class="form-control"></textarea>
  <div class="buttons">
    <button v-for="cmd in commands" :key="cmd" type="button" class="btn btn-secondary" @click="display(cmd)">
      {{ cmd }}
    </button>
  </div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Hook } from '@frolic/vue-ts';
import { ServerCommandKeys, ServerCommandMap } from './api';
import type { Connection as Interfaces } from '../fchat/interfaces';
import { Debugger } from './connection';
import core from '../chat/core';
import NewLogger from '../helpers/log';
const log = NewLogger('devtools');

@Component
export default class Spoof extends Vue {
    commands = ServerCommandKeys;
    info = 'Command Spoofing';
    key: typeof ServerCommandKeys[number] = 'ZZZ';
    data = '';
    debugger: Debugger | null = null;

    @Hook('mounted')
    mounted() {
        if (!this.debugger) {
            if (core.connection) {
                this.debugger = new Debugger(core.connection);
                log.debug('Spoof.mounted.connection.success');
            }
            else {
                log.error('Spoof.mounted.connection.none');
            }
        }
    }

    handle(): void {
        let data: object | undefined;

        try {
            data = this.data.length > 2
                ? JSON.parse(this.data) as object
                : undefined;

            this.info = '';
        }
        catch (e: unknown) {
            this.key = 'ZZZ';
            // data = JSON.parse(`{ "message": "${e}" }`) as object;
            /* eslint-disable-next-line @typescript-eslint/restrict-template-expressions */
            this.info = `${e}`;
        }

        this.debugger?.send(this.key, data as Interfaces.ServerCommands[typeof this.key]);
    }

    display(cmd: string): void {
        // @ts-expect-error Strings can be part of a string union... :)
        if (!ServerCommandKeys.includes(cmd))
            return;

        this.key = cmd as typeof ServerCommandKeys[number];
        this.data = ServerCommandMap[this.key];

        switch (this.key) {
        case 'BRO':
            this.info = 'Incoming admin broadcast.';
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
        default:
            this.info = '[NYI] Fallback Info';
            break;
        }
    }
}
</script>

<style lang="css">
#command-spoofer {
    display: flex;
    flex-direction: column;
}

.info {
    width: 100%;
    align-items: center;
    justify-content: center;
}

textarea#command-input {
    width: 100%;

    field-sizing: content;
    resize: none;
}

.buttons {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-around;
}
</style>
