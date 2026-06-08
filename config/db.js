const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // Reuse existing connection (important for Vercel serverless)
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  });

  isConnected = true;
  console.log(`✅  MongoDB connected → ${mongoose.connection.host}`);
};

module.exports = connectDB;
