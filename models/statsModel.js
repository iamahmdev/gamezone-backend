const GameModel = require("./gameModel");

const stats = {
  onlineNow:     6842,
  todayWinners:  1234,
  bigWin:        99000,
};

const StatsModel = {
  get() {
    return { ...stats };
  },

  tick() {
    stats.onlineNow    = 6000 + Math.floor(Math.random() * 1500);
    stats.todayWinners += Math.floor(Math.random() * 3);
    if (stats.bigWin < 500000) stats.bigWin += Math.floor(Math.random() * 500);
    GameModel.tickOnline();
  },
};

module.exports = StatsModel;
