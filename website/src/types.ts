export interface AirbnbListing {
  id: string;
  url: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  name: string;
  title: string;
}

export interface SearchParams {
  url: string;
}

export interface RedisConfig {
  url: string;
  token: string;
}
