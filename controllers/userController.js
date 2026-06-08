const UserModel          = require("../models/userModel");
const { success, error } = require("../utils/response");

const getProfile = (req, res) => {
  try {
    const user = UserModel.findById(req.userId);
    if (!user) return error(res, "User not found", 404);
    return success(res, UserModel.safe(user));
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const updateProfile = (req, res) => {
  try {
    const updated = UserModel.update(req.userId, req.body);
    if (!updated) return error(res, "User not found", 404);
    return success(res, UserModel.safe(updated));
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getProfile, updateProfile };
