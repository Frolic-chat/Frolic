import * as fs from 'fs';
import * as path from 'path';

/**
 * This ended up becoming a version of the one from Logs in renderer, though not identical.
 * @param baseDir
 * @returns
 */
export async function getAvailableCharacters(baseDir: string): Promise<string[]> {
    fs.mkdirSync(baseDir, { recursive: true });
    const files = await fs.promises.readdir(baseDir, { withFileTypes: true });
    return files.reduce(
        (box, f) => {
            if (f.isDirectory())
                box.push(f.name);

            return box;
        },
        [] as string[]
    );
}

export function getCharacterSettingsDir(baseDir: string, character: string, create: boolean = false): string {
    const dir = path.join(baseDir, character, 'settings');

    if (create)
        fs.mkdirSync(dir, { recursive: true });

    return dir;
}
