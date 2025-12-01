import Axios, { AxiosError } from 'axios';
import { EventBus } from '../../chat/preview/event-bus';

import core from '../../chat/core';

import NewLogger from '../../helpers/log';
const log = NewLogger('eicons', () => core.state?.generalSettings.argv.includes('--debug-eicons'));

export interface EIconRecordUpdate {
    eicon: string;
    action: '+' | '-';
}

export class EIconUpdater {
    static readonly FULL_DATA_URL   = 'https://xariah.net/eicons/Home/EiconsDataBase/base.doc';
    static readonly DATA_UPDATE_URL = 'https://xariah.net/eicons/Home/EiconsDataDeltaSince';

    async fetchAll(): Promise<{ eicons: string[], asOfTimestamp: number }> {
        const controller = new AbortController();

        let user_impatience = () => controller.abort("Xariah connection timeout.");
        let no_response = setTimeout(user_impatience, 8000);
        log.debug('eiconupdater.fetchall.timeout.start');

        /** How to handle wrong response type?
         * In theory Axios response is `any` type, in reality
         * Axios response types are ResponseType:
         * text, arraybuffer, blob, document, json, stream
         */
        const result = await Axios.get(
            EIconUpdater.FULL_DATA_URL, {
                signal: controller.signal,
                onDownloadProgress: () => {
                    log.debug('eiconupdater.fetchall.progress.datareceived');
                    clearTimeout(no_response);
                    no_response = setTimeout(user_impatience, 5000);
                },
                timeout: 15000,
                timeoutErrorMessage: 'Failed to get Xariah.net eicon database.',
            }
        )
        .catch((e) => {
            function isAxios (err: any): err is AxiosError { return err.isAxiosError; }

            if (isAxios(e) && e.response) { // Server responded with failure
                log.info('eicon.axios.err.response', e.response.status, e.response.headers);
                EventBus.$emit('error', {
                    source:  'eicon',
                    type:    'fetchAll.httpResponse',
                    message: `HTTP Response ${e.response.status ?? 'NONE'} from eicon server.`,
                });
            }
            else if (isAxios(e) && e.request) { // No response
                const r = (e.request as XMLHttpRequest);
                log.info('eicon.axios.err.request', { status: r.status, readyState: r.readyState });
                EventBus.$emit('error', {
                    source:  'eicon',
                    type:    'fetchAll.httpRequest',
                    message: 'There was no response from the eicon server.',
                });
            }
            else {
                log.info('eicon.axios.err.generic', { err: e });
                EventBus.$emit('error', {
                    source:  'eicon',
                    type:    'fetchAll.httpGeneric',
                    message: 'Miscellaneous error contacting the eicon server.',
                });
            }

            return undefined;
        });

        clearTimeout(no_response);

        if (!result)
            return { asOfTimestamp: 0, eicons: [] };

        const lines = (result.data as string).split('\n');

        const eicons = lines
                .filter(line => line.trim() !== '' && !line.trim().startsWith('#'))
                .map(line => line.split('\t', 2)[0].toLowerCase());

        const asOfLine = lines.find(line => line.startsWith('# As Of: '));
        const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

        if (!asOfTimestamp) {
            log.error('No "# As Of: " line found.');
            EventBus.$emit('error', {
                source:  'eicon',
                type:    'fetchAll.timestamp',
                message: "Didn't receive timestamp from eicon server.",
            });
        }

        return { asOfTimestamp, eicons };
    }

    async fetchUpdates(fromTimestampInSecs: number): Promise<{ recordUpdates: EIconRecordUpdate[], asOfTimestamp: number }> {
        const result = await Axios.get(`${EIconUpdater.DATA_UPDATE_URL}/${fromTimestampInSecs}`)
                .catch(() => undefined);

        if (!result)
            return { asOfTimestamp: fromTimestampInSecs, recordUpdates: [] };

        const lines = (result.data as string).split('\n');

        const recordUpdates = lines
                .filter(line => line.trim() !== '' && !line.trim().startsWith('#'))
                .map(line => {
                    const [action, eicon] = line.split('\t', 3);
                    return { action: action as '+' | '-', eicon: eicon.toLowerCase() };
                }
        );

        const asOfLine = lines.find(line => line.startsWith('# As Of: '));
        const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

        if (!asOfTimestamp) {
            log.error('No "# As Of: " line found.');
            EventBus.$emit('error', {
                source:  'eicon',
                type:    'fetchUpdates.timestamp',
                message: "Didn't receive timestamp from eicon server.",
            });
        }

        return { recordUpdates, asOfTimestamp };
    }
}
