/**
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation, with this exception/clarification: These source code files hosted alongside other source code files not licensed under the GPL is not considered a "combined" work and does not dictate all source code files be distributed by the terms of the GPL.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import { Debugger as DebugIface } from './interfaces';
import { ServerCommandKeys } from './api';
import { Connection as Interfaces } from '../fchat/interfaces';
import core from '../chat/core';
import log from 'electron-log';

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
