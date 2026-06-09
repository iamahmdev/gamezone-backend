const router    = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const {
  getDashboard,
  getUsers, getUser, banUser, unbanUser, promoteUser, demoteUser, resetUserPassword,
  adjustBalance,
  getPendingDeposits, approveDeposit, rejectDeposit,
  getPendingWithdrawals, approveWithdrawal, rejectWithdrawal,
  getAllTransactions,
} = require("../controllers/adminController");

// All routes require JWT admin auth
router.get("/dashboard",                   adminAuth, getDashboard);

// Users
router.get("/users",                       adminAuth, getUsers);
router.get("/users/:id",                   adminAuth, getUser);
router.post("/users/:id/ban",              adminAuth, banUser);
router.post("/users/:id/unban",            adminAuth, unbanUser);
router.post("/users/:id/promote",          adminAuth, promoteUser);
router.post("/users/:id/demote",           adminAuth, demoteUser);
router.post("/users/:id/reset-password",   adminAuth, resetUserPassword);
router.post("/users/:id/adjust-balance",   adminAuth, adjustBalance);

// Deposits
router.get("/deposits/pending",            adminAuth, getPendingDeposits);
router.post("/deposits/:txId/approve",     adminAuth, approveDeposit);
router.post("/deposits/:txId/reject",      adminAuth, rejectDeposit);

// Withdrawals
router.get("/withdrawals/pending",         adminAuth, getPendingWithdrawals);
router.post("/withdrawals/:txId/approve",  adminAuth, approveWithdrawal);
router.post("/withdrawals/:txId/reject",   adminAuth, rejectWithdrawal);

// All transactions
router.get("/transactions",                adminAuth, getAllTransactions);

module.exports = router;
