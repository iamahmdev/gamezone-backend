const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:     { type: String, required: true },   // deposit | withdraw | bet | win | mission
    label:    { type: String, required: true },
    amount:   { type: Number, required: true },
    positive: { type: Boolean, required: true },
  },
  { timestamps: true }
);

// Index for fast per-user queries
transactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

const TransactionModel = {
  // init is a no-op with MongoDB (no pre-init needed)
  async init(userId) {
    return [];
  },

  async getByUserId(userId, limit = 20) {
    return await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  },

  async create(userId, { type, label, amount, positive }) {
    const tx = await Transaction.create({ userId, type, label, amount, positive });
    return tx.toObject();
  },
};

module.exports = TransactionModel;
