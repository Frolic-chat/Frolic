// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Debugger as DebugIface } from './interfaces';
import type { ServerCommandKeys } from './api';
import type { Connection as Interfaces } from '../fchat/interfaces';
import NewLogger from '../helpers/log';
const log = NewLogger('devtools');

/**
 * A debugger intended to attach to a Client connection.
 */
export class Debugger implements DebugIface {
    constructor(private client: Interfaces.Connection) {}

    /**
     * Spoof a message to a chat interface.
     * @param command A command the server would send
     * @param data JSON object fitting the command
     *
     * More information about server commands can be found on the f-list wiki:
     * https://wiki.f-list.net/F-Chat_Server_Commands
     */
    public send<T extends typeof ServerCommandKeys[number]>(command: T, data: Interfaces.ServerCommands[T]): void {
        if (typeof this.client._handleMessage !== 'function') {
            log.verbose('devtools.send.connectionfailure');
            return;
        }

        void this.client._handleMessage(command, data);
        log.debug('devtools.debug.send', { key: command, data: data });
    }
}

log.debug('init.devtools');
