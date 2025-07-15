import mongoose, { Document, Schema } from "mongoose";

export interface IRestaurant extends Document {
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
  operating_hours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  delivery_radius: number;
  minimum_order: number;
  delivery_fee: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const RestaurantSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    cuisine_type: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postal_code: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    },
    contact: {
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    operating_hours: {
      monday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      tuesday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      wednesday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      thursday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      friday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      saturday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
      sunday: {
        open: String,
        close: String,
        closed: { type: Boolean, default: false },
      },
    },
    delivery_radius: { type: Number, default: 5.0 },
    minimum_order: { type: Number, default: 0 },
    delivery_fee: { type: Number, default: 2.5 },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    total_reviews: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model<IRestaurant>("Restaurant", RestaurantSchema);
