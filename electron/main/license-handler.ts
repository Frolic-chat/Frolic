import path from "path";
import * as fs from 'fs/promises';
import { existsSync } from "fs";
import { ipcMain } from "electron";

let needs_preload = true;
export const licenses: string[] = [];
let license_dir = '';

export async function init(appPath?: string): Promise<boolean> {
    if (needs_preload) {
        if (!appPath || !(await preload(appPath)))
            return false;
    }

    registerIpcHandles();
    return true;
}

export async function preload(appPath: string): Promise<boolean> {
    license_dir = path.join(appPath, 'licenses');

    if (!existsSync(license_dir)) {
        needs_preload = true;
        return false;
    }

    try {
        const files = await fs.readdir(license_dir);
        licenses.length = 0;
        licenses.push(...files);

        needs_preload = false;
        return true;
    }
    catch {
        needs_preload = true;
        return false;
    }
}

function registerIpcHandles() {
    ipcMain.handle('get-license-files', async (): Promise<string[]> => licenses);

    ipcMain.handle('get-text-for-license', async (_e, filename): Promise<string> => {
        if (typeof filename !== 'string')
            return '';

        const f = path.join(license_dir, filename);

        try {
            const text = await fs.readFile(f, 'utf-8');
            return text;
        }
        catch (e) {
            console.warn(`License for ${f} failed to be gotten.`);
            return '';
        }
    })
}
