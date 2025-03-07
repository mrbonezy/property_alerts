import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

export class RedisService {
  private redis: Redis;
  private readonly KEY_PREFIX = "search";
  private readonly OUTSTANDING_SEARCHES_KEY = "outstanding_searches";

  constructor(url: string, token: string) {
    this.redis = new Redis({
      url,
      token,
    });
  }

  private hashUrl(url: string): string {
    return createHash("sha256").update(url).digest("hex");
  }

  private getKey(searchUrl: string): string {
    const urlHash = this.hashUrl(searchUrl);
    return `${this.KEY_PREFIX}:${urlHash}`;
  }

  private getFirstRunKey(searchUrl: string): string {
    const urlHash = this.hashUrl(searchUrl);
    return `${this.KEY_PREFIX}:${urlHash}:first_run`;
  }

  async isFirstSearch(searchUrl: string): Promise<boolean> {
    const firstRunKey = this.getFirstRunKey(searchUrl);
    const value = await this.redis.hget(firstRunKey, "createMs");
    return value === null;
  }

  async getStoredIds(searchUrl: string): Promise<string[]> {
    try {
      const ids = await this.redis.smembers(this.getKey(searchUrl));
      return Array.isArray(ids) ? ids.map(String) : [];
    } catch (error) {
      console.error("Error getting stored IDs:", error);
      return [];
    }
  }

  async updateStoredIds(searchUrl: string, newIds: string[]): Promise<void> {
    const key = this.getKey(searchUrl);
    try {
      if (newIds.length > 0) {
        await this.redis.sadd(key, newIds[0], ...newIds.slice(1));
      }

      const isFirst = await this.isFirstSearch(searchUrl);

      const update: Record<string, any> = {
        lastScanMs: Date.now(),
      };

      if (isFirst) {
        update.createMs = Date.now();
      }

      await this.redis.hset(this.getFirstRunKey(searchUrl), update);
    } catch (error) {
      console.error("Error updating stored IDs:", error);
      throw error;
    }
  }

  async markFailure(searchUrl: string) {
    await this.redis.hset(this.getFirstRunKey(searchUrl), {
      lastScanMs: 0, // TODO: support null
    });
  }

  async getListingsIds(
    searchUrl: string
  ): Promise<{ isFirstSearch: boolean; ids: string[] }> {
    const [isFirst, storedIds] = await Promise.all([
      this.isFirstSearch(searchUrl),
      this.getStoredIds(searchUrl),
    ]);

    return {
      isFirstSearch: isFirst,
      ids: storedIds,
    };
  }

  /**
   * Get all outstanding searches
   * @returns Array of search URLs
   */
  async getOutstandingSearches(): Promise<string[]> {
    try {
      const searches = await this.redis.smembers(this.OUTSTANDING_SEARCHES_KEY);
      return Array.isArray(searches) ? searches.map(String) : [];
    } catch (error) {
      console.error("Error getting outstanding searches:", error);
      return [];
    }
  }

  /**
   * Add a search URL to the outstanding searches list
   * @param searchUrl The search URL to add
   */
  async addOutstandingSearch(searchUrl: string): Promise<void> {
    try {
      await this.redis.sadd(this.OUTSTANDING_SEARCHES_KEY, searchUrl);
    } catch (error) {
      console.error("Error adding outstanding search:", error);
      throw error;
    }
  }

  /**
   * Remove a search URL from the outstanding searches list
   * @param searchUrl The search URL to remove
   */
  async removeOutstandingSearch(searchUrl: string): Promise<void> {
    try {
      await this.redis.srem(this.OUTSTANDING_SEARCHES_KEY, searchUrl);
    } catch (error) {
      console.error("Error removing outstanding search:", error);
      throw error;
    }
  }
}
