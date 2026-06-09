const { verifyToken } = require("../utils/jwt");
const UserModel       = require("../models/userModel");
const { error }       = require("../utils/response");

/**
 * Admin middleware — verifies JWT token AND checks isAdmin flag on user.
 */
const adminAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return error(res, "Unauthorized — admin token missing", 401);

  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;

    const user = await UserModel.findById(payload.userId);
    if (!user)         return error(res, "User not found", 404);
    if (!user.isAdmin) return error(res, "Forbidden — admin access required", 403);
    if (user.isBanned) return error(res, "Account is banned", 403);

    req.isAdmin = true;
    next();
  } catch {
    return error(res, "Unauthorized — invalid or expired token", 401);
  }
};

module.exports = adminAuth;
