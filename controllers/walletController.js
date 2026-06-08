const WalletModel        = require("../models/walletModel");
const TransactionModel   = require("../models/transactionModel");
const MissionModel       = require("../models/missionModel");
const { validateAmount } = require("../utils/validators");
const { success, error } = require("../utils/response");

const getWallet = (req, res) => {
  try {
    const wallet = WalletModel.getByUserId(req.userId);
    if (!wallet) return error(res, "Wallet not found", 404);
    return success(res, wallet);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const deposit = (req, res) => {
  try {
    const amtErr = validateAmount(req.body.amount);
    if (amtErr) return error(res, amtErr);
    const amount = Number(req.body.amount);

    const wallet = WalletModel.deposit(req.userId, amount);
    const tx     = TransactionModel.create(req.userId, {
      type: "deposit", label: "Deposit", amount, positive: true,
    });

    // Mark mission 1 (recharge 500) done if applicable
    if (amount >= 500) MissionModel.markDone(req.userId, 1);

    return success(res, { wallet, transaction: tx });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const withdraw = (req, res) => {
  try {
    const amtErr = validateAmount(req.body.amount);
    if (amtErr) return error(res, amtErr);
    const amount = Number(req.body.amount);

    const wallet = WalletModel.withdraw(req.userId, amount);
    if (!wallet) return error(res, "Insufficient withdrawable balance");

    const tx = TransactionModel.create(req.userId, {
      type: "withdraw", label: "Withdrawal", amount, positive: false,
    });
    return success(res, { wallet, transaction: tx });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const placeBet = (req, res) => {
  try {
    const { amount, game: gameName, result, payout } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);
    const betAmt = Number(amount);

    // Deduct bet
    const walletAfterBet = WalletModel.deductBet(req.userId, betAmt);
    if (!walletAfterBet) return error(res, "Insufficient balance");

    TransactionModel.create(req.userId, {
      type: "bet", label: `${gameName} Bet`, amount: betAmt, positive: false,
    });

    let finalWallet = walletAfterBet;

    if (result === "win" && payout) {
      const winAmt = Number(payout);
      finalWallet  = WalletModel.creditWin(req.userId, winAmt);
      TransactionModel.create(req.userId, {
        type: "win", label: `${gameName} Win`, amount: winAmt, positive: true,
      });
    }

    return success(res, { wallet: finalWallet });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getWallet, deposit, withdraw, placeBet };
