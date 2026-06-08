// In-memory user store — swap with DB later
const users = [];

let uidCounter = 10001;
const makeUID = () => "U" + (uidCounter++);

const UserModel = {
  getAll:          ()     => users,
  findById:        (id)   => users.find((u) => u.id === id) || null,
  findByMobile:    (mob)  => users.find((u) => u.mobile === mob) || null,
  findByUsername:  (name) => users.find((u) => u.username.toLowerCase() === name.toLowerCase()) || null,

  create({ username, mobile, passwordHash }) {
    const uid = makeUID();
    const user = {
      id:           uid,
      username:     username.trim(),
      mobile,
      passwordHash,
      vipLevel:     1,
      vipXp:        0,
      vipXpNext:    1000,
      kycVerified:  false,
      referralCode: uid,
      referralLink: `https://gamezone.pro/?ref=${uid}`,
      lastLogin:    new Date().toISOString(),
      createdAt:    new Date().toISOString(),
    };
    users.push(user);
    return user;
  },

  update(id, fields) {
    const user = UserModel.findById(id);
    if (!user) return null;
    // never allow overwriting sensitive fields from outside
    const { passwordHash: _p, id: _i, mobile: _m, ...safe } = fields;
    Object.assign(user, safe);
    return user;
  },

  updatePassword(id, passwordHash) {
    const user = UserModel.findById(id);
    if (!user) return false;
    user.passwordHash = passwordHash;
    return true;
  },

  safe(user) {
    const { passwordHash: _, ...rest } = user;
    return rest;
  },
};

module.exports = UserModel;
