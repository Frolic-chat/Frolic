/** MXES
 * User-level error handler - contains "unexpected behaviors".
 */

import * as electron from 'electron';
import { MessageBoxOptions } from 'electron';

import l from '../chat/localize';

type LocalizationKey = string & {};

type UserLevel = 'everyone' | 'detailed' | 'technical' | 'developer';
type Immediacy = 'eventual' | 'relaxed' | 'concern' | 'immediate';

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
    constructor(message?: string, options?: ErrorOptions & { key?: LocalizationKey, code?: number, url?: string }) {
        // Installs `message` and `cause` into error.
        super(message, options);

        this.name = this.constructor.name;

        // Old wisdom (TS Breaking Changes doc) says this is needed for
        // `MXESError instanceof Error => true`
        Object.setPrototypeOf(this, new.target.prototype);

        if (Error.captureStackTrace)
            Error.captureStackTrace(this, this.constructor);
    }

    /**
     * A string to pass to the `l()` translation function to get a current-language
     * message of the error.
     */
    key?:    LocalizationKey;
    code?:   number;
    url?:    string;

    toString(): string { return this.key ? l(this.key) : this.name + ': ' + this.message };
}

/**
 * MXES: Contains "unexpected behaviors"
 */
export default class MXES {
    /**
     * Determines the need of a particular error and invokes the relevant handler.
     * @param level The proficiency of the user necessary to understand the error
     * @param need The immediacy of the error
     */
    static popup(level: UserLevel, need: Immediacy, e: MXESError) {
        electron.dialog.showMessageBox({
            title: `Frolic - ${e.name}`,
            message: e.key ? l(e.key) : e.message,
            type: 'warning',
            buttons: [],
        });
    };

    /**
     * A completely automatic error handler for {@link MXESError | MXESErrors}
     * @param e a MXESError to handle
     */
    static handle(e: MXESError) { this.popup('everyone', 'immediate', e)};

    private static BasicError(title: string, translationKey: LocalizationKey, type: MessageBoxOptions['type'] ): void {
    };
}
