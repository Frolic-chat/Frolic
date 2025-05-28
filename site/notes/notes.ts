import { SiteSession, SiteSessionInterface } from '../site-session';
//import { Commands, ComposeApiRequest } from './interfaces';

import electronLog from 'electron-log';
const log = electronLog.scope('note-reader');

import { EventBus } from '../../chat/preview/event-bus';

export class NotesAPI implements SiteSessionInterface {
    constructor(private session: SiteSession) {}

    async start(): Promise<void> {
        log.debug('note-reader.start');
        // await this.fetchNotes();
    }

    async stop(): Promise<void> {
        log.debug('note-reader.stop');
    }

    async runArbitraryFetch(): Promise<void> {

    }

    /** Arbitrary commands -
     * How necessary are these things, or should we just use runArbitraryFetch?
     * Certainly any of these that return peculiar data should exist.
     */

    private async fetchNotes(): Promise<void> {
        // try {
        //     const res = await this.session.get('json/notes-get.json', true);

        //     if (res.statusCode = 200) {
        //         const data = JSON.parse(res.body);

        //         log.debug('fetchNotes.success', data);
        //         EventBus.$emit('notes-update', data);
        //     }
        //     else {
        //         log.warn('fetchNotes.return.misc', res.statusCode);
        //     }
        // }
        // catch (e) {
        //     log.error('fetchNotes.error', e);
        // }
    }

    private async readNote(noteId: number): Promise<void> {
        // try {
        //     const res = await this.session.post('json/notes-read.json', { body: { id: noteId }});

        //     if (res.statusCode === 200) {
        //         const data = JSON.parse(res.body);

        //         log.debug('readNote.success', data);
        //         EventBus.$emit('note-read', data);
        //     }
        //     else {
        //         log.warn('readNotes.return.misc', res.statusCode);
        //     }
        // }
        // catch (err) {
        //     log.error('readNote.error', err);
        // }
    }

    async getNotes(): Promise<void> {
        // log.debug('getNotes');
        // await this.fetchNotes();
    }

    async readSpecificNote(noteId: number): Promise<void> {
        // log.debug('readSpecificNote', noteId);
        // await this.readNote(noteId);
    }
}

log.info('init.notes');
