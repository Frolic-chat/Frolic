// SPDX-License-Identifier: AGPL-3.0-or-later
// For FindExeFileFromName
import { platform } from "process";
import { execSync } from "child_process";

import * as Electron from 'electron';

export function invoke(channel: 'eicon-status'): Promise<{ status?: string, amount: number }>;
export function invoke(channel: 'eicon-search', query: string): Promise<string[]>;
export function invoke(channel: 'eicon-page', amount: number): Promise<string[]>;
export function invoke(channel: 'eicon-refresh', force?: boolean): Promise<boolean>;
export function invoke<P extends any[], R>(channel: string, ...args: P): Promise<R> {
    return Electron.ipcRenderer.invoke(channel, ...args)
}

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
export async function FisherYatesShuffle(arr: any[], amount: number = 0): Promise<void> {
    const end = amount >= 0 && amount <= arr.length
        ? Math.floor(arr.length - amount)
        : 0;

    for (let cp = arr.length - 1; cp >= end; cp--) {
        const np = Math.floor(Math.random() * (cp + 1));
        [arr[cp], arr[np]] = [arr[np], arr[cp]];
    }
}

type DebouncedFn<T> = ((this: T, ...args: any) => void) & { cancel: () => void };

/**
 * A lodash-replacement debounce useful on any input without a submit. Invoke
 * the bounce-blocker on every input, and the callback will only fire once
 * there's no input.
 *
 * The `maxWait` parameter prevents you from being able to delay the function
 * forever. If `maxWait` is shorter than `wait`, it acts as a trailing-edge throttle.
 * @param callback Callback to bounce
 * @param wait Time to wait for there to be no input
 * @param maxWait The limit on how long you can delay the function
 * @returns A function to invoke to reset the debounce
 */
export function debounce<T>(callback: (this: T, ...args: any) => void,
                            { wait = 330, maxWait = 0 }: {
                                wait?:    number,
                                maxWait?: number,
                            } = {}
                           ): DebouncedFn<T> {
    let ret: DebouncedFn<T>;

    if (!maxWait) { // Simple
        let timer: ReturnType<typeof setTimeout> | undefined;
        const clear = () => { clearTimeout(timer) };

        const f = function (this: T, ...args: any) {
            clear();
            timer = setTimeout(() => callback.apply(this, args), wait);
        };
        // @ts-ignore webpack ts 3.9
        f.cancel = clear;

        // @ts-ignore webpack ts 3.9
        ret = f;
    }
    else { // maxWait
        let timer:    ReturnType<typeof setTimeout> | undefined;
        let maxTimer: ReturnType<typeof setTimeout> | undefined;

        const clear_timers = function () {
            clearTimeout(maxTimer);
            clearTimeout(timer);
            maxTimer = undefined;
            timer    = undefined;
        };

        const f = function (this: T, ...args: any) {
            if (!maxTimer) {
                console.log('debounce.maxwait.fresh');

                maxTimer = setTimeout(
                    () => {
                        clear_timers();
                        callback.apply(this, args);
                    },
                    maxWait
                );

                timer = setTimeout(
                    () => {
                        clear_timers();
                        callback.apply(this, args);
                    },
                    wait
                );
            }
            else { // refresh
                console.log('debounce.maxwait.running');

                clearTimeout(timer);
                timer = setTimeout(
                    () => {
                        clear_timers();
                        callback.apply(this, args);
                    },
                    wait
                );
            }
        }
        // @ts-ignore webpack ts 3.9
        f.cancel = clear_timers;

        // @ts-ignore webpack ts 3.9
        ret = f;
    }

    return ret;
}

/**
 * `Null` is an "object" type so must be examined before checking for object.
 * There's no point in checking `isArray` unless `typeof subj` is successful.
 * @param subj Anything
 * @returns true if the object is a normal object.
 */
function isPlainObject(subj: any): subj is NonNullable<object> {
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
        // null <-> string <-> number is fine.
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
        else if (supplement[k] !== null && base[k] !== null && typeof supplement[k] === typeof base[k]) {
            obj[k] = supplement[k];
        }
        // Differing types or absent value means a structure change, which is
        // handled in another part of the code; ignore the user setting.
        // Functions are also caught here.
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

export function deepEqual(obj1: any, obj2: any): boolean {
    // Literal same object
    if (obj1 === obj2)
        return true;

    // Anything simple can be direct compared
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return obj1 === obj2;
    }

    // Shortcut: Check if they have the same number of entries
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length)
        return false;

    // Check all properties recursively
    for (const key of keys1) {
        if (!keys2.includes(key))
            return false;

        if (!deepEqual(obj1[key], obj2[key]))
            return false;
    }

    return true;
}

