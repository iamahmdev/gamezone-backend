const router = require("express").Router();
const { getAllGames, getGameBySlug } = require("../controllers/gameController");

router.get("/",      getAllGames);
router.get("/:slug", getGameBySlug);

module.exports = router;
