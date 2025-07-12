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

/**
 * A fast randomization algorithm.
 * @param arr An array to be randomized; will be modified in-place
 */
export async function FisherYatesShuffle(arr: any[]): Promise<void> {
    for (let cp = arr.length - 1; cp > 0; cp--) {
        const np = Math.floor(Math.random() * (cp + 1));
        [arr[cp], arr[np]] = [arr[np], arr[cp]];
    }
}

