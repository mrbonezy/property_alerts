import { RedisService } from "./RedisService";
import type { AirbnbListing, RedisConfig } from "./types";

export interface TrackingResult {
  listings: AirbnbListing[];
  isFirstSearch: boolean;
}

export class ListingTracker {
  private redis: RedisService;

  constructor(redisConfig: RedisConfig) {
    this.redis = new RedisService(redisConfig.url, redisConfig.token);
  }

  async updateNewListings(
    searchUrl: string,
    listings: AirbnbListing[]
  ): Promise<TrackingResult> {
    const newlyFoundIds = listings.map((listing) => listing.id);
    const { isFirstSearch, ids } = await this.redis.getListingsIds(searchUrl);

    const newIds = newlyFoundIds.filter((id) => !ids.includes(id));

    // Always update stored IDs, even if no listings found
    // This marks the search as "seen" for future comparisons
    await this.redis.updateStoredIds(searchUrl, newlyFoundIds);

    return {
      listings: listings.filter((listing) => newIds.includes(listing.id)),
      isFirstSearch,
    };
  }

  async markFailure(searchUrl: string) {
    await this.redis.markFailure(searchUrl);
  }

  async addOutstandingSearch(searchUrl: string) {
    await this.redis.addOutstandingSearch(searchUrl);
  }

  async removeOutstandingSearch(searchUrl: string) {
    await this.redis.removeOutstandingSearch(searchUrl);
  }

  async getOutstandingSearches() {
    return this.redis.getOutstandingSearches();
  }
}
