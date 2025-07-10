import core from '../core';
import { Conversation } from '../interfaces';

export interface Ad {
  disabled: boolean;
  tags: string[];
  content: string;
}

export class AdCenter {
  private ads: Ad[] = [];

  async load(): Promise<void> {
    this.ads = (await core.settingsStore.get('ads')) || [];
  }

  get(): Ad[] {
    return this.ads;
  }

    async set(ads: Ad[]): Promise<void> {
        // Ad cleaning
        this.ads = ads
                .filter(ad => ad.content.trim())
                .map(ad => {
                    const filteredTags = ad.tags
                            .filter(tag => tag.trim())
                            .map(tag => tag.trim());

                    return {
                        ...ad,
                        content: ad.content.trim(),
                        tags: filteredTags.length > 0 ? filteredTags : ['default'],
                    };
                }
        );

        await core.settingsStore.set('ads', this.ads);
    }

  async add(content: string, tags: string[] = ['default']): Promise<void> {
    this.ads.push({ content, tags, disabled: false });

    await this.set(this.ads);
  }

  getTags(ads: Ad[] = this.ads): string[] {
    return [ ...new Set(ads.flatMap(ad => ad.tags)) ];
  }

  getActiveTags(): string[] {
    return this.getTags(this.getActiveAds());
  }

  getActiveAds(): Ad[] {
    return this.ads.filter(ad => !ad.disabled);
  }

  getMatchingAds(tags: string[]): Ad[] {
    return this.ads.filter(ad => !ad.disabled && ad.tags.some(t => tags.includes(t)));
  }

  schedule(tags: string[], channelIds: string[], order: 'random' | 'ad-center', timeoutMinutes: number): void {
    const ads = this.getMatchingAds(tags);

    channelIds.forEach(channelId => this.scheduleForChannel(channelId, ads, order, timeoutMinutes));
  }

  adsAreRunning(): boolean {
    return core.conversations.channelConversations.some(conv => conv.isSendingAutomatedAds());
  }

  stopAllAds(): void {
    core.conversations.channelConversations.forEach(conv => conv.adManager.stop());
  }

  protected getConversation(channelId: string): Conversation.ChannelConversation | undefined {
    return core.conversations.channelConversations.find((c) => c.channel.id === channelId);
  }

  isMissingFromAdCenter(adContentToTest: string): boolean {
    const cleaned = adContentToTest.trim().toLowerCase();

    return this.ads.every(ad => ad.content.trim().toLowerCase() !== cleaned);
  }

  isSafeToOverride(channelId: string): boolean {
    const conv = this.getConversation(channelId);

    if (!conv) {
      return true;
    }

    return conv.settings.adSettings.ads.every(adContent => !this.isMissingFromAdCenter(adContent));
  }

  // tslint:disable-next-line:prefer-function-over-method
  protected scheduleForChannel(channelId: string, ads: Ad[], order: 'random' | 'ad-center', timeoutMinutes: number): void {
    const conv = this.getConversation(channelId);

    if (!conv) {
      return;
    }

    conv.settings = {
      ...conv.settings,

      adSettings: {
        ...conv.settings.adSettings,
        ads: ads
                .filter(ad => !ad.disabled && ad.content.trim())
                .map(ad => ad.content.trim()),
        randomOrder: order === 'random'
      }
    };

    conv.adManager.stop();
    conv.adManager.start(timeoutMinutes * 60 * 1000);
  }
}
