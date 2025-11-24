export abstract class Cache<RecordType> {
    protected cache: Map<string, RecordType> = new Map();

    get(name: string): RecordType | null {
        return this.cache.get(Cache.nameKey(name)) ?? null;
    }

    // tslint:disable-next-line: no-any
    abstract register(record: any): void;

    static nameKey(name: string): string {
        return name.toLowerCase();
    }

    has(name: string): boolean {
        return this.cache.has(Cache.nameKey(name));
    }
}
