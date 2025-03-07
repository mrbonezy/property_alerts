import { RedisConfig } from "@/types";

const STORAGE_KEY = 'property_alerts_config';

export const saveRedisConfig = (config: RedisConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const getRedisConfig = (): RedisConfig | null => {
  const storedConfig = localStorage.getItem(STORAGE_KEY);
  if (!storedConfig) return null;
  
  try {
    return JSON.parse(storedConfig) as RedisConfig;
  } catch (error) {
    console.error('Failed to parse stored Redis config:', error);
    return null;
  }
};

export const clearRedisConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY);
}; 