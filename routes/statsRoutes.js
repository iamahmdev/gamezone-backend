const router = require("express").Router();
const { getLiveStats, getRecentWinners } = require("../controllers/statsController");

router.get("/",       getLiveStats);
router.get("/winners", getRecentWinners);

module.exports = router;
