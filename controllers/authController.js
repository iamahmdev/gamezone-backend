const bcrypt           = require("bcryptjs");
const UserModel        = require("../models/userModel");
const WalletModel      = require("../models/walletModel");
const TransactionModel = require("../models/transactionModel");
const MissionModel     = require("../models/missionModel");
const FavoriteModel    = require("../models/favoriteModel");
const { signToken }    = require("../utils/jwt");
const { validateRegister, validateLogin } = require("../utils/validators");
const { success, error } = require("../utils/response");
const { BCRYPT_ROUNDS, WELCOME_BONUS } = require("../config/constants");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const err = validateRegister(req.body);
    if (err) return error(res, err);

    const { username, mobile, password } = req.body;

    if (await UserModel.findByMobile(mobile))
      return error(res, "Mobile number already registered", 409);
    if (await UserModel.findByUsername(username))
      return error(res, "Username already taken", 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user         = await UserModel.create({ username, mobile, passwordHash });

    // Init all user data in parallel
    await Promise.all([
      WalletModel.init(user._id || user.id),
      MissionModel.init(user._id || user.id),
      FavoriteModel.init(user._id || user.id),
    ]);

    // Welcome bonus transaction
    await TransactionModel.create(user._id || user.id, {
      type: "deposit", label: "Welcome Bonus",
      amount: WELCOME_BONUS, positive: true,
    });

    const wallet = await WalletModel.getByUserId(user._id || user.id);
    const token  = signToken((user._id || user.id).toString());

    return success(res, { token, user: UserModel.safe(user), wallet }, 201);
  } catch (e) {
    console.error("[register]", e);
    return error(res, "Registration failed: " + e.message, 500);
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const err = validateLogin(req.body);
    if (err) return error(res, err);

    const { mobile, password } = req.body;
    const user = await UserModel.findByMobile(mobile);
    if (!user) return error(res, "Invalid mobile or password", 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return error(res, "Invalid mobile or password", 401);

    const userId = (user._id || user.id).toString();

    // Ensure related data exists (first-time safety)
    await Promise.all([
      WalletModel.init(userId),
      MissionModel.init(userId),
      FavoriteModel.init(userId),
    ]);

    // Daily check-in + update lastLogin
    await Promise.all([
      MissionModel.checkIn(userId),
      UserModel.updateLastLogin(userId),
    ]);

    const token = signToken(userId);
    return success(res, { token, user: UserModel.safe(user) });
  } catch (e) {
    console.error("[login]", e);
    return error(res, "Login failed: " + e.message, 500);
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
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

    const user = await UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return error(res, "Current password is incorrect", 401);

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await UserModel.updatePassword(user._id || user.id, hash);
    return success(res, { message: "Password changed successfully" });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { register, login, getMe, changePassword };
