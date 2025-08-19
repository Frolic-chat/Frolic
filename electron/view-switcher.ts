import * as Electron from 'electron';

import Logger from 'electron-log/main';
const log = Logger.scope('view-switcher');

/**
 * These are the Window.vue handlers for receiving events from main. But if this is handled in renderer, what's the point of main?
 */
// electron.ipcRenderer.on('switch-tab', (_e: IpcRendererEvent) => {
//     const index = this.tabs.indexOf(this.activeTab!);
//     this.show(this.tabs[index + 1 === this.tabs.length ? 0 : index + 1]);
// });
// electron.ipcRenderer.on('previous-tab', (_e: IpcRendererEvent) => {
//     const index = this.tabs.indexOf(this.activeTab!);
//     this.show(this.tabs[index - 1 < 0 ? this.tabs.length - 1 : index - 1]);
// });
// electron.ipcRenderer.on('show-tab', (_e: IpcRendererEvent, id: number) => {
//     this.show(this.tabMap[id]);
// });

/** These are the senders for the switch tab commands. */
// {
//     label: l('action.newTab'),
//     click: (_m, w) => {
//         if (hasCompletedUpgrades && tabCount < 3 && w instanceof Electron.BrowserWindow)
//             w.webContents.send('open-tab');
//     },
//     accelerator: 'CmdOrCtrl+t'
// },
// {
//     label: "hidden switch-tab accelerator",
//     accelerator: 'Ctrl+Tab',
//     click: (_m, w) => {
//         if (w instanceof Electron.BrowserWindow)
//             w.webContents.send('switch-tab');
//     },
//     visible: false,
// },
// {
//     label: "hidden previous-tab accelerator",
//     accelerator: 'Ctrl+Shift+Tab',
//     click: (_m, w) => {
//         if (w instanceof Electron.BrowserWindow)
//             w.webContents.send('previous-tab');
//     },
//     visible: false,
// },

Electron.ipcMain.handle('switch-character', async (_e, w: boolean) => {

});
