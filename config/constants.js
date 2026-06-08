module.exports = {
  JWT_SECRET:      process.env.JWT_SECRET || "gamezone_jwt_secret_2024",
  JWT_EXPIRES:     "7d",
  WELCOME_BONUS:   5000,
  BCRYPT_ROUNDS:   10,
  PORT:            process.env.PORT || 5000,
};
