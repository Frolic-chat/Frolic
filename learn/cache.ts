// SPDX-License-Identifier: AGPL-3.0-or-later
export abstract class Cache<RecordType> {
    protected cache: Map<string, RecordType> = new Map();
    MAX_CACHE_SIZE = 0;

    static nameKey(name: string): string {
        return name.toLowerCase();
    }

    getSync(name: string): RecordType | null {
        const k = Cache.nameKey(name);
        const v = this.cache.get(k);

        if (v) {
            this.update(k, v);
            return v;
        }
        else {
            return null;
        }
    };

    abstract register(record: any): void;

    protected update(name: string, value: RecordType): void {
        const key = Cache.nameKey(name);

        this.cache.delete(key);
        this.cache.set(key, value);
    }

    has(name: string): boolean {
        return this.cache.has(Cache.nameKey(name));
    }

    evict(name: string): boolean {
        return this.cache.delete(Cache.nameKey(name));
    }

    evictOldest(): boolean {
        const k = this.cache.keys().next().value;
        return k ? this.cache.delete(k) : true;
    }

    async evictOutdated(): Promise<boolean> {
        const exceeded = !!this.MAX_CACHE_SIZE && this.cache.size > this.MAX_CACHE_SIZE;

        if (exceeded) {
            while (this.cache.size > this.MAX_CACHE_SIZE) {
                const k = this.cache.keys().next().value;
                if (k !== undefined) this.cache.delete(k);
            }
        }

        return exceeded;
    }

    clear(): void {
        this.cache.clear();
    }
}

export abstract class AsyncCache<RecordType> extends Cache<RecordType> {
    async get(name: string): Promise<RecordType | null> {
        return this.getSync(name);
    };
}
