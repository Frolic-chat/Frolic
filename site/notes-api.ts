// SPDX-License-Identifier: AGPL-3.0-or-later
import { SiteSession, SiteSessionInterface } from './site-session';
import core from '../chat/core';
import EventBus from '../chat/preview/event-bus';

import NewLogger from '../helpers/log';
const log = NewLogger('notesAPI', () => core.state.generalSettings.argv.includes('--debug-notes'));

export type TempNoteFormat = {
    note_id: number;
    title: string;
    message: string;
    source_character_id: number;
    source_name: string;
    dest_name: string;
    dest_character_id: string;
    datetime_sent: string; // ???
    folder_id: number;
    read: number;
    starred: number;
}

export type TempNormalNoteReturn = {
    total: number | null,
    latest?: TempNoteFormat,
}

export default class NotesApi implements SiteSessionInterface {
    constructor(private session: SiteSession) {}

    unreadCount = 0;
    unreadNotes: TempNoteFormat[] = [];

    async start(): Promise<void> {
        try {
            await this.stop();
        }
        catch (e) {
            log.error('notesAPI.start.error.stop', e);
        }

        try {
            this.updateUnread();
        }
        catch (e) {
            log.error('notesAPI.start.error.updateUnread', e);
        }
    }

    async stop(): Promise<void> {}

    private async searchUser(name: string, qs?: { offset?: number, amount?: number }): Promise<{ notes: TempNoteFormat[], total: number | null }> {
        const ret: { notes: TempNoteFormat[], total: number | null } = {
            notes: [],
            total: null,
        };

        const opts = {
            qs: {
                name,
                offset: qs?.offset ?? 0,
                amount: (qs?.amount ?? 0) > 0 ? qs?.amount : 1,
            },
            json: true,
        }

        try {
            const res = await this.session.get('json/notes-searchuser.json', opts);

            log.warn('NotesApi.searchUser.res', res.body);

            if (res.body) {
                ret.notes = res.body.notes as TempNoteFormat[];
                ret.total = res.body.total as number;
            }
        }
        catch (e) {
            log.error('NotesApi.searchUser.catch', e);
        }
        finally {
            return ret;
        }
    }

    async getCount(name: string, latest: boolean = false): Promise<{ total: number | null, latest?: TempNoteFormat }> {
        const res = await this.searchUser(name, { offset: 0, amount: latest ? 1 : undefined });
        return {
            total: res.total,
            latest: res.notes[0],
        };
    }

    async getLatestFrom(name: string, amount: number = 1): Promise<TempNoteFormat[]> {
        const res = await this.searchUser(name, { offset: 0, amount });

        return res.notes;
    }

    async getAllBetween(    myCharacter:   string,
                            theirCharacter: string,
                        ): Promise<{ total?: number | null, latest?: TempNoteFormat, notes: TempNoteFormat[] }> {
        let latest_id = 0; // Order seems to be reliable, but I don't trust it.
        let offset = 0;
        let ret: { total: number, latest?: TempNoteFormat, notes: TempNoteFormat[] } = {
            total: 0,
            notes: [],
        };
        const request_amount = 20;

        let response = await this.searchUser(theirCharacter, { offset, amount: request_amount });

        // log.debug('NotesApi.getAllBetween.res.total', res.total);

        while (true) {
            for (const note of response.notes) {
                if (note.source_name === theirCharacter && note.dest_name === myCharacter
                ||  note.source_name === myCharacter && note.dest_name === theirCharacter) {
                    ret.total++;
                    ret.notes.push(note);

                    if (note.note_id > latest_id) {
                        ret.latest = note;
                        latest_id = note.note_id;
                    }
                }
                else {
                    log.debug('NotesApi.getLatestIncoming.noMatch', { to: note.source_name, from: note.dest_name });
                }
            }

            log.debug('NotesApi.getAllBetween.return.count', ret.notes.length);

            offset += request_amount;

            if (response.notes.length !== request_amount)
                break;

            response = await this.searchUser(theirCharacter, { offset, amount: request_amount });
        };

        return ret;
    }

    getUnread(): { notes: TempNoteFormat[], total: number | null } {
        return { notes: this.unreadNotes, total: this.unreadCount };
    }

    /**
     * getUnread but first request new unread from the server.
     */
    async getUnreadAsync(): Promise<{ notes: TempNoteFormat[], total: number | null }> {
        await this.updateUnread();
        return this.getUnread();
    }

    /**
     * This will trigger the EventBus event for a new note if it detects one.
     */
    async updateUnread(): Promise<void> {
        let emit_event = false;

        const ret: { notes: TempNoteFormat[], total: number | null } = {
            notes: [],
            total: null,
        };

        const opts = {
            qs: {
                offset: 0,
                amount: 10,
                folder: 1, // irrelevant
            },
            json: true,
        }
        try {
            const res = await this.session.get('json/notes-getunread.json', opts);

            log.warn('NotesApi.updateUnread.res', res.body);

            if (res.body) {
                ret.notes = res.body.notes as TempNoteFormat[];
                ret.total = res.body.total as number;

                if (res.body.total !== this.unreadCount || res.body.notes[0] !== this.unreadNotes[0])
                    emit_event = true;

                this.unreadNotes = res.body.notes;
                this.unreadCount = res.body.total;
            }
        }
        catch (e) {
            log.error('NotesApi.updateUnread.catch', e);
        }

        if (emit_event)
            EventBus.$emit('notes-api', { type: 'unread' });
    }
}
