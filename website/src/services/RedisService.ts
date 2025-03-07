import { Redis } from "@upstash/redis";
import { RedisConfig } from "@/types";

// @ts-expect-error upstash redis
window.process = { env: {} } as unknown;

export interface SearchMetadata {
  searchUrl: string;
  createdAt: Date | null;
  lastFetched: Date | null;
  propertyCount: number;
}

export class RedisService {
  private redis: Redis;
  private readonly KEY_PREFIX = "search";
  private readonly OUTSTANDING_SEARCHES_KEY = "outstanding_searches";

  constructor(config: RedisConfig) {
    this.redis = new Redis({
      url: config.url,
      token: config.token,
    });
  }

  /**
   * Test the Redis connection with the provided credentials
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      console.error("Redis connection failed:", error);
      return false;
    }
  }

  /**
   * Hash a URL for storage
   */
  private async hashUrl(url: string): Promise<string> {
    // This is a simple hash function for client-side use
    // Convert string to hash
    const hashBuffer = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(url)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  private async getKey(searchUrl: string): Promise<string> {
    const urlHash = await this.hashUrl(searchUrl);
    return `${this.KEY_PREFIX}:${urlHash}`;
  }

  private async getFirstRunKey(searchUrl: string): Promise<string> {
    const urlHash = await this.hashUrl(searchUrl);
    return `${this.KEY_PREFIX}:${urlHash}:first_run`;
  }

  async isFirstSearch(searchUrl: string): Promise<boolean> {
    const firstRunKey = await this.getFirstRunKey(searchUrl);
    const value = await this.redis.hget(firstRunKey, "createMs");
    return value === null;
  }

  async getStoredIds(searchUrl: string): Promise<string[]> {
    try {
      const ids = await this.redis.smembers(await this.getKey(searchUrl));
      return Array.isArray(ids) ? ids.map(String) : [];
    } catch (error) {
      console.error("Error getting stored IDs:", error);
      return [];
    }
  }

  async updateStoredIds(searchUrl: string, newIds: string[]): Promise<void> {
    const key = await this.getKey(searchUrl);
    try {
      if (newIds.length > 0) {
        await this.redis.sadd(key, newIds[0], ...newIds.slice(1));
      }

      const isFirst = await this.isFirstSearch(searchUrl);

      const update: Record<string, number> = {
        lastScanMs: Date.now(),
      };

      if (isFirst) {
        update.createMs = Date.now();
      }

      await this.redis.hset(await this.getFirstRunKey(searchUrl), update);
    } catch (error) {
      console.error("Error updating stored IDs:", error);
      throw error;
    }
  }

  async getNewListings(
    searchUrl: string,
    currentIds: string[]
  ): Promise<{ isFirstSearch: boolean; newIds: string[] }> {
    const [isFirst, storedIds] = await Promise.all([
      this.isFirstSearch(searchUrl),
      this.getStoredIds(searchUrl),
    ]);

    const newIds = currentIds.filter((id) => !storedIds.includes(id));

    return {
      isFirstSearch: isFirst,
      newIds: isFirst ? currentIds : newIds,
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

  /**
   * Get metadata for a search
   * @param searchUrl The search URL
   */
  async getSearchMetadata(searchUrl: string): Promise<SearchMetadata> {
    try {
      const firstRunKey = await this.getFirstRunKey(searchUrl);
      const idKey = await this.getKey(searchUrl);

      const metadataValues = await this.redis.hgetall(firstRunKey);

      const propertyIds = await this.redis.smembers(idKey);

      console.log(propertyIds, metadataValues, firstRunKey, idKey);

      const createMs = metadataValues?.createMs
        ? Number(metadataValues.createMs)
        : null;
      const lastScanMs = metadataValues?.lastScanMs
        ? Number(metadataValues.lastScanMs)
        : null;

      return {
        searchUrl,
        createdAt: createMs ? new Date(createMs) : null,
        lastFetched: lastScanMs ? new Date(lastScanMs) : null,
        propertyCount: Array.isArray(propertyIds) ? propertyIds.length : 0,
      };
    } catch (error) {
      console.error(`Error getting metadata for ${searchUrl}:`, error);
      return {
        searchUrl,
        createdAt: null,
        lastFetched: null,
        propertyCount: 0,
      };
    }
  }

  /**
   * Get metadata for all outstanding searches
   */
  async getAllSearchesMetadata(): Promise<SearchMetadata[]> {
    try {
      const searches = await this.getOutstandingSearches();
      const metadataPromises = searches.map((searchUrl) =>
        this.getSearchMetadata(searchUrl)
      );

      return await Promise.all(metadataPromises);
    } catch (error) {
      console.error("Error getting search metadata:", error);
      return [];
    }
  }
}