export type ObjectKeys<T> = {
    [K in keyof T]: NonNullable<T[K]> extends object ? K : never
}[keyof T];
// This one seems to provide entries to vscode more reliably - enable for TS4
// type ObjectKeys<T> = keyof {
//     [K in keyof T as NonNullable<T[K]> extends object ? K : never]: T[K]
// }


/**
 * Overengineered version of `Object.keys(obj).filter(
 *     k => (obj as any)[k] !== null && typeof (obj as any)[k] === 'object'
 * );`
 * @param obj Target object to examine for inner objects
 * @param param1 Options: `deep` - recurse and return period-separated deep keys of objects as well
 * @returns List of string keys; deep keys (if requested) period-separated.
 */
export function GetReferenceKeys(obj: Record<string, unknown>, { prefix, deep }: { prefix?: string, deep?: boolean } = {}): string[] {
    if (obj === null)
        return [];

    const keys: string[] = [];

    Object.entries(obj).forEach(([k, v]) => {
        if (v !== null && typeof v === 'object') {
            const path = prefix ? `${prefix}.${k}` : k;
            keys.push(path);

            if (deep) { // =\
                const deep_keys = GetReferenceKeys(v as Record<string, unknown>, { prefix: path, deep: deep });
                keys.push( ...deep_keys);
            }
        }
    })

    return keys;
}

/**
 * Shallow with strong typing. I honestly cannot believe I got this format to work.
 * @param obj object to strip non-references from
 * @returns A reduced object with only those keys that are references (to objects)
 */
// (readonly [keyof { [K in keyof T as NonNullable<T[K]> extends object ? K : never]: T[K]; }, any])[]
export function ExtractReferences<T extends Record<string, any>>(obj: T) {
    return Object.keys(obj)
        .filter(k => obj[k] && typeof obj[k] === "object")
        .map(k => [k as ObjectKeys<T>, obj[k]] as const);
}

// Previous attempt, limited usefulness.
// export function GetReferenceKeysShallow<T extends Record<string, any>>(obj: T): ObjectKeys<T>[] {
//     if (obj === null || typeof obj !== 'object')
//         return [];

    // const keys: ObjectKeys<T>[] = [];

//     Object.entries(obj).forEach(([k, v]) => {
//         if (v !== null && typeof v === 'object')
//             keys.push(k);
//     });

//     return keys;
// }

// Every pair is a `[oldValue, newValue]` tuple. Only CHANGED keys are compared.
// TS is the worst :) Please become haskell
export function ComparePrimitives<T extends Record<string, any>>(oldObj: T, newObj: T): Record<keyof T, [any, any]> {
    const result = {} as Record<keyof T, [any, any]>;

    for (const key of Object.keys(oldObj) as (keyof T)[]) {
        const beforeVal = oldObj[key];
        const afterVal  = newObj[key];

        if (beforeVal === afterVal) // most obvious short circuit
            continue;

        if (typeof beforeVal !== 'object' && typeof afterVal !== 'object') {
            result[key] = [beforeVal, afterVal];
        }
    }

    return result;
}


export const lastElement = <T>(arr: readonly T[]) => arr[arr.length - 1];

export function getAsNumber(input: string | null | undefined): number | null {
    if (input === null || input === undefined || input === '')
        return null;

    const n = parseInt(input, 10);

    return !Number.isNaN(n) && Number.isFinite(n) ? n : null;
}

