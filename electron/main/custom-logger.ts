// SPDX-License-Identifier: AGPL-3.0-or-later
import Logger from 'electron-log/main';
import { LogType } from '../common';

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
export default function NewLogger(scope: LogType, condition?: (...a: any) => any) {
    const c = process.argv.includes('--debug-' + scope);
    const cond = condition ?? (() => c);

    const l = Logger.scope(scope);
    return {
        debug:   (...args: any) => { if (cond(...args)) l.debug(...args)   },
        error:   (...args: any) => { if (cond(...args)) l.error(...args)   },
        info:    (...args: any) => { if (cond(...args)) l.info(...args)    },
        log:     (...args: any) => { if (cond(...args)) l.log(...args)     },
        silly:   (...args: any) => { if (cond(...args)) l.silly(...args)   },
        verbose: (...args: any) => { if (cond(...args)) l.verbose(...args) },
        warn:    (...args: any) => { if (cond(...args)) l.warn(...args)    },

        eval:    (...args: any) => cond(...args),
    };
}
