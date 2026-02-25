// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ServerCommandKeys } from './api';
import type { Connection as Interfaces } from '../fchat/interfaces';

/**
 * An interface to allow spoofing incoming server commands.
 * Create an instance of the debugger (probably as `core.debug`) with an
 * instance of Connection.Connection to send messages to.
 *
 * Please note this is not intended to be a full server emulator.
 */
export interface Debugger {
    readonly client: Interfaces.Connection;
    send(type: typeof ServerCommandKeys[number], data: unknown): void;
}
