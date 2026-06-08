const router = require("express").Router();
const auth   = require("../middleware/auth");
const { getReferralStats } = require("../controllers/referralController");

router.get("/", auth, getReferralStats);

module.exports = router;