/**
 * Some day in the future, this may be useful, however, in TS3.x it's compiler errors.
 *
 * @see {@link https://www.reddit.com/r/typescript/comments/v6cgmz/how_to_turn_a_function_overload_signature/ | Reddit explanation} and
 * {@link https://www.typescriptlang.org/play/?ts=4.7.2#code/C4TwDgpgBA+g8gNwgJwDYHsCGATAqgOwEt18AeAFURQxwBopyAFTZYQzVKtLbKAXigBXfAGt86AO74AfPwbNW7Tkm44oAMgZcavCAA9gEfNgDOUABQBYAFBQoAOkcsA5iYBcUQvgBmKBgEFkVxsASn5ZL19kBgAlCGBBZHwbOwB+KAB6DKhGZAgkfGBPHy9CQyg8gGNEk2J8KAAjECgTYHQwMC9nCohq5FqSKAkACyN5FjYObR4Uu0zs4cwzTErqgFtBVExDXg5UKHRvKGBRrRUdFsJnfG3EiBN7WbsmCaVptX1DYzNKc5nbObpfD5FBPKBuMFzKAAH1g7zwRBIFHh9EYhEqImRfzoUBEEBAhzO1B4sk0L0UU2xvE05nMjnsLncASCJjCfFk5DiCSSIWkkLmsNp9MZHnIgVcbI5XMS+BCsw8wJUAG4bDZQJAoPCCHUscSPgYjKYLMKWR5MPgQABtAC6kqg5pAsgEAFE9JVUIJsBBSLN4FTtUiwVkGKcAETmO2KlChy7XW55KAbVqNaDDdCEVoQXhtY5h7zIEjAGOEk4QIPZLyGfq9NgkejedDRYASdA9JYkJmYMINXqYQQmaBVGp1FptMBmEZjMqeEzlqBGSroYRVrP0c28BphacDiBrMw5sB5ApFUtQReoLbj6CEkyCBoDgCOgiMwDnocXazA20IDVQEBjtRxty9wWBAzj2FA4Z2gg6bYDGlatuGmCpB4ACM0GwaGIS0HOIzosMUDOIQSDLFA2CEFURSLvgKgDPUOaYEIiL4I8AJ2LSkYgsgYRkvCszSDhAK-HqugGt8FicSoUBAlx4ISeEUBRsgNjSCq1g2BkABUNjkKcwDIOiIj7q2p6YA06BID0fR0faeT0qq1hdlAACSPgoAZ+DdKeX7IJgazxH4649Ny9HgCBhLmgcVJZlA3jCJUtb1BIhAXkIA5qqcWzJhZImxjcwH0HhlQERm9odCwL6oM0kX6GAqDotOXqAfUxXppUECsTYm4uYUKADglXT2pcnl-nl8bQMlJy5teBlETc+yVn1NZ1PQlSRXkjZesp1inot1YDYM5hgOgJi1L+1X1MI2DoOsL4xbUXrzt4vgJakISddYlRhK5Vb9YlZhrfUJBVSmPQALSbSgq6KegRQ3MgBYSDF5h5Nggjtdg2FQAAyug9CljYe1-SOizGaDeQNIIKVFF402QeSkzKCJMbOEYKDovjozJNYQ79COgOg607SQLwk70accWpUTy2DKTKZjBTVOoMArFwKWyDJQOnOlS2my8Hkt7K8U9r1JEpTlLzdGsZpGQOcGzp3CImAAIRqmFDD3MA-ioXIWrMaQADeswRh4MGENganschaEhGhkcWJgHgAEz0A0yex1ASdqQAvqpdvZM62Cs1AADCSwQB4UEKUpAFXPldyJv2RQ9lAaYZjsrHqtA5Ce-4Se+-6-tBwCIdQGHEfB9HUDoXHk-J6n6fJ-Ho9KTnefqdY9tF9AZcDh4AAigh1ei2zQM143LAm6BrGUHduxqPetP4ADMA8iQGZDD+xGfj8vU8z9PZeP9YJKnmGRI+9U1qGDnpnBemcM5Z0nihaeGdUKgODGjY+UCyzWFzmpDS2QABysNoAnG2HTSG0RCQ5VUEaUqaxMCVkYcCXgtNTzCBWkMYY+FEwQHNLOTe2QyE02AAAcjMEePqP5Rr9kGoxD+5B0A-SWgdUKGpJwJlPDQnQBCDjIC2ombYv0IK6WgPodqYBEozkghGauXFQyFW4cVVuSxjithbm3TM2BdE5lPPmQsBwji7V6vtRKEEAASkguL0DKOIumawTpFBMJASohBvDojGgVXRRUCL+X4a3dMrRBrbjTHrQWmBfCeCCacDhgxSrURUDsRoKwRBuJNro6WqiPrBlclEDy3RGK1KBkcHyfkApNggeFaIeQQrHDCmYUq4gJBQGOqdaRHV77QHhAoMZv0KDzjEkaOkThTQmytLaBSDonQ5BYLsvqpA-Y6nINIdeXdNRUmlEkcgYV9mfENGYY5DJTkOhtHaK5chPn4G+ZAB5g8nkvPwTtd2j9gAACEfYCG2bc-yeyv4SVDiApBMdZ4j0TrAxoi9M5AIVFxNeiK3kotRf3TFHz4gymhd6PFo9f5EpQSSqO88KXwKXsHDOq8bB4PzlAYh5RTyhhrsFGUcyNSA1Ec3aAXh3Semhj2Na-ZoBDInGUAiSldHXRhjTfAWrHplFYkAA | Playground with code}
 *
 */
// type _OverloadUnion<TOverload, TPartialOverload = unknown> = TPartialOverload & TOverload extends (
//   ...args: infer TArgs
// ) => infer TReturn
//   ? // Prevent infinite recursion by stopping recursion when TPartialOverload
//     // has accumulated all of the TOverload signatures.
//     TPartialOverload extends TOverload
//     ? never
//     :
//         | _OverloadUnion<TOverload, Pick<TOverload, keyof TOverload> & TPartialOverload & ((...args: TArgs) => TReturn)>
//         | ((...args: TArgs) => TReturn)
//   : never;

