import { Request, Response } from "express";
import pool from "../config/db";
import { AuthRequest } from "../middleware/authMiddleware";
import { messagePublisher } from "../utils/messagePublisher";

export const addAddress = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const {
    label,
    street_address,
    city,
    state,
    postal_code,
    country,
    latitude,
    longitude,
  } = req.body;

  if (
    !label ||
    !street_address ||
    !city ||
    !state ||
    !postal_code ||
    !country
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (latitude !== undefined && latitude !== null) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        error: "Invalid coordinates",
      });
    }
  }

  if (longitude !== undefined && longitude !== null) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "Invalid coordinates",
      });
    }
  }

  try {
    // Check if there is an existing  address
    const existingAddress = await pool.query(
      "SELECT * FROM addresses WHERE user_id = $1",
      [userId]
    );

    const addressCount = existingAddress.rows.length;
    const isFirstAddress = addressCount === 0;

    const willBeDefault = isFirstAddress;

    const result = await pool.query(
      "INSERT INTO addresses (user_id, label, street_address, city, state, postal_code, country, latitude, longitude, is_default) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
      [
        userId,
        label,
        street_address,
        city,
        state,
        postal_code,
        country,
        latitude,
        longitude,
        willBeDefault,
      ]
    );

    await messagePublisher.publishMessage("address.added", {
      userId,
      addressId: result.rows[0].id,
      label: result.rows[0].label,
      isDefault: result.rows[0].is_default,
      isFirstAddress: willBeDefault,
    });

    res.status(201).json({
      message: "Address added successfully",
      address: result.rows[0],
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ error: "Failed to add address" });
  }
};

export const getUserAddresses = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: "Unauthorized" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM addresses WHERE user_id = $1",
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
};

export const getAddressById = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  const addressId = req.params.id;
  try {
    const results = await pool.query(
      "SELECT * FROM addresses WHERE id=$1 AND user_id=$2",
      [addressId, userId]
    );

    if (results.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json(results.rows[0]);
  } catch (error) {
    console.error("Error fetching address:", error);
    res.status(500).json({
      error: "Failed to fetch address",
    });
  }
};

export const updateAddress = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const addressId = req.params.id;

  const {
    label,
    street_address,
    city,
    state,
    postal_code,
    country,
    latitude,
    longitude,
    is_default,
  } = req.body;

  if (!userId || !addressId) {
    return res.status(400).json({ error: "Unauthorized or address not found" });
  }

  if (latitude !== undefined && latitude !== null) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({
        error: "Invalid coordinates",
      });
    }
  }

  if (longitude !== undefined && longitude !== null) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return res.status(400).json({
        error: "Invalid coordinates",
      });
    }
  }

  try {
    const checkResult = await pool.query(
      "SELECT * FROM addresses WHERE id=$1 AND user_id=$2",
      [addressId, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (is_default) {
        await client.query(
          "UPDATE addresses SET is_default = false WHERE user_id = $1",
          [userId]
        );
      }

      const result = await client.query(
        `UPDATE addresses 
            SET label = COALESCE($1, label),
            street_address = COALESCE($2, street_address),
            city = COALESCE($3, city),
            state = COALESCE($4, state),
            postal_code = COALESCE($5, postal_code),
            country = COALESCE($6, country),
            latitude = COALESCE($7, latitude),
            longitude = COALESCE($8, longitude),
            updated_at = CURRENT_TIMESTAMP,
            is_default = COALESCE($9, is_default)
            WHERE id = $10 AND user_id = $11
            RETURNING *`,
        [
          label,
          street_address,
          city,
          state,
          postal_code,
          country,
          latitude,
          longitude,
          is_default,
          addressId,
          userId,
        ]
      );

      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating address:", error);
      res.status(500).json({
        error: "Failed to update address",
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      error: "Failed to update address",
    });
  }
};

export const deleteAddress = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const addressId = req.params.id;

  if (!userId || !addressId) {
    return res.status(400).json({ error: "Unauthorized or address not found" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const addressCheck = await client.query(
      "SELECT * FROM addresses WHERE id=$1 AND user_id=$2",
      [addressId, userId]
    );

    if (addressCheck.rows.length === 0) {
      return res.status(404).json({ error: "Address not found" });
    }

    const addressToDelete = addressCheck.rows[0];
    const wasDefault = addressToDelete.is_default;

    await client.query("DELETE FROM addresses WHERE id=$1 AND user_id=$2", [
      addressId,
      userId,
    ]);

    if (wasDefault) {
      await client.query(
        `UPDATE addresses
            SET is_default = true
            WHERE id=(
            SELECT id FROM addresses
            WHERE user_id = $1
            ORDER BY created_at ASC
            LIMIT 1)`,
        [userId]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error deleting address:", error);
    res.status(500).json({
      error: "Failed to delete address",
    });
  } finally {
    client.release();
  }
};

export const getAddressCount = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM addresses WHERE user_id=$1",
      [userId]
    );

    res.json({ count: result.rows[0].count });
  } catch (error) {
    console.error("Error fetching address count:", error);
    res.status(500).json({
      error: "Failed to fetch address count",
    });
  }
};
