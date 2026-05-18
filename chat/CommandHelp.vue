<template>
<modal id="command-help" dialogClass="modal-lg" :buttons="false" :action="l('commands.help')">
  <div style="overflow: auto;">
    <div v-for="command in filteredCommands" :key="command.name">
      <h4>{{ command.name }}</h4>
      <i>{{ l('commands.help.syntax', command.syntax) }}</i>
      <div>{{ command.help }}</div>
      <div v-if="command.params.length">
        {{ l('commands.help.parameters') }}
        <div v-for="param in command.params" :key="param.name" class="params">
          <b>{{ param.name }}</b> - {{ param.help }}
        </div>
      </div>
      <div v-if="command.context"><i>{{ command.context }}</i></div>
      <div v-if="command.permission"><i>{{ command.permission }}</i></div>
    </div>
  </div>
  <div class="input-group" style="padding:10px 0;flex-shrink:0">
    <div class="input-group-prepend">
      <div class="input-group-text"><span class="fas fa-search"></span></div>
    </div>
    <input v-model="filter" class="form-control" :placeholder="l('general.filter')">
  </div>
</modal>
</template>

<script lang="ts">
import { Component, Hook } from '@frolic/vue-ts';
import CustomDialog from '../components/custom_dialog';
import Modal from '../components/Modal.vue';
import core from './core';
import l from './localize';
import * as SlashCommands from './slash_commands';
const commands = SlashCommands.default;
import CommandContext = SlashCommands.CommandContext;
import ParamType = SlashCommands.ParamType;
import Permission = SlashCommands.Permission;

type CommandItem = {
    name:       string,
    help:       string,
    context:    string | undefined,
    permission: string | undefined,
    params:     { name: string, help: string }[],
    syntax:     string
};

@Component({
    components: { modal: Modal },
})
export default class CommandHelp extends CustomDialog {
    commands: CommandItem[] = [];
    filter = '';
    l = l;

    get filteredCommands(): ReadonlyArray<CommandItem> {
        if (this.filter.length === 0)
            return this.commands;

        const filter = new RegExp(this.filter.replace(/[^\w]/gi, '\\$&'), 'i');
        return this.commands.filter((x) => filter.test(x.name));
    }

    isChatOp(perm: SlashCommands.Permission): boolean {
        return [ Permission.Admin, Permission.ChatOp, Permission.ChannelMod ].includes(perm);
    }

    @Hook('mounted')
    mounted(): void {
        const permissions = core.connection.vars.permissions;
        for (const key in commands) {
            const command = commands[key as keyof typeof commands];

            if (command.documented !== undefined || command.permission && this.isChatOp(command.permission) && (command.permission & permissions) === 0)
                continue;

            const params = [];
            let syntax = `/${key} `;
            if (command.params !== undefined) {
                for (let i = 0; i < command.params.length; ++i) {
                    const param = command.params[i];
                    const paramKey = param.type === ParamType.Character ? 'param_character' : `${key}.param${i}`;
                    // @ts-expect-error Legacy code
                    const name = l(`commands.${paramKey}`);
                    const data = {
                        name: param.optional !== undefined ? l('commands.help.paramOptional', name) : name,
                        // @ts-expect-error Legacy code
                        help: l(`commands.${paramKey}.help`),
                    };
                    params.push(data);
                    syntax += (param.optional !== undefined ? `[${name}]` : `<${name}>`) +
                            (param.delimiter !== undefined ? param.delimiter : ' ');
                }
            }

            let context = '';
            if (command.context !== undefined) {
                if ((command.context & CommandContext.Channel) > 0)
                    context += `${l('commands.help.contextChannel')}\n`;
                if ((command.context & CommandContext.Private) > 0)
                    context += `${l('commands.help.contextPrivate')}\n`;
                if ((command.context & CommandContext.Console) > 0)
                    context += `${l('commands.help.contextConsole')}\n`;
            }
            this.commands.push({
                // @ts-expect-error Legacy code
                name:       `/${key} - ${l(`commands.${key}`)}`,
                // @ts-expect-error Legacy code
                help:       l(`commands.${key}.help`),
                context,
                permission: command.permission !== undefined
                    // @ts-expect-error Legacy code
                    ? l(`commands.help.permission${Permission[command.permission]}`)
                    : undefined,
                params,
                syntax,
            });
        }
    }
}
</script>

<style lang="scss">
    #command-help {
        h4 {
            margin-bottom: 0;
        }

        .params {
            padding-left: 20px;
        }
        .modal-body {
            display: flex;
            flex-direction: column;
        }
    }
</style>
