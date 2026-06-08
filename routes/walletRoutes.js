const router = require("express").Router();
const auth   = require("../middleware/auth");
const { getWallet, deposit, withdraw, placeBet } = require("../controllers/walletController");

router.get( "/",        auth, getWallet);
router.post("/deposit", auth, deposit);
router.post("/withdraw",auth, withdraw);
router.post("/bet",     auth, placeBet);

module.exports = router;
