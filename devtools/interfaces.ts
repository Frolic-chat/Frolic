/**
Copyright 2025, Fire Under the Mountain (https://github.com/FireUnderTheMountain)

This file is part of Frolic Devtools.

Frolic Devtools package is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3 as published by the Free Software Foundation.

Frolic Devtools is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
import { ServerCommandKeys } from './api';
import { Connection as Interfaces } from '../fchat/interfaces';

/**
 * An interface to allow spoofing incoming server commands.
 * Create an instance of the debugger (probably as `core.debug`) with an
 * instance of Connection.Connection to send messages to.
 *
 * Please note this is not intended to be a full server emulator.
 */
export interface Debugger {
    readonly client: Interfaces.Connection;
    send(type: typeof ServerCommandKeys[number], data: any): void;
}
