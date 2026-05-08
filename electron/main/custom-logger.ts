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
    const s = () => process.argv.includes('--debug-' + scope);
    const c = condition ?? s;

    const l = Logger.scope(scope);
    return {
        debug:   (...args: unknown[]) => {
            if (c(...args))
                l.debug(  ...lazyval(...args));
        },
        error:   (...args: unknown[]) => {
            if (c(...args))
                l.error(  ...lazyval(...args));
        },
        info:    (...args: unknown[]) => {
            if (c(...args))
                l.info(   ...lazyval(...args));
        },
        log:     (...args: unknown[]) => {
            if (c(...args))
                l.log(    ...lazyval(...args));
        },
        silly:   (...args: unknown[]) => {
            if (c(...args))
                l.silly(  ...lazyval(...args));
        },
        verbose: (...args: unknown[]) => {
            if (c(...args))
                l.verbose(...lazyval(...args));
        },
        warn:    (...args: unknown[]) => {
            if (c(...args))
                l.warn(   ...lazyval(...args));
        },
        eval: (...args: unknown[]) => c(...lazyval(...args)),
    };
}
