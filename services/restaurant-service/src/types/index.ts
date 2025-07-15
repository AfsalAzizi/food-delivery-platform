import { Request } from "express";
import { Document } from "mongoose";

export interface AuthRequest extends Request {
  userid?: string;
  user?: any;
}

export interface IRestaurantDocument extends Document {
  name: string;
  description: string;
  cuisine_type: string;
  address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  contact: {
    phone: string;
    email: string;
  };
  operating_hours: Record<
    string,
    {
      open: string;
      close: string;
      closed: boolean;
    }
  >;
  delivery_radius: number;
  minimum_order: number;
  delivery_fee: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
}

export interface IMenuItemDocument extends Document {
  restaurant_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  ingredients: string[];
  dietary_info: string[];
  is_available: boolean;
  preparation_time: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RestaurantEvent {
  eventType: string;
  data: any;
  timestamp: string;
  service: string;
}

export interface RestaurantQuery {
  cuisine_type?: string;
  city?: string;
  is_active?: string | boolean; // Can be string from query params
  page?: string | number;
  limit?: string | number;
  search?: string; // For restaurant name search
  min_rating?: string | number;
  delivery_radius?: string | number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface MenuItemQuery {
  category?: string;
  is_available?: boolean;
  min_price?: number;
  max_price?: number;
}

export interface RestaurantQuery {
  cuisine_type?: string;
  city?: string;
  is_active?: string | boolean;
  page?: string | number;
  limit?: string | number;
  search?: string;
  min_rating?: string | number;
  delivery_radius?: string | number;
}

export type RestaurantRequest = Request & {
  query: RestaurantQuery;
};
