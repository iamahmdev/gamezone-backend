const router = require("express").Router();
const auth   = require("../middleware/auth");
const { getProfile, updateProfile } = require("../controllers/userController");

router.get(  "/profile", auth, getProfile);
router.patch("/profile", auth, updateProfile);

module.exports = router;
