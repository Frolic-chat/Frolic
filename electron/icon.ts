import fs from 'fs';
import path from 'path';

// Move to constants/developer-config?
const iconDir = path.join(__dirname, 'icons');

export default function (platform: NodeJS.Platform): string {
    const ext = platform === 'win32' ? 'ico' : 'png';
    const icons = fs.readdirSync(iconDir).filter(file => file.endsWith(ext));

    if (icons.length > 0) {
        const random_icon = icons[Math.floor(Math.random() * icons.length)];
        return path.join(iconDir, random_icon);
    }
    else {
        return '';
    }
}
