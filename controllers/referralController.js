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

    // Commission tiers based on total referrals
    let ratePerRef = 100; // PKR 100 for 1-5 refs
    if (directRefs > 50)      ratePerRef = 300;
    else if (directRefs > 20) ratePerRef = 200;
    else if (directRefs > 5)  ratePerRef = 150;
    const totalEarned = directRefs * ratePerRef;

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
