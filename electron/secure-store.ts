import { safeStorage } from "electron";
import settings from 'electron-settings';
settings.configure({});

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class SecureStore {
  private static getKey(domain: string, account: string): string {
    return `fchat-rising-accounts__${domain}__${account}`.replace(/[^a-zA-Z0-9_]/g, '__');
  }

  static async setPassword(domain: string, account: string, password: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable())
      return;

    const buffer = safeStorage.encryptString(password);
    await settings.set(this.getKey(domain, account), buffer.toString('binary'));
  }

  static async deletePassword(domain: string, account: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable())
      return;

    await settings.unset(this.getKey(domain, account));
  }

  static async getPassword(domain: string, account: string): Promise<string | null> {
    if (!safeStorage.isEncryptionAvailable())
      return null;

    const pw = await settings.get(this.getKey(domain, account));
    if (!pw || typeof pw !== 'string')
      return null;

    const buffer = Buffer.from(pw, 'binary');

    return safeStorage.decryptString(buffer);
  }
}
