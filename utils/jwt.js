const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES } = require("../config/constants");

const signToken  = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

module.exports = { signToken, verifyToken };
