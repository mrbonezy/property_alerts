import { RedisService } from "./RedisService";
import type { AirbnbListing, RedisConfig } from "./types";

export class ListingTracker {
  private redis: RedisService;

  constructor(redisConfig: RedisConfig) {
    this.redis = new RedisService(redisConfig.url, redisConfig.token);
  }

  async findNewListings(listings: AirbnbListing[]): Promise<AirbnbListing[]> {
    const currentIds = listings.map((listing) => listing.id);
    const newListingIds = await this.redis.getNewListings(currentIds);
    await this.redis.updateStoredIds(currentIds);

    return listings.filter((listing) => newListingIds.includes(listing.id));
  }
}
