// For FindExeFileFromName
import { platform } from "process";
import { execSync } from "child_process";

/**
 * Find a given filename on the system, using `where` in `Program Files` on
 * Windows and `which` on Linux.
 * @param exe A filename, with or without `.exe` at the end
 * @returns A filename if found on the system, otherwise an empty string.
 */
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

/**
 * A lodash-replacement debounce useful on any input without a submit. Invoke
 * the bounce-blocker on every input, and the callback will only fire once
 * there's no input.
 * @param callback Callback to bounce
 * @param wait Time to wait for there to be no input
 * @returns A function to invoke to reset the debounce
 */
export function debounce<T>(callback: (this: T, ...args: any) => void,
                            wait: number = 330
                           ): () => void {
    let timer: ReturnType<typeof setTimeout>;

    return function (this: T, ...args: any) {
        clearTimeout(timer);
        timer = setTimeout(() => { callback.apply(this, args); }, wait)
    }
}

/**
 * `Null` is an "object" type so must be examined before checking for object.
 * There's no point in checking `isArray` unless `typeof subj` is successful.
 * @param subj Anything
 * @returns true if the object is a normal object.
 */
function isPlainObject(subj: any): subj is object {
    return subj !== null && typeof subj === 'object' && !Array.isArray(subj);
}

function isSimpleInterchangeable(subj: any): subj is null | string | number {
    const t = typeof subj;
    return subj === null || t === 'string' || t === 'number';
}

/**
 * Layer a user-provided settings down onto default settings. It's possible the
 * structure of the settings have changed, so prefer the default settings if
 * there's any strange conflict.
 *
 * Because this is a settings structure, we don't account for unusual types,
 * only objects, arrays, strings, numbers, and null.
 *
 * Arrays are user-provided data, so they're always copied over.
 * @param base Object with default values
 * @param supplement User settings to layer on top of defaults
 * @returns Object with defaults filling in the blanks for
 */
export function SettingsMerge<T extends object>(base: T, supplement?: Partial<T>): T {
    if (!supplement)
        return base;

    let obj: Partial<T> = {};

    // When one entry has an item and the other doesn't, ignore it - if it's a
    // user value, it's irrelevant; if its a server value, the default will be
    // used until the user customizes it.

    // User base since user settings can be out-of-date
    for (const k of Object.keys(base) as (keyof T)[]) {
        const tb = typeof base[k],
              ts = typeof supplement[k];

        // null <-> string <-> number <-> undefined is fine.
        if (isSimpleInterchangeable(supplement[k]) && isSimpleInterchangeable(base[k])) {
            // May not be the same type but we're okay with it, so assert.
            obj[k] = supplement[k] as T[keyof T];
        }
        // The 'deep' in 'deep merge'
        else if (isPlainObject(base[k]) && isPlainObject(supplement[k])) {
            // @ts-ignore
            obj[k] = SettingsMerge(base[k], supplement[k]);
        }
        // Arrays are user data and should overwrite existing arrays.
        else if (Array.isArray(base[k]) && Array.isArray(supplement[k])) {
            // Cannot infer these are arrays of the same type, so assert.
            obj[k] = supplement[k] as T[keyof T];
        }
        // Same type not covered above means safe to take user value.
        else if (supplement[k] !== null && base[k] !== null && ts === tb) {
            obj[k] = supplement[k];
        }
        // Differing types or absent value means a structure change, which is
        // handled in another part of the code; ignore the user setting.
        else {
            obj[k] = base[k];
        }

    }

    return obj as T;
}
// Here is the legacy lodash merger preserved for posterity.
// _.mergeWith(new SettingsImpl(), s, (oVal, sVal) => {
//     if (Array.isArray(oVal) && Array.isArray(sVal)) {
//         return sVal;
//     }
// });
