const validateRegister = ({ username, mobile, password }) => {
  if (!username || !mobile || !password)        return "username, mobile and password are required";
  if (username.trim().length < 3)               return "Username must be at least 3 characters";
  if (!/^\d{10,11}$/.test(mobile))              return "Enter a valid 10-11 digit mobile number";
  if (password.length < 6)                      return "Password must be at least 6 characters";
  return null;
};

const validateLogin = ({ mobile, password }) => {
  if (!mobile || !password) return "mobile and password are required";
  return null;
};

const validateAmount = (amount) => {
  const n = Number(amount);
  if (!n || n <= 0 || isNaN(n)) return "Invalid amount";
  return null;
};

module.exports = { validateRegister, validateLogin, validateAmount };
