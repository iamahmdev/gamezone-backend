const mongoose = require("mongoose");
const { WELCOME_BONUS } = require("../config/constants");

const walletSchema = new mongoose.Schema(
  {
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance:      { type: Number, default: WELCOME_BONUS },
    withdrawable: { type: Number, default: 0 },
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
    const wallet = await Wallet.create({ userId, balance: WELCOME_BONUS, withdrawable: 0 });
    return wallet.toObject();
  },

  async deposit(userId, amount) {
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount, withdrawable: Math.floor(amount * 0.5) } },
      { new: true, upsert: true }
    ).lean();
    return wallet;
  },

  async withdraw(userId, amount) {
    // Check sufficient withdrawable balance first
    const current = await Wallet.findOne({ userId }).lean();
    if (!current || amount > current.withdrawable) return null;

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: -amount, withdrawable: -amount } },
      { new: true }
    ).lean();
    return wallet;
  },

  async deductBet(userId, amount) {
    // Check sufficient balance first
    const current = await Wallet.findOne({ userId }).lean();
    if (!current || amount > current.balance) return null;

    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: -amount } },
      { new: true }
    ).lean();
    return wallet;
  },

  async creditWin(userId, amount) {
    const wallet = await Wallet.findOneAndUpdate(
      { userId },
      { $inc: { balance: amount, withdrawable: Math.floor(amount * 0.3) } },
      { new: true, upsert: true }
    ).lean();
    return wallet;
  },
};

module.exports = WalletModel;
