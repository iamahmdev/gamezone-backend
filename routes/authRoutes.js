const router     = require("express").Router();
const auth       = require("../middleware/auth");
const { register, login, getMe, changePassword } = require("../controllers/authController");

router.post("/register",        register);
router.post("/login",           login);
router.get( "/me",         auth, getMe);
router.post("/change-password", auth, changePassword);

module.exports = router;
