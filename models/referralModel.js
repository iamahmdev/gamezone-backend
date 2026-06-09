const mongoose = require("mongoose");

// Tracks each referral relationship: who referred whom
const referralSchema = new mongoose.Schema(
  {
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referredId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  },
  { timestamps: true }
);

referralSchema.index({ referrerId: 1 });

const Referral = mongoose.model("Referral", referralSchema);

const ReferralModel = {
  // Record a referral when a new user registers with a ref code
  async record(referrerId, referredId) {
    try {
      await Referral.create({ referrerId, referredId });
    } catch {
      // Ignore duplicate (user already has a referrer)
    }
  },

  // Total referrals made by a user
  async countByReferrer(referrerId) {
    return await Referral.countDocuments({ referrerId });
  },

  // Referrals made today
  async countTodayByReferrer(referrerId) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return await Referral.countDocuments({ referrerId, createdAt: { $gte: start } });
  },
};

module.exports = ReferralModel;
