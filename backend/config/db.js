const mongoose = require("mongoose");

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI not set - add it to your .env file");
}

const connectDB = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i += 1) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("MongoDB connected successfully");
      return;
    } catch (err) {
      console.error(`DB connection attempt ${i + 1} failed:`, err.message);
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error("Could not connect to MongoDB after 5 attempts");
};

module.exports = connectDB;
