import { Redis } from "@upstash/redis";

export class RedisService {
  private redis: Redis;
  private readonly KEY_PREFIX = "all_ids";

  constructor(url: string, token: string) {
    this.redis = new Redis({
      url,
      token,
    });
  }

  private getKey(): string {
    return `${this.KEY_PREFIX}`;
  }

  async getStoredIds(): Promise<string[]> {
    try {
      const ids = await this.redis.smembers(this.getKey());
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      console.error("Error getting stored IDs:", error);
      return [];
    }
  }

  async updateStoredIds(newIds: string[]): Promise<void> {
    const key = this.getKey();
    try {
      // Start a transaction
      const pipeline = this.redis.pipeline();

      // Delete old set and add new IDs
      pipeline.del(key);
      if (newIds.length > 0) {
        // Convert array to rest parameters for sadd
        pipeline.sadd(key, newIds);
      }

      await pipeline.exec();
    } catch (error) {
      console.error("Error updating stored IDs:", error);
      throw error;
    }
  }

  async getNewListings(currentIds: string[]): Promise<string[]> {
    const storedIds = await this.getStoredIds();
    return currentIds.filter((id) => !storedIds.includes(id));
  }
}
