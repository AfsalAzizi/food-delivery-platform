import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoUrl =
      process.env.MONGODB_URL ||
      "mongdb://admin:secure_mongo_pass123@mongodb:27017/food_deliver?authSource=admin";

    await mongoose.connect(mongoUrl);
    console.log("🍃 MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
