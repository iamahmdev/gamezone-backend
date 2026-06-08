// userId → Transaction[]
const store = {};

const TransactionModel = {
  init(userId) {
    if (!store[userId]) store[userId] = [];
    return store[userId];
  },

  getByUserId(userId, limit = 20) {
    return (store[userId] || []).slice(0, limit);
  },

  create(userId, { type, label, amount, positive }) {
    const tx = {
      id:        "tx_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      type,
      label,
      amount,
      positive,
      createdAt: new Date().toISOString(),
    };
    if (!store[userId]) store[userId] = [];
    store[userId].unshift(tx);
    return tx;
  },
};

module.exports = TransactionModel;
