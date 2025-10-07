//import Vue from 'vue';
import type { ErrorEvent } from '../chat/preview/event-bus';

export type CapturedError = {
    source:   ErrorEvent['source'],
    type?:    string,
    message:  string,
    tooltip?: string,
    fatal?:   boolean,
};

//export const store = Vue.observable<Record<string, CapturedError>>({});
export const store: Record<ErrorEvent['source'] | string, CapturedError> = {};

export function capture(e: ErrorEvent): void {
    store[e.source] = {
        source:  e.source,
        type:    e.type,
        message: e.message.slice(0, 100),
        fatal:   e.fatal,
    };

    if (e.source === 'index') {
        store[e.source].tooltip = 'Startup error. Uncertain cause.';
    }
    else if (e.source === 'eicon') {
        store[e.source].tooltip = /timestamp/.test(e.source)
            ? 'Timestamp error in local eicon file. Did you touch eicons2.json?!'
            : 'Eicon search will not work until a connection can be established.';
    }
    else if (e.source === 'core') {
        store[e.source].tooltip = /backing store/.test(e.message)
            ? 'Is Frolic already running in the background?'
            : "Unusual error... Is Frolic already running in the background?";
    }

    // log.debug('errSetter', e);
}
