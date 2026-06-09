const bcrypt           = require("bcryptjs");
const UserModel        = require("../models/userModel");
const WalletModel      = require("../models/walletModel");
const TransactionModel = require("../models/transactionModel");
const MissionModel     = require("../models/missionModel");
const FavoriteModel    = require("../models/favoriteModel");
const ReferralModel    = require("../models/referralModel");
const { signToken }    = require("../utils/jwt");
const { validateRegister, validateLogin } = require("../utils/validators");
const { success, error } = require("../utils/response");
const { BCRYPT_ROUNDS, WELCOME_BONUS, ADMIN_MOBILES } = require("../config/constants");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const err = validateRegister(req.body);
    if (err) return error(res, err);

    const { username, mobile, password, refCode } = req.body;

    if (await UserModel.findByMobile(mobile))
      return error(res, "Mobile number already registered", 409);
    if (await UserModel.findByUsername(username))
      return error(res, "Username already taken", 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user         = await UserModel.create({ username, mobile, passwordHash });
    const userId       = (user._id || user.id).toString();

    // Init all user data in parallel
    await Promise.all([
      WalletModel.init(userId),
      MissionModel.init(userId),
      FavoriteModel.init(userId),
    ]);

    // Welcome bonus transaction
    await TransactionModel.create(userId, {
      type: "deposit", label: "Welcome Bonus",
      amount: WELCOME_BONUS, positive: true,
    });

    // Handle referral code if provided
    if (refCode && refCode !== userId) {
      const referrer = await UserModel.findById(refCode);
      if (referrer) {
        const referrerId = (referrer._id || referrer.id).toString();
        await ReferralModel.record(referrerId, userId);
        // Mark mission 3 (invite 1 friend) as done for referrer
        await MissionModel.markDone(referrerId, 3).catch(() => {});
      }
    }

    const wallet = await WalletModel.getByUserId(userId);
    const token  = signToken(userId);

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

    // ── Special admin login via email ─────────────────────────────────────
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@gmail.com";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

    if (mobile === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Find or create the admin account
      let adminUser = await UserModel.findByMobile("00000000000");
      if (!adminUser) {
        const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
        adminUser = await UserModel.create({
          username: "Admin",
          mobile:   "00000000000",
          passwordHash,
        });
        const adminId = (adminUser._id || adminUser.id).toString();
        await Promise.all([
          WalletModel.init(adminId),
          MissionModel.init(adminId),
          FavoriteModel.init(adminId),
        ]);
        await UserModel.setAdmin(adminId, true);
        adminUser = await UserModel.findByMobile("00000000000");
      }
      // Ensure admin flag is set
      const adminId = (adminUser._id || adminUser.id).toString();
      if (!adminUser.isAdmin) {
        await UserModel.setAdmin(adminId, true);
        adminUser = await UserModel.findById(adminId);
      }
      await UserModel.updateLastLogin(adminId);
      const token = signToken(adminId);
      return success(res, { token, user: UserModel.safe(adminUser) });
    }
    // ─────────────────────────────────────────────────────────────────────

    const user = await UserModel.findByMobile(mobile);
    if (!user) return error(res, "Invalid mobile or password", 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return error(res, "Invalid mobile or password", 401);

    if (user.isBanned)
      return error(res, "Your account has been suspended. Contact admin.", 403);

    const userId = (user._id || user.id).toString();

    // Auto-promote to admin if mobile is in ADMIN_MOBILES env list
    if (ADMIN_MOBILES.length > 0 && ADMIN_MOBILES.includes(mobile) && !user.isAdmin) {
      await UserModel.setAdmin(userId, true);
      user.isAdmin = true;
    }

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
