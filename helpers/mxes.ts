/** MXES
 * User-level error handler.
 *
 * Contains "unexpected behaviors".
 */
import { MessageBoxOptions } from 'electron/renderer';
import * as Electron from 'electron';
import l from '../chat/localize';

import Logger from 'electron-log';
const log = Logger.scope('MXES');

/**
 * This is a key that aligns to the localization keys in localize.ts
 * Sadly, we don't have a definitive way to verify the key exists right now.
 * @see [localize.ts](../chat/localize.ts)
 */
type LocalizationKey = string & {};

/**
 * The required proficiency of the user to understand the error.
 * More technical errors should be less visible.
 */
type UserLevel = 'everyone' | 'detailed' | 'technical' | 'developer';
const DefaultUserLevel: UserLevel = 'everyone';

/**
 * The amount of attention the user needs to pay to the error. This is not a
 * measure of how deadly or important an error is, but how much it affects
 * the user's experience right now. For example. `never` is for errors that
 * will eventually work themselves out even when unaccounted for.
 */
type Immediacy = 'never' | 'eventual' | 'relaxed' | 'concern' | 'immediate';
const DefaultImmediacy: Immediacy = 'relaxed';

/**
 * An endpoint is one of the many places an error message could fit. Some
 * errors are more viable at certain endpoints. For example, the login screen
 * can fit multiple lines comfortably; the space above the conversation input
 * box is a single line.
 */
const EndPoint = {
    System: {
        Dialog: 'endpoint.system.dialog', Crash: 'endpoint.system.crash',
    },
    LoggedOut: {
        PreLogin: 'endpoint.loggedout.prelogin', Login: 'endpoint.loggedout.login',
    },
    Chat: {
        Message: 'endpoint.chat.message', Input: 'endpoint.chat.input',
        Console: 'endpoint.chat.console',
    },
    Modal: {
        CharacterSearch: 'endpoint.modal.charactersearch',
    },
} as const;

type DeepestValues<T> = T extends object
    ? { [K in keyof T]: DeepestValues<T[K]> }[keyof T]
    : T;
type EndPoint = DeepestValues<typeof EndPoint>;

type MXESErrorHandler = EndPoint | ((error: MXESError) => boolean);

/**
 * #### MXESError: An error class for "unexpected behaviors"
 *
 * There can be user-level issues that aren't errors but should still be handled like they are.
 * We classify these as "unexpected behaviors" suitable for handling by MXES.
 *
 * Extend MXESError however you like; preferably in ways that {@link MXES} can handle.
 *
 * A not insignificant portion of snippets were collected from various answers on
 * {@link https://stackoverflow.com/questions/1382107/whats-a-good-way-to-extend-error-in-javascript | Stack Overflow}.
 * This custom class is a veritable frankenstein of those advices. Perhaps many of them are
 * pointless in modern ts/js... but google is dead and qwen spits 3-year-old nonsense at me.
 */
export class MXESError extends Error {
    constructor(message?: string, options?: ErrorOptions & { key?: LocalizationKey, code?: number, url?: string, toString?: string | (() => string) }) {
        // Installs `message` and `cause` into error.
        super(message, options);

        this.name = this.constructor.name;

        // Old wisdom (TS Breaking Changes doc) says this is needed for
        // `MXESError instanceof Error => true`
        Object.setPrototypeOf(this, new.target.prototype);

        // There are some environments where there is no stacktrace available.
        // It's probably always available to us; this is just a safety net.
        if (Error.captureStackTrace)
            Error.captureStackTrace(this, this.constructor);

        if (typeof options?.toString === 'function')
            this.toString = options?.toString;
        else if (typeof options?.toString === 'string') {
            const s = options.toString;
            this.toString = () => s;
        }
    }

    /**
     * A string to pass to the `l()` translation function to get a current-language
     * message of the error.
     */
    key?:   LocalizationKey;
    code?:  number;
    url?:   string;
    fatal?: boolean;

    /**
     * The error should always have an easy-to-print message for single-line
     * output that gives both an easy to parse name and a cause, if possible.
     *
     * Please overwrite this on your custom error.
     * @returns one-liner error message a normal user can parse.
     */
    toString(): string {
        return this.key ? l(this.key) : this.name + ': ' + this.message
    };
}

/**
 * MXES: Contains "unexpected behaviors"
 */
interface MXES {
    /**
     * Trap an error with a given handler, or default handler if no handler is provided or available.
     * This is effectively a one-off invocation of {@link Register} then {@link Handle}.
     * @param error Any error; when handling with {@link EndPoint}, certain conditions may be expected.
     * @param handler The handler can be an `EndPoint` or a custom function with true/false return where a false value indicates failure to handle the error properly - such as a multi-line error message to a single-line error handler. If the handler is absent, MXES will choose one for you.
     * @returns `true` if the handler was invoked. `false` if it could not be invoked and a backup was invoked. In all cases, the error will not throw. (Otherwise, what was the point of trapping it?)
     */
    Trap(error: MXESError, handler?: MXESErrorHandler): boolean;

