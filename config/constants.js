// ── Production safety: crash loudly if JWT_SECRET is missing ─────────────────
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is not set. Refusing to start.");
  process.exit(1);
}

module.exports = {
  JWT_SECRET:    process.env.JWT_SECRET,
  JWT_EXPIRES:   "7d",
  WELCOME_BONUS: 5000,
  BCRYPT_ROUNDS: 10,
  PORT:          process.env.PORT || 5000,
  MAX_DEPOSIT:   500000,   // PKR 5 lakh max deposit
  MAX_WITHDRAW:  200000,   // PKR 2 lakh max withdrawal
  MAX_TX_LIMIT:  200,      // max transactions per query
  // Mobile numbers that are auto-admin (comma separated)
  // e.g. ADMIN_MOBILE=03001234567 in .env
  ADMIN_MOBILES: (process.env.ADMIN_MOBILE || "").split(",").map(m => m.trim()).filter(Boolean),
};
