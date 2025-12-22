import { SiteSession, SiteSessionInterface } from './site-session';
import core from '../chat/core';

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

export default class NotesApi implements SiteSessionInterface {
    constructor(private session: SiteSession) {}

    async start(): Promise<void> {
        try {
            await this.stop();
        }
        catch (err) {
            log.error('notesAPI.start.error', err);
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

            log.warn('NotesApi.searchUser.res', res);

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
        const res = await this.searchUser(name, { offset: 0, amount: latest ? 1 : 0 });
        return {
            total: res.total,
            latest: res.notes[0],
        };
    }

    async getLatestIncoming(toCharacter: string, fromCharacter: string): Promise<{ total: number | null, latest?: TempNoteFormat }> {
        let latest_id = 0; // Order seems to be reliable, but I don't trust it.
        let offset = 0;
        let ret: { total: number, latest?: TempNoteFormat } = { total: 0 };
        const amount = 10;

        let res = await this.searchUser(fromCharacter, { offset, amount });

        log.debug('NotesApi.getLatestIncoming.res.total', res.total);

        while (res.notes.length = amount) {
            for (const note of res.notes) {
                if (note.source_name === fromCharacter && note.dest_name === toCharacter
                ||  note.source_name === toCharacter && note.dest_name === fromCharacter) {
                    ret.total++;

                    if (note.note_id > latest_id) {
                        ret.latest = note;
                        latest_id = note.note_id;
                    }
                }
                else {
                    log.debug('NotesApi.getLatestIncoming.noMatch', { to: note.source_name, from: note.dest_name });
                }
            }

            offset += amount;

            res = await this.searchUser(fromCharacter, { offset, amount });
        }

        return ret;
    }

    async getUnread(): Promise<{ notes: TempNoteFormat[], total: number | null }>  {
        const ret: { notes: TempNoteFormat[], total: number | null } = {
            notes: [],
            total: null,
        };

        const opts = {
            qs: {
                offset: 0,
                amount: 5,
                folder: 1, // irrelevant
            },
            json: true,
        }
        try {
            const res = await this.session.get('json/notes-getunread.json', opts);

            log.warn('NotesApi.getUnread.res', res);

            if (res.body) {
                ret.notes = res.body.notes as TempNoteFormat[];
                ret.total = res.body.total as number;
            }
        }
        catch (e) {
            log.error('NotesApi.getUnread.catch', e);
        }
        finally {
            return ret;
        }
    }
}
