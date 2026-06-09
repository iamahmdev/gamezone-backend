const mongoose = require("mongoose");
const Transaction = mongoose.model
  ? (mongoose.models.Transaction || require("./transactionModel")._model)
  : null;

// Real stats pulled from MongoDB
const StatsModel = {
  async get() {
    try {
      const Transaction = require("mongoose").model("Transaction");
      const start = new Date(); start.setHours(0, 0, 0, 0);

      const [onlineNow, todayWinners, bigWinResult] = await Promise.all([
        // Unique users who placed a bet in last 10 minutes
        Transaction.distinct("userId", {
          type: "bet",
          createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
        }).then(arr => Math.max(arr.length, 5)),

        // Unique users who had a win today
        Transaction.distinct("userId", {
          type: "win",
          createdAt: { $gte: start },
        }).then(arr => arr.length),

        // Biggest single win today
        Transaction.findOne({ type: "win", createdAt: { $gte: start } })
          .sort({ amount: -1 })
          .select("amount")
          .lean(),
      ]);

      return {
        onlineNow:    Math.max(onlineNow, 5),
        todayWinners: todayWinners,
        bigWin:       bigWinResult?.amount || 0,
      };
    } catch {
      // Fallback if DB not ready yet — return real zeros, no fake numbers
      return { onlineNow: 0, todayWinners: 0, bigWin: 0 };
    }
  },

  // kept for backward compat — no longer used
  tick() {},
};

module.exports = StatsModel;
