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

  async findNewListings(
    searchUrl: string,
    listings: AirbnbListing[]
  ): Promise<TrackingResult> {
    const foundIds = listings.map((listing) => listing.id);
    const { isFirstSearch, newIds } = await this.redis.getNewListings(
      searchUrl,
      foundIds
    );

    // Always update stored IDs, even if no listings found
    // This marks the search as "seen" for future comparisons
    await this.redis.updateStoredIds(searchUrl, foundIds);

    return {
      listings: listings.filter((listing) => newIds.includes(listing.id)),
      isFirstSearch,
    };
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
