/**
 * LayeredCache is a transparent multi-level loader.
 *
 * Null returns from any non-canon source of information do not imply anything besides "the last backing did not hav this information." However, in a two-tier system (getSync + get), get should always be querying the canonical source for its value - we do not care if intermediate backings fail.
 */
export interface LayeredCache<T> {
    get(id: any): Promise<T | null>;     // null return should ALWAYS mean source returns null
    getSync(id: any): T | null;          // null value only indicates it's not backed by memory/immediate store
    refresh(id: any): Promise<T | null>; // Exclusively query source
}

/**
 *
 * @param get Standard async getter, get from all available sources
 * @param getSync Sync get; failure only means we couldn't get it _right now_
 * @param refresh Directly query the canonical source of your information.
 * @param everythingElse A function of other objects that should be
 * @param init
 * @returns
 */
export function CacheMachine<T>(get:         LayeredCache<T>['get'],
                                getSync:     LayeredCache<T>['getSync'],
                                refresh:     LayeredCache<T>['refresh'],
                                everythingElse?: object,
                                init?: (() => Promise<void>) | Array<() => Promise<void>>,
                               ): LayeredCache<T> {
    const my_cache = { ...everythingElse, get, getSync, refresh };

    if (typeof init === 'function')
        init();
    else
        init?.forEach(f => f());

    return my_cache;
};

// Example:
// const cache = CacheMachine<string>(
//     (x: string) => Promise.resolve(x),
//     (x: string) => x,
//     (x: string) => Promise.resolve(x),
// );

export interface CacheWithEvent<T> extends LayeredCache<T> {
    // `get` in callback format, designed to replace the event-bus registration
    getCallback(id: any, callback: Function): Promise<T | null>;
}

// Do we care about having definitions for these?
export interface StoreBackedCache<T> extends LayeredCache<T> {
}

export interface APIBackedCache<T> extends LayeredCache<T> {
}

export interface IPCBackedCache<T> extends LayeredCache<T> {
}

export interface ThreadedCache<T> extends LayeredCache<T> {
}
