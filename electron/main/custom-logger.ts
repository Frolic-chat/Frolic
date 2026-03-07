// SPDX-License-Identifier: AGPL-3.0-or-later
import Logger from 'electron-log/main';
import type { LogType } from '../common';

function lazyval(...args: unknown[]): unknown[] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return args.map(arg => typeof arg === 'function' ? arg() : arg);
}

/**
 * Ties electron-log to a custom condition. The condition is checked regardless of log level.
 *
 * Example:
 * ```ts
 * const log = NewLogger("Logger", () => truthyCondition);
 * ```
 * @param scope Scope used by electron-log
 * @param condition Must be true to invoke logging
 * @returns A logger object with capabilities mapped to those of electron-log
 */
export default function NewLogger(scope: LogType, condition?: (...a: unknown[]) => unknown) {
    const c = process.argv.includes('--debug-' + scope);
    const cond = condition ?? (() => c);

    const l = Logger.scope(scope);
    return {
        debug:   (...args: unknown[]) => {
            if (cond(...args))
                l.debug(  ...lazyval(...args));
        },
        error:   (...args: unknown[]) => {
            if (cond(...args))
                l.error(  ...lazyval(...args));
        },
        info:    (...args: unknown[]) => {
            if (cond(...args))
                l.info(   ...lazyval(...args));
        },
        log:     (...args: unknown[]) => {
            if (cond(...args))
                l.log(    ...lazyval(...args));
        },
        silly:   (...args: unknown[]) => {
            if (cond(...args))
                l.silly(  ...lazyval(...args));
        },
        verbose: (...args: unknown[]) => {
            if (cond(...args))
                l.verbose(...lazyval(...args));
        },
        warn:    (...args: unknown[]) => {
            if (cond(...args))
                l.warn(   ...lazyval(...args));
        },
        eval: (...args: unknown[]) => cond(...lazyval(...args)),
    };
}
