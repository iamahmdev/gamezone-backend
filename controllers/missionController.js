const MissionModel       = require("../models/missionModel");
const WalletModel        = require("../models/walletModel");
const TransactionModel   = require("../models/transactionModel");
const { success, error } = require("../utils/response");

const getMissions = (req, res) => {
  try {
    const missions = MissionModel.getByUserId(req.userId);
    return success(res, missions);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const claimMission = (req, res) => {
  try {
    const missionId = Number(req.params.id);
    const result    = MissionModel.claim(req.userId, missionId);
    if (result.error) return error(res, result.error);

    const wallet = WalletModel.creditWin(req.userId, result.mission.reward);
    const tx     = TransactionModel.create(req.userId, {
      type: "mission",
      label: `Mission Reward: ${result.mission.title}`,
      amount: result.mission.reward,
      positive: true,
    });

    return success(res, { mission: result.mission, wallet, transaction: tx });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getMissions, claimMission };
