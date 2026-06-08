const FavoriteModel      = require("../models/favoriteModel");
const GameModel          = require("../models/gameModel");
const { success, error } = require("../utils/response");

const getFavorites = (req, res) => {
  try {
    const ids      = FavoriteModel.getByUserId(req.userId);
    const games    = GameModel.getAll().filter((g) => ids.includes(g.id));
    return success(res, { ids, games });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const toggleFavorite = (req, res) => {
  try {
    const { gameId } = req.body;
    if (!gameId) return error(res, "gameId is required");
    const ids = FavoriteModel.toggle(req.userId, gameId);
    return success(res, { ids });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getFavorites, toggleFavorite };
