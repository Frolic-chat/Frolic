import * as remote from '@electron/remote';
import l from '../chat/localize';

export class Dialog {
  static confirmDialog(message: string, { yes, no }: { yes?: string, no?: string } = {}): boolean {
    const result = remote.dialog.showMessageBoxSync({
      message,
      title: l('title'),
      type: 'question',
      buttons: [yes ?? l('confirmYes'), no ?? l('confirmNo')],
      defaultId: 1,
      cancelId: 1
    });

    return result === 0;
  }
}
