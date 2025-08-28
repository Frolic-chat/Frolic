import fs from 'fs';
import path from 'path';

export default function (platform: NodeJS.Platform, name: string, dir: string, random?: boolean): string {
    const ext = platform === 'win32' ? 'ico' : 'png' as const;

    // Random icon detection
    if (random && fs.existsSync(dir)) {
        const icons = fs.readdirSync(dir).filter(file => file.startsWith(name) && file.endsWith(ext));

        if (icons.length) {
            const random_icon = icons[Math.floor(Math.random() * icons.length)];
            return path.join(dir, random_icon);
        }
    }

    return predictableIcon(platform, name);
}

export function predictableIcon(platform: NodeJS.Platform, name: string) {
    if (name === 'icon') {
        return path.join(
            __dirname,
            platform === 'win32'
                ? <string>require('../build/icon.ico')
                : <string>require('../build/icon.png')
        );
    }
    else if (name === 'badge') {
        return path.join(
            __dirname,
            platform === 'win32'
                ? <string>require('../build/badge.ico')
                : <string>require('../build/badge.png')
        );
    }
    else if (name === 'tray') {
        return path.join(
            __dirname,
            platform === 'win32'
                ? <string>require('../build/icon.ico')
                : <string>require('../build/tray.png')
        );
    }
    else if (name === 'tray-badge') {
        return path.join(
            __dirname,
            platform === 'win32'
                ? <string>require('../build/badge.ico')
                : <string>require('../build/tray-badge.png')
        );
    }
    else {
        return ''; // We can't be sure we won't invoke this as something else.
    }
}
