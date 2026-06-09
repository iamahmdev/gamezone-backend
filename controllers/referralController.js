const UserModel          = require("../models/userModel");
const ReferralModel      = require("../models/referralModel");
const { success, error } = require("../utils/response");

const getReferralStats = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    const userId = (user._id || user.id).toString();

    const [directRefs, todayTeam] = await Promise.all([
      ReferralModel.countByReferrer(userId),
      ReferralModel.countTodayByReferrer(userId),
    ]);

    // Commission: PKR 30 per direct referral (simplified — extend for bet-based commission)
    const totalEarned = directRefs * 30;

    return success(res, {
      totalEarned,
      todayTeam,
      directRefs,
      link: user.referralLink || `https://gamezone.pro/?ref=${user.referralCode}`,
      code: user.referralCode || userId,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getReferralStats };
