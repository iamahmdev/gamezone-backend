require("dotenv").config();
const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const rateLimit     = require("express-rate-limit");
const connectDB     = require("./config/db");
const { PORT }      = require("./config/constants");
const StatsModel    = require("./models/statsModel");

// ── Connect DB immediately at module load (Vercel cold start fix) ──
// This starts the connection as soon as the function loads,
// so by the time a request arrives, DB is likely already connected.
const dbPromise = connectDB().catch((err) => {
  console.error("[DB] Initial connection error:", err.message);
});

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

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return cb(null, true);
    const allowed = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
      : [];
    if (allowed.includes(origin)) return cb(null, true);
    console.warn("[CORS] Blocked origin:", origin);
    return cb(new Error("CORS: origin not allowed"));
  },
  credentials: true,
}));

// ── Body parser ───────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));

// ── Rate Limiters ─────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many auth attempts, please try again in 15 minutes." },
});

app.use(globalLimiter);

// ── DB middleware — wait for connection before handling request ────
app.use(async (req, res, next) => {
  try {
    // Wait for the initial connection promise (already started at module load)
    await dbPromise;
    // Ensure still connected (reconnect if dropped)
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB] Connection error:", err.message);
    // Last resort retry with fresh connect
    try {
      await connectDB();
      next();
    } catch (err2) {
      console.error("[DB] Final retry failed:", err2.message);
      res.status(500).json({ ok: false, error: "Service temporarily unavailable. Please try again in a moment." });
    }
  }
});

// ── Health ────────────────────────────────────────────────
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "GameZone API running", version: "3.0" })
);

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth",         authLimiter, authRoutes);
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

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

// ── Local dev server only ─────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  dbPromise.then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀  GameZone API  →  http://localhost:${PORT}\n`);
    });
  }).catch(console.error);
} else {
  // Railway / any always-on server — start listening
  dbPromise.then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀  GameZone API running on port ${PORT}\n`);
    });
  }).catch((err) => {
    console.error("Failed to connect DB:", err.message);
    process.exit(1);
  });
}

module.exports = app;
