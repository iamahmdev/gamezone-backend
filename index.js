require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const { PORT } = require("./config/constants");
const StatsModel = require("./models/statsModel");

// ── Routes ────────────────────────────────────────────────
const authRoutes        = require("./routes/authRoutes");
const gameRoutes        = require("./routes/gameRoutes");
const statsRoutes       = require("./routes/statsRoutes");
const userRoutes        = require("./routes/userRoutes");
const walletRoutes      = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const missionRoutes     = require("./routes/missionRoutes");
const referralRoutes    = require("./routes/referralRoutes");
const favoriteRoutes    = require("./routes/favoriteRoutes");

const app = express();

// ── Global Middleware ─────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    // Allow any localhost port in development
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    // Allow custom FRONTEND_URL from env
    const allowed = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
      : [];
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error("CORS: origin not allowed — " + origin));
  },
  credentials: true,
}));
app.use(express.json());

// ── Health ────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "GameZone API running", version: "2.0" })
);

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/games",        gameRoutes);
app.use("/api/stats",        statsRoutes);
app.use("/api/user",         userRoutes);
app.use("/api/wallet",       walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/missions",     missionRoutes);
app.use("/api/referral",     referralRoutes);
app.use("/api/favorites",    favoriteRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ ok: false, error: `Route ${req.method} ${req.path} not found` })
);

// ── Live stats ticker ─────────────────────────────────────
setInterval(() => StatsModel.tick(), 10000);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  GameZone API  →  http://localhost:${PORT}\n`);
  console.log("  PUBLIC:");
  console.log("    POST  /api/auth/register");
  console.log("    POST  /api/auth/login");
  console.log("    GET   /api/games");
  console.log("    GET   /api/stats");
  console.log("\n  PROTECTED (Bearer token):");
  console.log("    GET   /api/auth/me");
  console.log("    POST  /api/auth/change-password");
  console.log("    GET   /api/user/profile");
  console.log("    GET   /api/wallet");
  console.log("    POST  /api/wallet/deposit");
  console.log("    POST  /api/wallet/withdraw");
  console.log("    POST  /api/wallet/bet");
  console.log("    GET   /api/transactions");
  console.log("    GET   /api/missions");
  console.log("    POST  /api/missions/:id/claim");
  console.log("    GET   /api/referral");
  console.log("    GET   /api/favorites");
  console.log("    POST  /api/favorites/toggle\n");
});
