const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    gameIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Favorite = mongoose.model("Favorite", favoriteSchema);

const FavoriteModel = {
  async init(userId) {
    const existing = await Favorite.findOne({ userId });
    if (existing) return existing.toObject();
    const fav = await Favorite.create({ userId, gameIds: [] });
    return fav.toObject();
  },

  async getByUserId(userId) {
    const fav = await Favorite.findOne({ userId }).lean();
    return fav ? fav.gameIds : [];
  },

  async toggle(userId, gameId) {
    const fav = await Favorite.findOne({ userId });
    if (!fav) {
      const newFav = await Favorite.create({ userId, gameIds: [gameId] });
      return newFav.gameIds;
    }

    if (fav.gameIds.includes(gameId)) {
      fav.gameIds = fav.gameIds.filter((id) => id !== gameId);
    } else {
      fav.gameIds.push(gameId);
    }
    await fav.save();
    return fav.gameIds;
  },
};

module.exports = FavoriteModel;
