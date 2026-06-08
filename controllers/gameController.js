const GameModel          = require("../models/gameModel");
const { success, error } = require("../utils/response");

const getAllGames = (req, res) => {
  try {
    const { category, popular } = req.query;
    const games = GameModel.getAll({
      category:  category || null,
      popular:   popular === "true" ? true : undefined,
    });
    return success(res, games);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const getGameBySlug = (req, res) => {
  try {
    const game = GameModel.getBySlug(req.params.slug);
    if (!game) return error(res, "Game not found", 404);
    return success(res, game);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getAllGames, getGameBySlug };
