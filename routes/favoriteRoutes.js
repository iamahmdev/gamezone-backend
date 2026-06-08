const router = require("express").Router();
const auth   = require("../middleware/auth");
const { getFavorites, toggleFavorite } = require("../controllers/favoriteController");

router.get( "/",       auth, getFavorites);
router.post("/toggle", auth, toggleFavorite);

module.exports = router;
