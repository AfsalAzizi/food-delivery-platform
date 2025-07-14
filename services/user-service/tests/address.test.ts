import request from "supertest";
import app from "../src/app";

import dotenv from "dotenv";
import { describe } from "node:test";
import pool from "../src/config/db";

dotenv.config({ path: ".env.test" });

describe("Address Routes", () => {
  const testEmail = "addresstest@example.com";
  let authToken: string;
  let userId: string;
  let addressId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await pool.query(
      "DELETE FROM addresses WHERE user_id IN (SELECT id FROM users WHERE email=$1)",
      [testEmail]
    );
    await pool.query("DELETE FROM users WHERE email=$1", [testEmail]);

    // Register a new user
    const registerResponse = await request(app).post("/auth/register").send({
      email: testEmail,
      password: "test123",
      first_name: "Address",
      last_name: "Tester",
      phone: "1234567890",
    });

    userId = registerResponse.body.user.id;
    authToken = registerResponse.body.token;
  });

  afterAll(async () => {
    await pool.query("DELETE FROM addresses WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM users WHERE email=$1", [testEmail]);
    await pool.end();
  });
});
