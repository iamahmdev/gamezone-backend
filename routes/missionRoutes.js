const router = require("express").Router();
const auth   = require("../middleware/auth");
const { getMissions, claimMission } = require("../controllers/missionController");

router.get( "/",         auth, getMissions);
router.post("/:id/claim",auth, claimMission);

module.exports = router;
