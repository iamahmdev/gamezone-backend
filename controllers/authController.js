const bcrypt          = require("bcryptjs");
const UserModel       = require("../models/userModel");
const WalletModel     = require("../models/walletModel");
const TransactionModel= require("../models/transactionModel");
const MissionModel    = require("../models/missionModel");
const FavoriteModel   = require("../models/favoriteModel");
const { signToken }   = require("../utils/jwt");
const { validateRegister, validateLogin } = require("../utils/validators");
const { success, error } = require("../utils/response");
const { BCRYPT_ROUNDS, WELCOME_BONUS } = require("../config/constants");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const err = validateRegister(req.body);
    if (err) return error(res, err);

    const { username, mobile, password } = req.body;

    if (UserModel.findByMobile(mobile))
      return error(res, "Mobile number already registered", 409);
    if (UserModel.findByUsername(username))
      return error(res, "Username already taken", 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user         = UserModel.create({ username, mobile, passwordHash });

    // Init all user data
    const wallet = WalletModel.init(user.id);
    TransactionModel.init(user.id);
    TransactionModel.create(user.id, {
      type: "deposit", label: "Welcome Bonus",
      amount: WELCOME_BONUS, positive: true,
    });
    MissionModel.init(user.id);
    FavoriteModel.init(user.id);

    const token = signToken(user.id);
    return success(res, { token, user: UserModel.safe(user), wallet }, 201);
  } catch (e) {
    return error(res, "Registration failed: " + e.message, 500);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const err = validateLogin(req.body);
    if (err) return error(res, err);

    const { mobile, password } = req.body;
    const user = UserModel.findByMobile(mobile);
    if (!user) return error(res, "Invalid mobile or password", 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return error(res, "Invalid mobile or password", 401);

    // Ensure data exists (in case of old users)
    WalletModel.init(user.id);
    TransactionModel.init(user.id);
    MissionModel.init(user.id);
    FavoriteModel.init(user.id);

    user.lastLogin = new Date().toISOString();
    // Mark daily check-in done on login
    MissionModel.checkIn(user.id);

    const token = signToken(user.id);
    return success(res, { token, user: UserModel.safe(user) });
  } catch (e) {
    return error(res, "Login failed: " + e.message, 500);
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  try {
    const user = UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);
    return success(res, UserModel.safe(user));
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return error(res, "currentPassword and newPassword required");
    if (newPassword.length < 6)
      return error(res, "New password must be at least 6 characters");

    const user = UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return error(res, "Current password is incorrect", 401);

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    UserModel.updatePassword(user.id, hash);
    return success(res, { message: "Password changed successfully" });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { register, login, getMe, changePassword };
