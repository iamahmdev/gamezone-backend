const { WELCOME_BONUS } = require("../config/constants");

// userId → { balance, withdrawable }
const wallets = {};

const WalletModel = {
  getByUserId(userId) {
    return wallets[userId] || null;
  },

  init(userId) {
    if (!wallets[userId]) {
      wallets[userId] = { balance: WELCOME_BONUS, withdrawable: 0 };
    }
    return wallets[userId];
  },

  deposit(userId, amount) {
    const w = wallets[userId];
    w.balance      += amount;
    w.withdrawable += Math.floor(amount * 0.5);
    return w;
  },

  withdraw(userId, amount) {
    const w = wallets[userId];
    if (amount > w.withdrawable) return null; // insufficient
    w.balance      -= amount;
    w.withdrawable -= amount;
    return w;
  },

  deductBet(userId, amount) {
    const w = wallets[userId];
    if (amount > w.balance) return null; // insufficient
    w.balance -= amount;
    return w;
  },

  creditWin(userId, amount) {
    const w = wallets[userId];
    w.balance      += amount;
    w.withdrawable += Math.floor(amount * 0.3);
    return w;
  },
};

module.exports = WalletModel;
