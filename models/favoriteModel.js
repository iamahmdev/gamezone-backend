// userId → string[] (game ids)
const store = {};

const FavoriteModel = {
  init(userId) {
    if (!store[userId]) store[userId] = [];
    return store[userId];
  },

  getByUserId(userId) {
    return store[userId] || [];
  },

  toggle(userId, gameId) {
    if (!store[userId]) store[userId] = [];
    const list = store[userId];
    if (list.includes(gameId)) {
      store[userId] = list.filter((id) => id !== gameId);
    } else {
      store[userId].push(gameId);
    }
    return store[userId];
  },
};

module.exports = FavoriteModel;