// export type OverloadUnion<TOverload extends (...args: any[]) => any> = Exclude<
//   _OverloadUnion<
//     // The "() => never" signature must be hoisted to the "front" of the
//     // intersection, for two reasons: a) because recursion stops when it is
//     // encountered, and b) it seems to prevent the collapse of subsequent
//     // "compatible" signatures (eg. "() => void" into "(a?: 1) => void"),
//     // which gives a direct conversion to a union.
//     (() => never) & TOverload
//   >,
//   TOverload extends () => never ? never : () => never
// >;

/*
The tricks to the above recursion are...

a) Inferring the parameter and return types of an overloaded function will use
the last overload signature, which is apparently an explicit design choice.

b) Intersecting a single signature with the original intersection, can reorder
the intersection (possibly an undocumented side effect?).

c) Intersections can only be re-ordered, not narrowed (reduced), So, the
intersection has to be rebuilt in the "TPartialOverload" generic, then
recursion can be stopped when the full intersection has been rebuilt.
Otherwise, this would result in an infinite recursion.
*/

// Eureka!
// type TestA1 = OverloadUnion<{
//   (): void;
//   (a?: 1): 1;
//   (a: 2, b: 2): 2;
// }>;

// Edge Case: "() => never" signature must be hoisted.
// type TestA2 = OverloadUnion<{
//   (): void;
//   (a?: 1): 1;
//   (a: 2, b: 2): 2;
//   (): never;
// }>;

// Edge Case: Duplicate signatures are omitted.
// type TestA3 = OverloadUnion<{
//   (): void;
//   (a?: 1): 1;
//   (): void; // duplicate
//   (a: 2, b: 2): 2;
//   (a?: 1): 1; // duplicate
// }>;

// Note that the order of overloads is maintained in the union, which means
// that it's reversible using a UnionToIntersection type where the overload
// order matters. The exception is "() => never", which has to be hoisted
// to the front of the intersection. However, it's the most specific signature,
// which means hoisting it should be safe if the union is converted back to an
// intersection.

// Inferring a union of parameter tuples or return types is now possible.
// export type OverloadParameters<T extends (...args: any[]) => any> = Parameters<OverloadUnion<T>>;
// export type OverloadReturnType<T extends (...args: any[]) => any> = ReturnType<OverloadUnion<T>>;

// type TestB1 = OverloadParameters<{
//   (): void;
//   (a?: 1): 1;
//   (a: 2, b: 2): 2;
//   (): never;
// }>;

// type TestB2 = OverloadReturnType<{
//   (): void;
//   (a?: 1): 1;
//   (a: 2, b: 2): 2;
//   (): never;
// }>;

// Note the "never" return type can't be included, because unions with never
// do not include it.

/**
 * I've scryed deep into the future and TS will support this natively, but until then we'll use this extracter.
 */
export type AsyncReturnType<T extends (...args: any) => any> =
	T extends (...args: any) => Promise<infer U> ? U :
	T extends (...args: any) => infer U ? U :
	any

/**
 * Useful to avoid non-null assertions. Just x ?? `err()`
 * <T> maintains the potential to truly assert T is truly itself; however this never returns, so never asserts.
 */
export function err<T>(msg: string): NonNullable<T> { throw msg ?? "Object is null or undefined when that shouldn't be possible." };
// Example:
// const elem = document.getElementById('something') ?? err();

/**
 * Asynchronous sleep operation - delay current thread by given ms.
 * @param ms Time to sleep in milliseconds
 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Still uncertain how to use this reliably.
export function has<K, T extends K>(set: ReadonlySet<T> | ReadonlyMap<T, any>, key: K): key is T {
    return set.has(key as T);
}

/**
 * Flip through entries of an array in the style of a rolodex, rotating them
 * from front to back while preserving the circular order.
 * @param arr The "rolodex" to cycle through; will be modified in-place
 * @param amount Number of results to move from front to back
 * @returns An array of the entries that were flipped through
 */
export function Rotate<T>(arr: T[], amount: number): T[] {
    const remove = arr.splice(0, amount);

    arr.push(...remove);

    return remove;
}

/**
 * Confirms whether a given subject is an array that contains only strings;
 * useful for runtime verification of files, websites, and
 * other imported data.
 * @param subj Any type; will validate as array before having its values checked
 * @returns Is the subject an array that contains only strings?
 */
export function isArrayOfStrings(subj: any): subj is string[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'string');
}

/**
 * Confirms whether a given subject is an array that contains only objects;
 * useful for runtime verification of files, websites, and
 * other imported data.
 *
 * This does not check that the objects contain any
 * particular internal structure.
 * @param subj Any type; will validate as array before having its values checked
 * @returns Is the subject an array that contains only objects?
 */
export function isArrayOfObjects(subj: any): subj is object[] {
    return Array.isArray(subj) && subj.every(item => typeof item === 'object');
}
