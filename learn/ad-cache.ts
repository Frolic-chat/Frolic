import { Cache } from './cache';

export interface AdCachedPosting {
    channelName: string;
    datePosted: Date;
    message: string;
}

export interface AdPosting extends AdCachedPosting {
    name: string;
}

export class AdCacheRecord {
    protected name: string;

    posts: AdCachedPosting[] = [];

    constructor(name: string, posting?: AdPosting) {
        this.name = name;

        if (posting)
            this.add(posting);
    }

    add(ad: AdPosting): void {
        this.posts.push({
            channelName: ad.channelName,
            datePosted:  ad.datePosted,
            message:     ad.message
        });

        this.posts = this.posts.slice(-25);
    }


    count(): number {
        return this.posts.length;
    }


    getDateLastPosted(): Date | null {
        if (!this.posts.length)
            return null;

        return this.posts[this.posts.length - 1].datePosted;
    }
}


export class AdCache<RecordType extends AdCacheRecord = AdCacheRecord> extends Cache<RecordType> {
    register(ad: AdPosting): void {
        const k = Cache.nameKey(ad.name);

        if (this.cache.has(k)) {
            const adh = this.cache.get(k)!;

            adh.add(ad);
            return;
        }

        this.update(k, new AdCacheRecord(ad.name, ad) as RecordType);
        this.evictOutdated();
    }
}
