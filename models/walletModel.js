const mongoose = require("mongoose");
const { WELCOME_BONUS } = require("../config/constants");

const walletSchema = new mongoose.Schema(
  {
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance:         { type: Number, default: WELCOME_BONUS },
    withdrawable:    { type: Number, default: 0 },
    // Wagering system — user must bet this amount before withdrawing deposit
    wagerRequired:   { type: Number, default: 0 }, // remaining wagering requirement
    totalDeposited:  { type: Number, default: 0 }, // total deposited ever
    totalBet:        { type: Number, default: 0 },  // total bet ever
  },
  { timestamps: true }
);

const Wallet = mongoose.model("Wallet", walletSchema);

const WalletModel = {
  async getByUserId(userId) {
    return await Wallet.findOne({ userId }).lean();
  },

  async init(userId) {
    const existing = await Wallet.findOne({ userId });
    if (existing) return existing.toObject();
    const wallet = await Wallet.create({
      userId,
      balance: WELCOME_BONUS,
      withdrawable: 0,
      wagerRequired: 0,
      totalDeposited: 0,
      totalBet: 0,
    });
    return wallet.toObject();
  },

  async deposit(userId, amount) {
    // On deposit: add to balance, set wager requirement = deposit amount (1x wagering)
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          balance:        amount,
          wagerRequired:  amount,   // must bet this much before withdrawing
          totalDeposited: amount,
        }
      },
      { new: true, upsert: true }
    ).lean();
    return wallet;
  },

  async withdraw(userId, amount) {
    const current = await Wallet.findOne({ userId }).lean();
    if (!current) return { error: "Wallet not found" };
    if (amount < 100) return { error: "Minimum withdrawal is PKR 100" };
    if (amount > current.balance) return { error: "Insufficient balance" };
    if (current.wagerRequired > 0) {
      return {
        error: `Complete wagering requirement first. You need to bet PKR ${current.wagerRequired.toLocaleString()} more before withdrawing.`
      };
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: -amount } },
      { new: true }
    ).lean();
    return { wallet };
  },

  async deductBet(userId, amount) {
    const current = await Wallet.findOne({ userId }).lean();
    if (!current || amount > current.balance) return null;

    // Reduce wager requirement as user bets
    const wagerReduction = Math.min(current.wagerRequired, amount);

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: {
          balance:       -amount,
          wagerRequired: -wagerReduction,
          totalBet:       amount,
        }
      },
      { new: true }
    ).lean();
    return wallet;
  },

  async creditWin(userId, amount) {
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount } },
      { new: true, upsert: true }
    ).lean();
    return wallet;
  },
};

module.exports = WalletModel;
