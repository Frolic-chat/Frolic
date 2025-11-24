export abstract class AsyncCache<RecordType> {
    protected cache: Map<string, RecordType> = new Map();

    abstract get(name: string): Promise<RecordType | null>;

    // tslint:disable-next-line no-any
    abstract register(record: any): void;

    static nameKey(name: string): string {
        return name.toLowerCase();
    }

    clear(): void {
        this.cache = new Map();
    }
}
