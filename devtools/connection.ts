// SPDX-License-Identifier: AGPL-3.0-or-later
import { Debugger as DebugIface } from './interfaces';
import { ServerCommandKeys } from './api';
import { Connection as Interfaces } from '../fchat/interfaces';
import core from '../chat/core';
import NewLogger from '../helpers/log';
const log = NewLogger('devtools/connection');

/**
 * A debugger intended to attach to a Client connection.
 */
export class Debugger implements DebugIface {
    client: Interfaces.Connection;
    constructor(client: Interfaces.Connection) { this.client = client }

    /**
     * Spoof a message to a chat interface.
     * @param command A command the server would send
     * @param data JSON object fitting the command
     *
     * More information about server commands can be found on the f-list wiki:
     * https://wiki.f-list.net/F-Chat_Server_Commands
     */
    public send(command: typeof ServerCommandKeys[number] | 'TST', data: any): void {
        if (typeof this.client._handleMessage !== "function") {
            log.verbose('devtools.send.connectionfailure');
            return;
        }

        if (command === 'TST') {
            log.info('devtools.test.send', { key: command, data: data });
            return;
        }

        this.client._handleMessage(command, data);
        log.debug('devtools.debug.send', { key: command, data: data });
    }
}

const debug = new Debugger(core.connection);
export default debug;

log.debug('init.devtools');
