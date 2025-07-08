import request from "supertest";
import app from "../src/app";
import pool from "../src/config/db";

import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

describe("Auth Routes", () => {
  const testEmail = "testuser@example.com";

  beforeAll(async () => {
    await pool.query("DELETE FROM users WHERE email=$1", [testEmail]);
  });

  afterAll(async () => {
    pool.end();
  });

  it("should register a new user", async () => {
    const response = await request(app).post("/auth/register").send({
      email: testEmail,
      password: "test123",
      first_name: "Test",
      last_name: "User",
      phone: "1234567890",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("user");
    expect(response.body).toHaveProperty("token");
  });

  it("should login the user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "test123",
    });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body).toHaveProperty("token");
  });

  it("should fetch user profile with valid token", async () => {
    const login = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "test123",
    });

    const token = login.body.token;

    const res = await request(app)
      .get("/user/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(testEmail);
  });
});
