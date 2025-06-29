import { platform } from "process";
import { execSync } from "child_process";

export function FindExeFileFromName(exe: string): string {
    if (platform === 'win32') {
        const bp = exe + (exe.endsWith('.exe') ? '' : '.exe');
        return execSync(`where.exe /r "c:\\Program Files" "${bp}"`, { encoding: 'utf-8', timeout: 3000 })
                .trim().split('\n', 2)[0];
    }
    else if (platform === 'linux' || platform === 'darwin') {
        return execSync(`which '${exe}'`, { encoding: 'utf-8', timeout: 3000 })
                .trim().split('\n', 2)[0];
    }
    else {
        return '';
    }
}
