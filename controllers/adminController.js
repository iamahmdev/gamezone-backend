const UserModel        = require("../models/userModel");
const WalletModel      = require("../models/walletModel");
const TransactionModel = require("../models/transactionModel");
const MissionModel     = require("../models/missionModel");
const { validateAmount } = require("../utils/validators");
const { success, error } = require("../utils/response");
const { MAX_TX_LIMIT }   = require("../config/constants");
const bcrypt             = require("bcryptjs");
const { BCRYPT_ROUNDS }  = require("../config/constants");

// ── DASHBOARD STATS ───────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [totalUsers, newToday, totalDeposited, totalWithdrawn, todayDeposited, todayWithdrawn] =
      await Promise.all([
        UserModel.countAll(),
        UserModel.countNewToday(),
        TransactionModel.getTotalDeposited(),
        TransactionModel.getTotalWithdrawn(),
        TransactionModel.getTodayDeposited(),
        TransactionModel.getTodayWithdrawn(),
      ]);

    return success(res, {
      totalUsers,
      newToday,
      totalDeposited,
      totalWithdrawn,
      todayDeposited,
      todayWithdrawn,
      profit: totalDeposited - totalWithdrawn,
      todayProfit: todayDeposited - todayWithdrawn,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── USERS ─────────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const page   = Math.max(1, Number(req.query.page)  || 1);
    const limit  = Math.min(100, Number(req.query.limit) || 20);
    const search = req.query.search || "";
    const result = await UserModel.findAll({ page, limit, search });
    return success(res, result);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const getUser = async (req, res) => {
  try {
    const user   = await UserModel.findById(req.params.id);
    if (!user) return error(res, "User not found", 404);
    const wallet = await WalletModel.getByUserId(req.params.id);
    const { txs } = await TransactionModel.getAll({ userId: req.params.id, limit: 50 });
    return success(res, { user: UserModel.safe(user), wallet, transactions: txs });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const banUser = async (req, res) => {
  try {
    const { reason = "" } = req.body;
    const user = await UserModel.banUser(req.params.id, reason);
    if (!user) return error(res, "User not found", 404);
    return success(res, { message: "User banned", user: UserModel.safe(user) });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const unbanUser = async (req, res) => {
  try {
    const user = await UserModel.unbanUser(req.params.id);
    if (!user) return error(res, "User not found", 404);
    return success(res, { message: "User unbanned", user: UserModel.safe(user) });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const promoteUser = async (req, res) => {
  try {
    const user = await UserModel.setAdmin(req.params.id, true);
    if (!user) return error(res, "User not found", 404);
    return success(res, { message: "User promoted to admin", user: UserModel.safe(user) });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const demoteUser = async (req, res) => {
  try {
    const user = await UserModel.setAdmin(req.params.id, false);
    if (!user) return error(res, "User not found", 404);
    return success(res, { message: "Admin privileges revoked", user: UserModel.safe(user) });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// Reset user password (admin sets a new password directly)
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return error(res, "New password must be at least 6 characters");
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const ok   = await UserModel.updatePassword(req.params.id, hash);
    if (!ok) return error(res, "User not found", 404);
    return success(res, { message: "Password reset successfully" });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── WALLET MANAGEMENT ────────────────────────────────────────────────────────
const adjustBalance = async (req, res) => {
  try {
    const { amount, note = "" } = req.body;
    const amtErr = validateAmount(Math.abs(Number(amount)));
    if (amtErr) return error(res, amtErr);

    const amt = Number(amount); // positive = add, negative = deduct
    if (amt === 0) return error(res, "Amount cannot be zero");

    const wallet = await WalletModel.getByUserId(req.params.id);
    if (!wallet) return error(res, "Wallet not found", 404);

    let newWallet;
    if (amt > 0) {
      newWallet = await WalletModel.creditWin(req.params.id, amt);
    } else {
      if (wallet.balance < Math.abs(amt)) return error(res, "Insufficient balance to deduct");
      newWallet = await WalletModel.deductBet(req.params.id, Math.abs(amt));
      if (!newWallet) return error(res, "Could not deduct balance");
    }

    // Log the adjustment as a transaction
    await TransactionModel.create(req.params.id, {
      type:     amt > 0 ? "deposit" : "withdraw",
      label:    `Admin Adjustment: ${note || (amt > 0 ? "Balance Added" : "Balance Deducted")}`,
      amount:   Math.abs(amt),
      positive: amt > 0,
      status:   "completed",
    });

    return success(res, { wallet: newWallet, message: `Balance ${amt > 0 ? "added" : "deducted"} successfully` });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── DEPOSIT APPROVALS ────────────────────────────────────────────────────────
const getPendingDeposits = async (req, res) => {
  try {
    const txs = await TransactionModel.getPending("deposit");
    return success(res, txs);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const approveDeposit = async (req, res) => {
  try {
    const { adminNote = "" } = req.body;
    const tx = await TransactionModel.updateStatus(req.params.txId, "completed", adminNote);
    if (!tx) return error(res, "Transaction not found", 404);
    if (tx.type !== "deposit") return error(res, "Not a deposit transaction");
    if (tx.status !== "completed") return error(res, "Already processed");

    // Credit the balance + set wager requirement
    const wallet = await WalletModel.deposit(tx.userId.toString(), tx.amount);

    // Mark mission 1 (recharge 500) done if applicable
    if (tx.amount >= 500) await MissionModel.markDone(tx.userId.toString(), 1);

    return success(res, {
      message: `Deposit of PKR ${tx.amount} approved and credited`,
      wallet,
      transaction: tx,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const rejectDeposit = async (req, res) => {
  try {
    const { adminNote = "Rejected by admin" } = req.body;
    const tx = await TransactionModel.updateStatus(req.params.txId, "rejected", adminNote);
    if (!tx) return error(res, "Transaction not found", 404);
    return success(res, { message: "Deposit rejected", transaction: tx });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── WITHDRAWAL APPROVALS ─────────────────────────────────────────────────────
const getPendingWithdrawals = async (req, res) => {
  try {
    const txs = await TransactionModel.getPending("withdraw");
    return success(res, txs);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const approveWithdrawal = async (req, res) => {
  try {
    const { adminNote = "" } = req.body;
    // Balance was already deducted when user submitted the request
    const tx = await TransactionModel.updateStatus(req.params.txId, "completed", adminNote);
    if (!tx) return error(res, "Transaction not found", 404);
    return success(res, { message: `Withdrawal of PKR ${tx.amount} approved (balance already deducted)`, transaction: tx });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const rejectWithdrawal = async (req, res) => {
  try {
    const { adminNote = "Rejected by admin" } = req.body;
    // Refund the balance since it was deducted on request
    const tx = await TransactionModel.updateStatus(req.params.txId, "rejected", adminNote);
    if (!tx) return error(res, "Transaction not found", 404);

    const wallet = await WalletModel.creditWin(tx.userId.toString(), tx.amount);
    await TransactionModel.create(tx.userId.toString(), {
      type:     "deposit",
      label:    `Withdrawal Refund: ${adminNote}`,
      amount:   tx.amount,
      positive: true,
      status:   "completed",
    });

    return success(res, { message: `Withdrawal rejected and PKR ${tx.amount} refunded`, transaction: tx, wallet });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── ALL TRANSACTIONS ─────────────────────────────────────────────────────────
const getAllTransactions = async (req, res) => {
  try {
    const page  = Math.max(1, Number(req.query.page)  || 1);
    const limit = Math.min(MAX_TX_LIMIT, Number(req.query.limit) || 20);
    const type  = req.query.type   || null;
    const userId = req.query.userId || null;
    const result = await TransactionModel.getAll({ page, limit, type, userId });
    return success(res, result);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── BOOTSTRAP: make a user admin via secret key ───────────────────────────────
const bootstrapAdmin = async (req, res) => {
  try {
    if (!req.adminViaKey) return error(res, "Forbidden", 403);
    const { mobile } = req.body;
    if (!mobile) return error(res, "mobile is required");
    const user = await UserModel.findByMobile(mobile);
    if (!user) return error(res, "User not found", 404);
    await UserModel.setAdmin((user._id || user.id).toString(), true);
    return success(res, { message: `${user.username} is now an admin` });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = {
  getDashboard,
  getUsers, getUser, banUser, unbanUser, promoteUser, demoteUser, resetUserPassword,
  adjustBalance,
  getPendingDeposits, approveDeposit, rejectDeposit,
  getPendingWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllTransactions,
};
