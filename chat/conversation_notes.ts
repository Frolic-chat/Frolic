// SPDX-License-Identifier: AGPL-3.0-or-later
import type { TempNoteFormat } from '../site/note-types';

export interface NoteSummary {
    note_id: number;

    title:         string;
    datetime_sent: string; // "12 days, 960 hours ago"

    source_name: string;
    dest_name:   string;

    read:    number; // boolean
    starred: number; // boolean
}

type Temp_NoteId = number & {};

/**
 * Already broken up by character
 */
export default class ConversationNoteManager {
    /**
     * ID -> Note list.
     */
    private _notes: Map<Temp_NoteId, NoteSummary> = new Map();

    private latestNote?: TempNoteFormat;

    private _initialized = false;

    get initialized() {
        return this._initialized;
    }

    /**
     * Providing the optional initialList to the constructor will set the state to initialized.
     */
    constructor(initialList?: TempNoteFormat[]) {
        if (initialList) {
            this.add(initialList);
            this._initialized = true;
        }
    }

    find(identifyingFactors: Partial<NoteSummary> = {}): NoteSummary[] {
        const results: NoteSummary[] = [];

        if (!this._initialized)
            return results;

        for (const note of this._notes.values()) {
            let matches = true;

            for (const [ factor, requirement ] of Object.entries(identifyingFactors)) {
                if (note[factor as keyof NoteSummary] !== requirement) {
                    matches = false;
                    break;
                }
            }

            if (matches)
                results.push(note);
        }

        return results;
    }

    /**
     * @param id A presumably unique numerical id.
     * @returns A single note matching the id, or undefined
     */
    byId(id: number): NoteSummary | undefined {
        return this._notes.get(id);
    }

    get latest() {
        return this.latestNote;
    }

    get count(): number {
        return this._notes.size;
    }

    /**
     * Do not add special runtime functions to this adder; it's meant as a boring wrapper for bulk or external access, nothing fancy. Interally we should always be able to just use this._notes.set() and achieve the same effect.
     */
    public add(notes: TempNoteFormat[]) {
        notes.forEach(note => {
            if (typeof note.note_id === 'number') {
                this._notes.set(note.note_id, {
                    note_id:        note.note_id,
                    title:          note.title,
                    datetime_sent:  note.datetime_sent,
                    source_name:    note.source_name,
                    dest_name:      note.dest_name,
                    read:           note.read,
                    starred:        note.starred,
                });

                if (!this.latestNote || note.note_id > this.latestNote.note_id)
                    this.latestNote = note;
            }
        });
    }

    /**
     * Initialize the collection with your initial items. We require external input specifically so we don't have to rely on any particular mechanism to get us a list. An imagined list is just as good as one from an API; this is a note *manager*, so it should be unconcerned with other duties.
     * @param initialList
     */
    public init(initialList: TempNoteFormat[]) {
        this.add(initialList);

        this._initialized = true;
    }

    public uninit() {
        this._notes.clear();

        this._initialized = false;
    }
}
