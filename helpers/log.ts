import Logger from 'electron-log/renderer';

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
export default function NewLogger(scope: string, condition?: (...a: any) => any) {
    // const settings_check = () => !(`log${scope}` in core.state.generalSettings) || (core.state.generalSettings as any)[`log${scope}`]

    const cond = condition ?? (() => true);

    const l = Logger.scope(scope);
    return {
        debug:   (...args: any) => { if (cond(...args)) l.debug(...args)   },
        error:   (...args: any) => { if (cond(...args)) l.error(...args)   },
        info:    (...args: any) => { if (cond(...args)) l.info(...args)    },
        log:     (...args: any) => { if (cond(...args)) l.log(...args)     },
        silly:   (...args: any) => { if (cond(...args)) l.silly(...args)   },
        verbose: (...args: any) => { if (cond(...args)) l.verbose(...args) },
        warn:    (...args: any) => { if (cond(...args)) l.warn(...args)    },
    };
}
