const UserModel          = require("../models/userModel");
const { success, error } = require("../utils/response");

const getReferralStats = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    // Referral stats — extend this with a real ReferralModel if needed
    return success(res, {
      totalEarned: 0,
      todayTeam:   0,
      directRefs:  0,
      link:        user.referralLink || `https://gamezone.pro/?ref=${user.referralCode}`,
      code:        user.referralCode || (user._id || user.id).toString(),
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getReferralStats };
