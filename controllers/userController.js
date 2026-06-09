const UserModel          = require("../models/userModel");
const { success, error } = require("../utils/response");

const getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);
    return success(res, UserModel.safe(user));
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    // Strict allowlist: only username can be changed by the user themselves
    const ALLOWED = ["username"];
    const filtered = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) filtered[key] = req.body[key];
    }
    if (Object.keys(filtered).length === 0)
      return error(res, "No valid fields to update");

    // Username uniqueness check
    if (filtered.username) {
      const existing = await UserModel.findByUsername(filtered.username);
      if (existing && existing._id.toString() !== req.userId)
        return error(res, "Username already taken", 409);
    }

    const updated = await UserModel.update(req.userId, filtered);
    if (!updated) return error(res, "User not found", 404);
    return success(res, UserModel.safe(updated));
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getProfile, updateProfile };
