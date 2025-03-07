export interface AirbnbListing {
  id: string;
  url: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
}

export interface SearchParams {
  url: string;
}

export interface RedisConfig {
  url: string;
  token: string;
} 