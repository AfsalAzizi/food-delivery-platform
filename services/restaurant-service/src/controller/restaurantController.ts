import { Request, Response } from "express";
import Restaurant from "../types/Restaurant";
import messagePublisher from "../utils/messagePublisher";
import {
  IRestaurantDocument,
  PaginatedResponse,
  RestaurantQuery,
  RestaurantRequest,
} from "@/types";

export const createRestaurant = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      cuisine_type,
      address,
      contact,
      operating_hours,
      delivery_radius,
      minimum_order,
      delivery_fee,
    } = req.body;

    const restaurant = new Restaurant({
      name,
      description,
      cuisine_type,
      address,
      contact,
      operating_hours,
      delivery_radius,
      minimum_order,
      delivery_fee,
    });

    await restaurant.save();

    await messagePublisher.publishMessage("restaurant.created", {
      restaurantId: restaurant._id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      address: restaurant.address,
      created_at: restaurant.created_at,
    });

    res.status(201).json({
      success: true,
      message: "Restaurant created successfully",
      data: restaurant,
    });
  } catch (error) {
    console.error("❌ Error creating restaurant:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create restaurant",
    });
  }
};

export const getRestaurants = async (req: RestaurantRequest, res: Response) => {
  try {
    const {
      cuisine_type,
      city,
      is_active = "true",
      page = "1",
      limit = "10",
      search,
      min_rating,
      delivery_radius,
    }: RestaurantQuery = req.query;

    const filter: any = {};

    if (is_active !== undefined) {
      filter.is_active = is_active === "true" || is_active === true;
    }

    if (cuisine_type) {
      filter.cuisine_type = {
        $regex: cuisine_type,
        $options: "i",
      };
    }

    if (city) {
      filter["address.city"] = {
        $regex: city,
        $options: "i",
      };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { cuisine_type: { $regex: search, $options: "i" } },
      ];
    }

    if (min_rating) {
      const rating = parseFloat(min_rating as string);
      if (!isNaN(rating)) {
        filter.rating = { $gte: rating };
      }
    }

    if (delivery_radius) {
      const radius = parseFloat(delivery_radius as string);
      if (!isNaN(radius)) {
        filter.delivery_radius = { $lte: radius };
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    const [restaurants, total] = await Promise.all([
      Restaurant.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Restaurant.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const response: PaginatedResponse<IRestaurantDocument> = {
      data: restaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };

    return res.status(200).json({
      success: true,
      ...response,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurants",
    });
  }
};

export const getRestaurantById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findById(id).lean();

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch restaurant",
    });
  }
};

export const updateRestaurant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id && !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid restaurant ID",
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      id,
      { ...req.body, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    await messagePublisher.publishMessage("restaurant.updated", {
      restaurantId: restaurant._id,
      name: restaurant.name,
      description: restaurant.description,
      cuisine_type: restaurant.cuisine_type,
      address: restaurant.address,
    });

    return res.status(200).json({
      success: true,
      data: restaurant,
      message: "Restaurant updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update restaurant",
    });
  }
};

export const searchRestaurants = async (req: Request, res: Response) => {
  try {
    const {
      latitude,
      longitude,
      radius = "10",
      page = "1",
      limit = "10",
    } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const searchRadius = parseFloat(radius as string) || 10;

    if (isNaN(lat) || isNaN(lng) || isNaN(searchRadius)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude, longitude, or radius",
      });
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    const restaurants = await Restaurant.find({
      is_active: true,
      "address.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: searchRadius * 1000,
        },
      },
    })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Restaurant.countDocuments({
      is_active: true,
      "address.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: searchRadius * 1000,
        },
      },
    });

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    return res.status(200).json({
      success: true,
      data: restaurants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to search restaurants",
    });
  }
};
