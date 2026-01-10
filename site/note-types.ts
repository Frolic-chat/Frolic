// SPDX-License-Identifier: AGPL-3.0-or-later
export type NoteCommand =
    | 'init' | 'start' | 'stop';

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

export interface NoteStoreFramework {
    start(): Promise<boolean>;
    stop():  Promise<boolean>;
}
