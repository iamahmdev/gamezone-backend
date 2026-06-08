const { verifyToken } = require("../utils/jwt");
const { error }       = require("../utils/response");

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return error(res, "Unauthorized — token missing", 401);
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.userId;
    next();
  } catch {
    return error(res, "Unauthorized — invalid or expired token", 401);
  }
};

module.exports = authMiddleware;
