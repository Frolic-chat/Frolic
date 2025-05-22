import { SiteSession, SiteSessionInterface } from '../site-session';

export class NotesUI implements SiteSessionInterface {
    constructor(private session: SiteSession) {}

    async start(): Promise<void> {}
    async stop(): Promise<void> {}
}
