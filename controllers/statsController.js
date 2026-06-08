const StatsModel         = require("../models/statsModel");
const { success, error } = require("../utils/response");

const getLiveStats = (req, res) => {
  try {
    return success(res, StatsModel.get());
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getLiveStats };
