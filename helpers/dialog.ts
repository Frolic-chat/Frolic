import * as Electron from 'electron';
import l from '../chat/localize';

export async function confirmDialog(message: string, { yes, no }: { yes?: string, no?: string } = {}): Promise<boolean> {
    const result = await Electron.ipcRenderer.invoke('dialog',
        'showMessageBox', {
            message,
            title:     l('title'),
            type:      'question',
            buttons:   [ yes ?? l('confirmYes'), no ?? l('confirmNo') ],
            defaultId: 1,
            cancelId:  1,
        } as Electron.MessageBoxOptions
    ) as number;

    console.log(result);

    return result === 0;
};
