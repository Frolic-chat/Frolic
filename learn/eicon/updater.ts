import Axios, { AxiosError } from 'axios';
import { EventBus } from '../../chat/preview/event-bus';
import log from 'electron-log';

export interface EIconRecord {
  eicon: string;
  timestamp: number;
}

export interface EIconRecordUpdate extends EIconRecord {
  action: '+' | '-';
}

export class EIconUpdater {
  static readonly FULL_DATA_URL   = 'https://xariah.net/eicons/Home/EiconsDataBase/base.doc';
  static readonly DATA_UPDATE_URL = 'https://xariah.net/eicons/Home/EiconsDataDeltaSince';

  async fetchAll(): Promise<{ records: EIconRecord[], asOfTimestamp: number }> {
    const controller = new AbortController();

    let user_impatience = () => controller.abort("Xariah connection timeout.")
    let no_response = setTimeout(user_impatience, 20000);
    log.debug('eiconupdater.fetchall.timeout.start');

    // Do we yet error if the response is the wrong type?
    var result = await Axios.get(
        EIconUpdater.FULL_DATA_URL, {
            //responseType =  type ResponseType = "text" | "arraybuffer" | "blob" | "document" | "json" | "stream"
            signal: controller.signal,
            onDownloadProgress: () => {
                log.debug('eiconupdater.fetchall.progress.datareceived');
                clearTimeout(no_response);
                no_response = setTimeout(user_impatience, 20000);
            },
            timeout: 15000,
            timeoutErrorMessage: 'Failed to get Xariah.net eicon database.',
        }
    )
    .catch(function (e) {
        function isAxios (err: any): err is AxiosError { return err.isAxiosError; }

        if (isAxios(e) && e.response) { // Server responded with failure
            log.debug('eicon.axios.err.response', e.response.status, e.response.headers, e.response.data);
            EventBus.$emit(
                'error', {
                    source: 'eicon.fetchall', type: 'http response',
                    message: `HTTP Response ${e.response.status} from eicon server: ${e.response.data}`,
                }
            );
        }
        else if (isAxios(e) && e.request) { // No response
            const r = (e.request as XMLHttpRequest);
            log.debug('eicon.axios.err.request', { status: r.status, readyState: r.readyState });
            EventBus.$emit(
                'error', {
                    source: 'eicon.fetchall', type: 'http request',
                    message: 'There was no response from the eicon server.',
                }
            );
        }
        else {
            log.debug('eicon.axios.err.generic', { err: e });
            EventBus.$emit(
                'error', {
                    source: 'eicon.fetchall', type: 'http generic',
                    message: 'Miscellaneous error contacting the eicon server.',
                }
            );
        }

        return undefined;
    });

    clearTimeout(no_response);

    if (!result)
        return { records: [], asOfTimestamp: 0 };

    const lines: string[] = (result.data as string).split('\n');

    const records = lines.filter(
        (line) => (line.trim().substring(0, 1) !== '#' && line.trim() !== '')
    )
    .map((line) => {
        const [eicon, timestamp] = line.split('\t', 2);
        return { eicon: eicon.toLowerCase(), timestamp: parseInt(timestamp, 10) };
    });

    const asOfLine = lines.find((line) => line.substring(0, 9) === '# As Of: ');
    const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

    if (!asOfTimestamp) {
        console.error('No "# As Of: " line found.');
        EventBus.$emit(
            'error', {
                source: 'eicon.fetchall.timestamp',
                type: typeof undefined,
                message: 'Response from eicon server did not contain expected timestamp.',
            }
        );
    }

    return { records, asOfTimestamp };
  }

  async fetchUpdates(fromTimestampInSecs: number): Promise<{ recordUpdates: EIconRecordUpdate[], asOfTimestamp: number }> {
    const result = await Axios.get(`${EIconUpdater.DATA_UPDATE_URL}/${fromTimestampInSecs}`);
    const lines: string[] = (result.data as string).split('\n');

    const recordUpdates = lines.filter(
        (line) => (line.trim().substring(0, 1) !== '#' && line.trim() !== '')
    )
    .map((line) => {
        const [action, eicon, timestamp] = line.split('\t', 3);
        return { action: action as '+' | '-', eicon: eicon.toLowerCase(), timestamp: parseInt(timestamp, 10) };
    });

    const asOfLine = lines.find((line) => line.substring(0, 9) === '# As Of: ');
    const asOfTimestamp = asOfLine ? parseInt(asOfLine.substring(9), 10) : 0;

    if (!asOfTimestamp) {
        console.error('No "# As Of: " line found.');
        EventBus.$emit(
            'error', {
                source: 'eicon timestamp failure',
                type: typeof undefined,
                message: 'No timestamp found in Xariah response. Attempting graceful recovery.',
            }
        );
    }

    return { recordUpdates, asOfTimestamp };
  }
}
