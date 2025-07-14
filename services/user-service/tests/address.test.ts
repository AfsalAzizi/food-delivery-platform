import request from "supertest";
import app from "../src/app";

import dotenv from "dotenv";
import { describe } from "node:test";
import pool from "../src/config/db";
import { Address } from "../src/models/Address";

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

  describe("POST /user/address", () => {
    it("should create a new address", async () => {
      const addressData = {
        label: "Home",
        street_address: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const response = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(addressData);

      expect(response.status).toBe(201);

      const dbResult = await pool.query(
        "SELECT * FROM addresses WHERE user_id=$1",
        [userId]
      );

      expect(dbResult.rows.length).toBe(1);
      expect(dbResult.rows[0].label).toBe(addressData.label);
      expect(dbResult.rows[0].is_default).toBe(true);
    });

    it("should not make the second address the default", async () => {
      const addressData = {
        label: "Work",
        street_address: "456 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const response = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(addressData);

      expect(response.status).toBe(201);

      const dbResult = await pool.query(
        "SELECT * FROM addresses WHERE user_id=$1",
        [userId]
      );

      expect(dbResult.rows.length).toBe(2);
      expect(dbResult.rows[0].is_default).toBe(true);
      expect(dbResult.rows[1].is_default).toBe(false);
    });

    it("should reject invalid coordinates", async () => {
      const invalidData = {
        label: "Invalid",
        street_address: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 91,
        longitude: -122.419416,
      };

      const response = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid coordinates");
    });

    it("should reject missing required fields", async () => {
      const missingData = {
        label: "Missing",
        street_address: "123 Main St",
        city: "Anytown",
      };

      const response = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(missingData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Missing required fields");
    });

    it("should reject request without auth token", async () => {
      const addressData = {
        label: "Test",
        street_address: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const response = await request(app)
        .post("/user/address")
        .send(addressData);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /user/addresses", () => {
    it("should get all addresses", async () => {
      const response = await request(app)
        .get("/user/addresses")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("label");
      expect(response.body[0]).toHaveProperty("street_address");
      expect(response.body[0]).toHaveProperty("city");
      expect(response.body[0]).toHaveProperty("state");
      expect(response.body[0]).toHaveProperty("postal_code");
      expect(response.body[0]).toHaveProperty("country");
      expect(response.body[0]).toHaveProperty("latitude");
    });

    it("should reject request without auth token", async () => {
      const response = await request(app).get("/user/addresses");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /user/addresses/count", () => {
    it("should get the number of addresses", async () => {
      const response = await request(app)
        .get("/user/addresses/count")
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("count");
      expect(typeof response.body.count).toBe("string");
      expect(parseInt(response.body.count)).toBeGreaterThan(0);
    });

    it("should reject request without auth token", async () => {
      const response = await request(app).get("/user/addresses/count");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });
  });

  describe("GET /user/addresses/:id", () => {
    it("should get an address by id", async () => {
      const addressesRespones = await request(app)
        .get("/user/addresses")
        .set("Authorization", `Bearer ${authToken}`);

      addressId = addressesRespones.body[0].id;

      const response = await request(app)
        .get(`/user/addresses/${addressId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(addressId);
      expect(response.body.label).toBe(addressesRespones.body[0].label);
      expect(response.body.street_address).toBe(
        addressesRespones.body[0].street_address
      );
      expect(response.body.city).toBe(addressesRespones.body[0].city);
      expect(response.body.state).toBe(addressesRespones.body[0].state);
      expect(response.body.postal_code).toBe(
        addressesRespones.body[0].postal_code
      );
      expect(response.body.country).toBe(addressesRespones.body[0].country);
      expect(response.body.latitude).toBe(addressesRespones.body[0].latitude);
    });

    it("should return 404 if address not found", async () => {
      const response = await request(app)
        .get(`/user/addresses/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /user/addresses/:id", () => {
    it("should delete an address", async () => {
      const newAddress = {
        label: "New Address",
        street_address: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const newAddressResponse = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newAddress);

      console.log(newAddressResponse.body);

      addressId = newAddressResponse.body.address.id;

      const response = await request(app)
        .delete(`/user/addresses/${addressId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Address deleted successfully");

      const verifyResponse = await request(app)
        .get(`/user/addresses/${addressId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(verifyResponse.status).toBe(404);
      expect(verifyResponse.body.error).toBe("Address not found");
    });

    it("should reassign default when default address is deleted", async () => {
      const address1 = {
        label: "New Address",
        street_address: "123 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const newAddressResponse = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(address1);

      addressId = newAddressResponse.body.address.id;

      const address2 = {
        label: "New Address 2",
        street_address: "456 Main St",
        city: "Anytown",
        state: "CA",
        postal_code: "12345",
        country: "USA",
        latitude: 37.774929,
        longitude: -122.419416,
      };

      const address2Response = await request(app)
        .post("/user/address")
        .set("Authorization", `Bearer ${authToken}`)
        .send(address2);

      addressId = address2Response.body.address.id;

      // get the default address
      const addressesResponse = await request(app)
        .get("/user/addresses")
        .set("Authorization", `Bearer ${authToken}`);

      const defaultAddressId = addressesResponse.body.find(
        (addr: Address) => addr.is_default
      )?.id;

      // delete the default address

      const response = await request(app)
        .delete(`/user/addresses/${defaultAddressId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // get the default address again
      const addressesResponse2 = await request(app)
        .get("/user/addresses")
        .set("Authorization", `Bearer ${authToken}`);

      // make sure there is a default address
      const defaultAddress = addressesResponse2.body.find(
        (addr: Address) => addr.is_default
      );

      expect(defaultAddress).toBeDefined();
      expect(defaultAddress?.id).not.toBe(defaultAddressId);
    });

    it("should return 404 for non-existent address", async () => {
      const response = await request(app)
        .delete(`/user/addresses/123e4567-e89b-12d3-a456-426614174000`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
