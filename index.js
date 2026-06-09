require("dotenv").config();
const express       = require("express");
const cors          = require("cors");
const helmet        = require("helmet");
const rateLimit     = require("express-rate-limit");
const connectDB     = require("./config/db");
const { PORT }      = require("./config/constants");

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
app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
    if (/^https:\/\/.*\.vercel\.app$/.test(origin)) return cb(null, true);
    const allowed = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
      : [];
    if (allowed.includes(origin)) return cb(null, true);
    return cb(new Error("CORS: origin not allowed"));
  },
  credentials: true,
}));

app.use(express.json({ limit: "10kb" }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: "Too many requests, please try again later." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { ok: false, error: "Too many auth attempts, please try again in 15 minutes." },
});
app.use(globalLimiter);

// ── Health (no DB needed) ─────────────────────────────────
app.get("/", (req, res) =>
  res.json({ status: "ok", message: "GameZone API running", version: "3.0" })
);

// ── DB middleware ─────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("[DB]", err.message);
    res.status(500).json({ ok: false, error: "Database unavailable. Please try again." });
  }
});

// ── Routes ────────────────────────────────────────────────
app.use("/api/auth",         authLimiter, authRoutes);
app.use("/api/games",        gameRoutes);
app.use("/api/stats",        statsRoutes);
app.use("/api/user",         userRoutes);
app.use("/api/wallet",       walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/missions",     missionRoutes);
app.use("/api/referral",     referralRoutes);
app.use("/api/favorites",    favoriteRoutes);

app.use((req, res) =>
  res.status(404).json({ ok: false, error: `Route ${req.method} ${req.path} not found` })
);

app.use((err, req, res, next) => {
  console.error("[ERROR]", err);
  res.status(500).json({ ok: false, error: "Internal server error" });
});

// Local dev only
if (!process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`🚀 GameZone API → http://localhost:${PORT}`));
  }).catch(console.error);
}

module.exports = app;
