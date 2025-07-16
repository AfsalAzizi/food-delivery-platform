import { MenuItemQuery, MenuItemRequest, PaginatedResponse } from "../types";
import { Response } from "express";
import MenuItem, { IMenuItem } from "../types/MenuItem";

import messagePublisher from "../utils/messagePublisher";
import Restaurant from "../types/Restaurant";

export const createMenuItem = async (req: MenuItemRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const {
      name,
      description,
      category,
      price,
      image_url,
      ingredients,
      dietary_info,
      is_available,
      preparation_time,
    } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    if (restaurant.is_active === false) {
      return res.status(400).json({
        success: false,
        message: "Restaurant is not active",
      });
    }
    if (!name || !description || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be greater than 0",
      });
    }

    const menuItem = new MenuItem({
      restaurant_id: restaurantId,
      name,
      description,
      category,
      price,
      image_url,
      ingredients,
      dietary_info,
      is_available,
      preparation_time,
    });

    await menuItem.save();

    await messagePublisher.publishMessage("menu.item.added", {
      menuItemId: menuItem._id,
      name: menuItem.name,
      description: menuItem.description,
      category: menuItem.category,
    });

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  } catch (error) {
    console.error("❌ Error creating menu item:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create menu item",
    });
  }
};

export const getAllMenuItems = async (req: MenuItemRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const {
      page = "1",
      limit = "10",
      search,
      category,
      is_available,
      min_price,
      max_price,
      dietory_info,
    }: MenuItemQuery = req.query;

    const restaurant = await Restaurant.findById(restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const filter: any = {};

    if (category) {
      filter.category = {
        $regex: category,
        $options: "i",
      };
    }

    if (is_available !== undefined) {
      (filter.is_available == is_available) === true;
    }

    if (min_price) {
      filter.price = {
        $gte: min_price,
      };
    }

    if (max_price) {
      filter.price = {
        $lte: max_price,
      };
    }

    if (dietory_info) {
      filter.dietory_info = {
        $regex: dietory_info,
        $options: "i",
      };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { ingredients: { $regex: search, $options: "i" } },
        { dietary_info: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(50, Math.max(1, parseInt(limit.toString())));
    const skip = (pageNum - 1) * limitNum;

    const [menuItems, total] = await Promise.all([
      MenuItem.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MenuItem.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    const response: PaginatedResponse<IMenuItem> = {
      data: menuItems,
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
      message: "Menu items fetched successfully",
      data: response,
    });
  } catch (error) {
    console.error("❌ Error getting all menu items:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get all menu items",
    });
  }
};
