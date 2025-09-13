import { IPCBackedCache } from "./layered_cache";

type Setting = boolean | number | string;

export interface SettingsCache extends IPCBackedCache<Setting> {
    get(x: any): Promise<Setting | null>;
    getSync(x: any): Setting | null;
    getCallback(x: any, callback: Function): Promise<Setting | null>;
    refresh(x: any): Promise<Setting | null>;
}

// region Stores
const memory = null;
// No store; because multiple tabs write to it, we have to manage it via async electron ipc


// region Intermediary

// region Public


// region Initializers
function init() {
    // Initialize store
}
