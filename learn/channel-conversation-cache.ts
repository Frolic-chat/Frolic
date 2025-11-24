import { Cache } from './cache';
import { AdCachedPosting, AdCacheRecord, AdCache } from './ad-cache';

export interface ChannelCachedPosting extends AdCachedPosting {
    channelName: string;
    datePosted: Date;
    message: string;
}

export interface ChannelPosting extends ChannelCachedPosting {
    name: string;
}

export class ChannelCacheRecord extends AdCacheRecord {}


export class ChannelConversationCache extends AdCache<ChannelCacheRecord> {

    register(ad: ChannelPosting): void {
        const k = Cache.nameKey(ad.name);

        if (this.cache.has(k)) {
            const adh = this.cache.get(k)!;

            adh.add(ad);
            return;
        }

        this.cache.set(k, new ChannelCacheRecord(ad.name, ad));
    }

}
