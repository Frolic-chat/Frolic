import { SiteSession, SiteSessionInterface } from './site-session';
import { EventBus } from '../chat/preview/event-bus';
import core from '../chat/core';

import NewLogger from '../helpers/log';
const log = NewLogger('note-checker', () => core.state.generalSettings.argv.includes('--debug-notes'));

export interface NoteCheckerCount {
  unreadNotes: number;
  unreadMessages: number;
  onlineUsers: number;
}

export class NoteChecker implements SiteSessionInterface {
    private static readonly CHECK_FREQUENCY = 15 * 60 * 1000;

    private latestCount: NoteCheckerCount = {
        unreadNotes: 0,
        unreadMessages: 0,
        onlineUsers: 0,
    };
    private timer?: any;

    constructor(private session: SiteSession) {}

    async start(): Promise<void> {
        try {
            await this.stop();
            await this.check();

            this.timer = setInterval(
                async() => {
                    try {
                        await this.check();
                    }
                    catch (err) {
                        log.error('notechecker.check.error', err);
                    }
                },
                NoteChecker.CHECK_FREQUENCY
            );
        }
        catch (err) {
            log.error('notechecker.start.error', err);
        }
    }

    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            delete this.timer;
        }

        this.latestCount = { unreadNotes: 0, unreadMessages: 0, onlineUsers: 0 };
    }

    private async check(): Promise<NoteCheckerCount> {
        log.debug('notechecker.check');

        if (!core.state.settings.risingShowUnreadOfflineCount)
            return this.latestCount;

        try {
            const res = await this.session.get('', true);

            const messagesMatch: RegExpMatchArray | null = res.body.match(/NavigationMessages.*?([0-9]+?) Messages/);
            const notesMatch: RegExpMatchArray | null    = res.body.match(/NavigationNotecount.*?([0-9]+?) Notes/);
            const statsMatch: RegExpMatchArray | null    = res.body.match(/Frontpage_Stats.*?([0-9]+?) characters/);

            log.debug('notechecker.match.values', messagesMatch?.[1], notesMatch?.[1], statsMatch?.[1]);

            this.latestCount.unreadNotes    = parseInt((notesMatch?.[1]    ?? '0'), 10),
            this.latestCount.unreadMessages = parseInt((messagesMatch?.[1] ?? '0'), 10),
            this.latestCount.onlineUsers    = parseInt((statsMatch?.[1]    ?? '0'), 10),

            log.debug('notechecker.check.success', this.latestCount);
            EventBus.$emit('note-counts-update', this.latestCount);
        }
        catch (e) {
            console.warn(`notechecker.check.failure at ${new Date()}.`, e);
        }

        return this.latestCount;
    }

    incrementMessages(): void {
        this.latestCount.unreadMessages++;
        EventBus.$emit('note-counts-update', this.latestCount);
    }

    incrementNotes(): void {
        this.latestCount.unreadNotes++;
        EventBus.$emit('note-counts-update', this.latestCount);
    }

    getCounts(): NoteCheckerCount {
        return this.latestCount;
    }
}
