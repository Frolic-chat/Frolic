// SPDX-License-Identifier: AGPL-3.0-or-later
import Logger from 'electron-log/renderer';
import { LogType } from '../electron/common';

import core from '../chat/core';

/**
 * Ties electron-log to a custom condition. The condition is checked regardless of log level.
 *
 * Example:
 * ```ts
 * const log = NewLogger("Logger", () => settings.truthyCondition);
 * ```
 * @param scope Scope used by electron-log
 * @param condition Must be true to invoke logging
 * @returns A logger object with capabilities mapped to those of electron-log
 */
export default function NewLogger(scope: LogType, condition?: (...a: any) => any) {
    // Skips logging if default generalSettings. (argv empty by default)
    const s = core?.state.generalSettings.argv.includes('--debug-' + scope) ?? true;
    const c = condition ?? (() => s);

    const l = Logger.scope(scope);
    return {
        debug:   (...args: any) => { if (c(...args)) l.debug(...args)   },
        error:   (...args: any) => { if (c(...args)) l.error(...args)   },
        info:    (...args: any) => { if (c(...args)) l.info(...args)    },
        log:     (...args: any) => { if (c(...args)) l.log(...args)     },
        silly:   (...args: any) => { if (c(...args)) l.silly(...args)   },
        verbose: (...args: any) => { if (c(...args)) l.verbose(...args) },
        warn:    (...args: any) => { if (c(...args)) l.warn(...args)    },
    };
}
