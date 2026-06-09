const StatsModel         = require("../models/statsModel");
const { success, error } = require("../utils/response");

const getLiveStats = async (req, res) => {
  try {
    const data = await StatsModel.get();
    return success(res, data);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// GET /api/stats/winners — real recent big wins from DB
const getRecentWinners = async (req, res) => {
  try {
    const mongoose   = require("mongoose");
    const Transaction = mongoose.model("Transaction");
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    // Get last 10 real wins today, sorted by amount desc
    const wins = await Transaction.find({
      type:      "win",
      amount:    { $gte: 100 },
      createdAt: { $gte: start },
    })
      .sort({ amount: -1 })
      .limit(10)
      .populate("userId", "username")
      .lean();

    const messages = wins.map((w) => {
      const user = w.userId?.username ?? "Player";
      const game = w.label?.replace(" Win", "") ?? "Game";
      return `🏆 ${user} won PKR ${w.amount.toLocaleString()} in ${game}`;
    });

    // If no real wins yet today, return empty array — frontend handles fallback
    return success(res, { messages });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getLiveStats, getRecentWinners };
