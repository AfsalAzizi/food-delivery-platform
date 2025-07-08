import { Request, Response } from "express";
import pool from "../config/db";
import bcypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;

export const registerUser = async (req: Request, res: Response) => {
  const { email, password, first_name, last_name, phone } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }
  try {
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, phone`,
      [email, hashedPassword, first_name, last_name, phone]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.log("Registration error: ", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password",
      });
    }

    const isMatch = await bcypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        message: "Incorrect email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
