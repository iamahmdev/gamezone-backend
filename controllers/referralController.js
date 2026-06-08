const UserModel          = require("../models/userModel");
const { success, error } = require("../utils/response");

// Per-user referral stats (in-memory, grows over time)
const referralStats = {};

const initStats = (userId) => {
  if (!referralStats[userId]) {
    referralStats[userId] = { totalEarned: 0, todayTeam: 0, directRefs: 0 };
  }
  return referralStats[userId];
};

const getReferralStats = (req, res) => {
  try {
    const user  = UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);
    const stats = initStats(req.userId);
    return success(res, {
      ...stats,
      link: user.referralLink,
      code: user.referralCode,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getReferralStats };
