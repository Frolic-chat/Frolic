import { AxiosError, AxiosResponse, CanceledError } from 'axios';
import {InlineDisplayMode, Settings, SimpleCharacter} from '../interfaces';
import { dialog } from 'electron';

import NewLogger from '../helpers/log';
const log = NewLogger('site/utils');

type FlashMessageType = 'info' | 'success' | 'warning' | 'danger';
type FlashMessageImpl = (type: FlashMessageType, message: string) => void;

let flashImpl: FlashMessageImpl = (type: FlashMessageType, message: string) => {
    console.log(`${type}: ${message}`);
};

export function setFlashMessageImplementation(impl: FlashMessageImpl): void {
    flashImpl = impl;
}

export function avatarURL(name: string): string {
    const uregex = /^[a-zA-Z0-9_\-\s]+$/;

    if (!uregex.test(name))
        return '#';

    return `${staticDomain}images/avatar/${name.toLowerCase()}.png`;
}

export function characterURL(name: string): string {
    const uregex = /^[a-zA-Z0-9_\-\s]+$/;
    if(!uregex.test(name)) return '#';
    return `${siteDomain}c/${name}`;
}

/** https://github.com/axios/axios/issues/5153
 * axios.isCancel(error) asserts value is Cancel, which has message, which
 * implies error can't have message, which means error can't be AxiosError
 * as AxiosError has message, causing typescript to flip its lid.
 */
function isCancel(value: Error | CanceledError<never>): boolean {
    if (value instanceof CanceledError) {
        if (process.env.NODE_ENV === 'development') {
            log.error('Canceled a request.', { value });
            dialog.showErrorBox("isCancel error!", "check log.");
        }

        return true;
    }
    return false;
}

//tslint:disable-next-line:no-any
export function isJSONError(error: any): error is AxiosError & { response: AxiosResponse } {
    const err = error instanceof AxiosError && error.response !== undefined && typeof error.response.data === 'object';

    if (err) {
        log.warn('isJSONError.error', { error });

        if (process.env.NODE_ENV === 'development')
            dialog.showErrorBox("isJSONError error!", "check log.");
    }

    return err;
}

export function ajaxError(error: any, prefix: string, showFlashMessage: boolean = true): void { //tslint:disable-line:no-any
    let message: string | undefined;
    if (error instanceof Error) {
        if (isCancel(error))
            return;

        if (isJSONError(error)) {
            const data = <{error?: string | string[]}>error.response.data;
            if (typeof data.error === 'string')
                message = data.error;
            else if (typeof data.error === 'object' && data.error.length > 0)
                message = data.error[0];
        }

        if (message === undefined)
            message = (<Error & {response?: AxiosResponse}>error).response !== undefined
                ? (<Error & {response: AxiosResponse}>error).response.statusText
                : error.name;
    }
    else {
        message = <string>error;
    }

    console.error(error);

    if (showFlashMessage) flashError(`[ERROR] ${prefix}: ${message}`);
}

export function flashError(message: string): void {
    flashMessage('danger', message);
}

export function flashSuccess(message: string): void {
    flashMessage('success', message);
}

export function flashMessage(type: FlashMessageType, message: string): void {
    flashImpl(type, message);
}

export let siteDomain   = '';
export let staticDomain = '';

export let settings: Settings = {
    animateEicons: true,
    inlineDisplayMode: InlineDisplayMode.DISPLAY_ALL,
    defaultCharacter: -1,
    fuzzyDates: true
};

export let characters: SimpleCharacter[] = [];

export function setDomains(site: string, stat: string): void {
    siteDomain = site;
    staticDomain = stat;
}

export function init(s: Settings, c: SimpleCharacter[]): void {
    settings = s;
    characters = c;
}

function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // $& means the whole matched string
}

export function replaceAll(str: string, find: string, replace: string): string {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
