const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type:     { type: String, required: true },   // deposit | withdraw | bet | win | mission
    label:    { type: String, required: true },
    amount:   { type: Number, required: true },
    positive: { type: Boolean, required: true },
    // Game slug — stored for bets/wins so online counts can be computed per game
    game:     { type: String, default: "" },
    // Admin approval fields (for deposit and withdraw)
    status:   { type: String, default: "completed", enum: ["pending", "completed", "rejected"] },
    adminNote: { type: String, default: "" },
    method:    { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    accountName:   { type: String, default: "" },
  },
  { timestamps: true }
);

// Index for fast per-user queries
transactionSchema.index({ userId: 1, createdAt: -1 });
// Index for game online count aggregation
transactionSchema.index({ type: 1, game: 1, createdAt: -1 });

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

  async create(userId, { type, label, amount, positive, status = "completed", method = "", accountNumber = "", accountName = "", game = "" }) {
    const tx = await Transaction.create({ userId, type, label, amount, positive, status, method, accountNumber, accountName, game });
    return tx.toObject();
  },

  // Admin: get all pending deposits
  async getPending(type) {
    const filter = { status: "pending" };
    if (type) filter.type = type;
    return await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "username mobile")
      .lean();
  },

  // Admin: get all transactions with pagination
  async getAll({ page = 1, limit = 20, type = null, userId = null } = {}) {
    const skip   = (page - 1) * limit;
    const filter = {};
    if (type)   filter.type   = type;
    if (userId) filter.userId = userId;
    const [txs, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "username mobile")
        .lean(),
      Transaction.countDocuments(filter),
    ]);
    return { txs, total, page, pages: Math.ceil(total / limit) };
  },

  // Admin: approve or reject a deposit/withdrawal
  async updateStatus(txId, status, adminNote = "") {
    return await Transaction.findByIdAndUpdate(
      txId,
      { $set: { status, adminNote } },
      { new: true }
    ).lean();
  },

  // Admin: platform stats
  async getTotalDeposited() {
    const res = await Transaction.aggregate([
      { $match: { type: "deposit", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return res[0]?.total ?? 0;
  },

  async getTotalWithdrawn() {
    const res = await Transaction.aggregate([
      { $match: { type: "withdraw", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return res[0]?.total ?? 0;
  },

  async getTodayDeposited() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const res = await Transaction.aggregate([
      { $match: { type: "deposit", status: "completed", createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return res[0]?.total ?? 0;
  },

  async getTodayWithdrawn() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const res = await Transaction.aggregate([
      { $match: { type: "withdraw", status: "completed", createdAt: { $gte: start } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return res[0]?.total ?? 0;
  },
};

module.exports = TransactionModel;
