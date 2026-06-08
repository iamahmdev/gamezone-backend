const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // Reuse existing connection (critical for Vercel serverless cold starts)
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 30000, // 30s — enough for cold start
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    bufferCommands: false,
    maxPoolSize: 10,
  });

  isConnected = true;
  console.log(`✅  MongoDB connected → ${mongoose.connection.host}`);
};

module.exports = connectDB;
