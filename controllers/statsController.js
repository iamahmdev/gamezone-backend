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

module.exports = { getLiveStats };