    /**
     * Register a new error type to an {@link EndPoint} or custom handler and return a MXES
     * instance tracking it. You can cancel the registration and tracking by calling {@link Unregister}.
     * @param error Any errortype string; when handling with an EndPoint, certain conditions may be expected.
     * @param handler The handler can be an EndPoint or a custom function with true/false return where a false value indicates failure to handle the error properly - such as a multi-line error message to a single-line error handler.
     * @returns a `MXES` instances to track the error.
     */
    Register(error: MXESError, handler: MXESErrorHandler): MXES;

    /**
     *
     * @param handler A new handler or endpoint to route errors to.
     */
    Reroute(handler: MXESErrorHandler): void;
    Unregister(): void;

    /**
     * A completely automatic error handler for {@link MXESError | MXESErrors}. The main entry
     * point for MXES. Just throw it an error, and MXES will figure out where it should go.
     * @param error a MXESError to handle
     */
    Handle(error: MXESError): boolean | void;
}

class MXES implements MXES {
    /** Singleton implementation */
    private constructor() {}
    private static instance: MXES;
    public static get Instance(): MXES {
        if (!MXES.instance)
            MXES.instance = new MXES();

        return MXES.instance;
    }
    private handlers: { [key: string]: Array<{ handler: MXESErrorHandler,
                                         userlevel: UserLevel,
                                         immediacy: Immediacy }>} = {};

    /**
     * A one-time invocation of {@link Handle} using the provided handler.
     */
    static trap(error: MXESError, handler?: MXESErrorHandler): boolean {
        if (!handler) {
            MXES.handle(error);
            return false
        }
        else if (typeof handler === 'function') {
            handler(error);
            return true
        }
        else if (typeof handler === 'string') {
            MXES.EndPoints[handler](error);
            return true
        }
        else {
            return false
        }
    };

    /**
     * Register an error with a particular handler; the handler
     */
    static register(errorName: string,
                    handler: MXESErrorHandler,
                    { userlevel = DefaultUserLevel, immediacy = DefaultImmediacy } = {}
                   ): boolean {
        const i = MXES.Instance;

        if (!(errorName in i.handlers))
            i.handlers[errorName] = [];

        // TODO: How do we verify there isn't already a handler for that userlevel, immediacy, and error?
        // Return false if we can't register.

        i.handlers[errorName].push({ handler, userlevel, immediacy });

        return true;
    };

    static unregister(errorName: string): void {
        const i = MXES.Instance;

        // TODO: Implement unregistering at the userlevel/immediacy level.
        // IE: "Remove handler for error.name at level 'concern' and 'now'"

        delete i.handlers[errorName];
    };

    static handle(error: MXESError): void {
        const i = MXES.Instance;

        const handlers = i.handlers[error.name] || [];

        for (const { handler, userlevel, immediacy } of handlers) {
            // TODO: how to figure out if there's a handler for that specific userlevel and immediacy?

            // if (!handler)
            //     MXES.handle(error); // Default handler, rawdog it.
            // if (typeof handler === 'function')
            //     handler(error);
            // else if (typeof handler === 'string')
            //     MXES.EndPoints[handler](error);
        }

    //     if (error.fatal)
    //         i.BasicError(error.name, error.toString(), 'error');
    //     else
    //         i.Popup('everyone', 'immediate', error);
    };

    private static shouldHandle(level: UserLevel, immediacy: Immediacy): boolean {
        const i = MXES.Instance;
        // TODO: Implement logic.
        return true;
    }


    /** HANDLERS
     * These are the private functions that actually do something with your error.
     * Everything before this was just routing. These are the actual dialog boxes,
     * app crashes, and message injections.
    */
    /**
     * Determines the need of a particular error and invokes the relevant handler.
     * @param level The proficiency of the user necessary to understand the error
     * @param need The immediacy of the error
     */
    private static Popup(level: UserLevel, need: Immediacy, error: MXESError): boolean {
        const i = MXES.Instance;

        Electron.dialog.showMessageBox({
            title: `Frolic - ${error.name}`,
            message: error.key ? l(error.key) : error.message,
            type: 'warning',
            buttons: [],
        });

        return true;
    };

    private static BasicError(title: string, message: string, type: MessageBoxOptions['type'] ): void {
    };

    private static EndPoints: Record<EndPoint, (...args: any) => boolean> = {
        'endpoint.system.dialog': MXES.Popup,
        "endpoint.system.crash": MXES.Popup,
        "endpoint.chat.console": MXES.Popup,
        "endpoint.chat.input": MXES.Popup,
        "endpoint.chat.message": MXES.Popup,
        "endpoint.loggedout.login": MXES.Popup,
        "endpoint.loggedout.prelogin": MXES.Popup,
        "endpoint.modal.charactersearch": MXES.Popup,
    };
}

export default MXES;
export { EndPoint };
