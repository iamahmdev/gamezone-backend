const TransactionModel   = require("../models/transactionModel");
const { success, error } = require("../utils/response");

const getTransactions = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const txs   = await TransactionModel.getByUserId(req.userId, limit);
    return success(res, txs);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getTransactions };
