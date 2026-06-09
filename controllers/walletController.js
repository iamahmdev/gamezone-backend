const WalletModel        = require("../models/walletModel");
const TransactionModel   = require("../models/transactionModel");
const MissionModel       = require("../models/missionModel");
const UserModel          = require("../models/userModel");
const { validateAmount } = require("../utils/validators");
const { success, error } = require("../utils/response");

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "923359348844";
const ADMIN_NAME     = "GameZone Admin";

// Send WhatsApp notification via wa.me link (logged to console for now)
// In production integrate with WhatsApp Business API / Twilio
const notifyAdmin = (message) => {
  console.log(`[NOTIFY] WhatsApp to +${ADMIN_WHATSAPP}: ${message}`);
  // You can integrate Twilio/WhatsApp API here
};

const getWallet = async (req, res) => {
  try {
    const wallet = await WalletModel.getByUserId(req.userId);
    if (!wallet) return error(res, "Wallet not found", 404);
    return success(res, wallet);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const deposit = async (req, res) => {
  try {
    const { amount, method, accountNumber } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);

    const amt = Number(amount);
    if (amt < 100) return error(res, "Minimum deposit is PKR 100");

    const validMethods = ["easypaisa", "jazzcash", "bank"];
    if (!method || !validMethods.includes(method)) {
      return error(res, "Payment method required: easypaisa, jazzcash, or bank");
    }

    // Get user info for notification
    const user = await UserModel.findById(req.userId);

    // Update wallet with wagering requirement
    const wallet = await WalletModel.deposit(req.userId, amt);

    const tx = await TransactionModel.create(req.userId, {
      type:     "deposit",
      label:    `Deposit via ${method.charAt(0).toUpperCase() + method.slice(1)}`,
      amount:   amt,
      positive: true,
    });

    // Mark mission 1 (recharge 500) done if applicable
    if (amt >= 500) await MissionModel.markDone(req.userId, 1);

    // Notify admin via WhatsApp
    notifyAdmin(
      `💰 NEW DEPOSIT REQUEST\n` +
      `User: ${user?.username} (${user?.mobile})\n` +
      `Amount: PKR ${amt.toLocaleString()}\n` +
      `Method: ${method.toUpperCase()}\n` +
      `Account: ${accountNumber || "Not provided"}\n` +
      `Wagering: Must bet PKR ${amt} before withdrawal`
    );

    return success(res, {
      wallet,
      transaction: tx,
      message: `Deposit request of PKR ${amt} submitted via ${method}. Please send payment to ${ADMIN_WHATSAPP} and await confirmation.`,
      wagerRequired: wallet.wagerRequired,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const withdraw = async (req, res) => {
  try {
    const { amount, method, accountNumber, accountName } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);

    const amt = Number(amount);

    const result = await WalletModel.withdraw(req.userId, amt);

    // Wagering or balance error
    if (result.error) return error(res, result.error);

    const user = await UserModel.findById(req.userId);

    const tx = await TransactionModel.create(req.userId, {
      type:     "withdraw",
      label:    `Withdrawal via ${(method || "manual").charAt(0).toUpperCase() + (method || "manual").slice(1)}`,
      amount:   amt,
      positive: false,
    });

    // Notify admin
    notifyAdmin(
      `🏧 WITHDRAWAL REQUEST\n` +
      `User: ${user?.username} (${user?.mobile})\n` +
      `Amount: PKR ${amt.toLocaleString()}\n` +
      `Method: ${(method || "N/A").toUpperCase()}\n` +
      `Account: ${accountNumber || "N/A"} (${accountName || "N/A"})\n` +
      `Remaining balance: PKR ${result.wallet.balance.toLocaleString()}`
    );

    return success(res, {
      wallet: result.wallet,
      transaction: tx,
      message: `Withdrawal request of PKR ${amt} submitted. Admin will process within 24 hours.`,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const placeBet = async (req, res) => {
  try {
    const { amount, game: gameName, result, payout } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);
    const betAmt = Number(amount);

    const walletAfterBet = await WalletModel.deductBet(req.userId, betAmt);
    if (!walletAfterBet) return error(res, "Insufficient balance");

    await TransactionModel.create(req.userId, {
      type: "bet", label: `${gameName} Bet`, amount: betAmt, positive: false,
    });

    let finalWallet = walletAfterBet;

    if (result === "win" && payout) {
      const winAmt = Number(payout);
      finalWallet  = await WalletModel.creditWin(req.userId, winAmt);
      await TransactionModel.create(req.userId, {
        type: "win", label: `${gameName} Win`, amount: winAmt, positive: true,
      });
    }

    return success(res, { wallet: finalWallet });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getWallet, deposit, withdraw, placeBet };
