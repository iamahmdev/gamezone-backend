const router = require("express").Router();
const { getLiveStats } = require("../controllers/statsController");

router.get("/", getLiveStats);

module.exports = router;
