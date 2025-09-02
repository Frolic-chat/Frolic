import path from 'path';
import MainLogger from 'electron-log/main';
import { PathVariables, LogMessage } from 'electron-log';

export default function (logDir: string): void {
    MainLogger.initialize();

    MainLogger.transports.file.resolvePathFn = (_var: PathVariables, msg: LogMessage | undefined) => {
        const file = msg?.level === 'warn' || msg?.level === 'error' ? 'error.log' : 'app.log';

        return path.join(logDir, file);
    };

    MainLogger.error('debug.electron-log', { fileName: MainLogger.transports.file.fileName, getFile: MainLogger.transports.file.getFile().path });
}
