import { Request, Response } from "express";
import pool from "../config/db";

import { AuthRequest } from "../middleware/authMiddleware";
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({
      message: "Unauthorized",
    });
  }

  try {
    const result = await pool.query(`SELECT * FROM users WHERE id=$1`, [
      userId,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { password_hash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
