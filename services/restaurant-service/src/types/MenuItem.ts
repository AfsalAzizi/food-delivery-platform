import mongoose, { Document } from "mongoose";

export interface IMenuItem extends Document {
  restaurant_id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  ingredients: string[];
  dietary_info?: string[];
  is_available: boolean;
  preparation_time?: number;
  created_at: Date;
  updated_at: Date;
}

const MenuItemSchema = new mongoose.Schema<IMenuItem>(
  {
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image_url: {
      type: String,
    },
    ingredients: {
      type: [String],
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    preparation_time: {
      type: Number,
      default: 20,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
