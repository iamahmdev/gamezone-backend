const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username:     { type: String, required: true, unique: true, trim: true, minlength: 3 },
    mobile:       { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    vipLevel:     { type: Number, default: 1 },
    vipXp:        { type: Number, default: 0 },
    vipXpNext:    { type: Number, default: 1000 },
    kycVerified:  { type: Boolean, default: false },
    isAdmin:      { type: Boolean, default: false },
    isBanned:     { type: Boolean, default: false },
    banReason:    { type: String, default: "" },
    referralCode: { type: String },
    referralLink: { type: String },
    lastLogin:    { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// Auto-set referralCode = _id string on first save
userSchema.pre("save", async function () {
  if (!this.referralCode || this.referralCode === "") {
    this.referralCode = this._id.toString();
    this.referralLink = `https://gamezone.pro/?ref=${this._id}`;
  }
});


const User = mongoose.model("User", userSchema);

// ── Helper wrappers to keep controllers unchanged ─────────
const UserModel = {
  async findById(id) {
    try { return await User.findById(id).lean(); } catch { return null; }
  },

  async findByMobile(mobile) {
    return await User.findOne({ mobile }).lean();
  },

  async findByUsername(username) {
    return await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } }).lean();
  },

  async create({ username, mobile, passwordHash }) {
    const user = new User({ username, mobile, passwordHash });
    await user.save(); // pre-save hook sets referralCode
    return user.toObject();
  },

  async update(id, fields) {
    // Never allow overwriting sensitive fields
    const { passwordHash: _p, _id: _i, mobile: _m, ...safe } = fields;
    const user = await User.findByIdAndUpdate(id, { $set: safe }, { new: true }).lean();
    return user;
  },

  async updatePassword(id, passwordHash) {
    const result = await User.findByIdAndUpdate(id, { $set: { passwordHash } });
    return !!result;
  },

  async updateLastLogin(id) {
    await User.findByIdAndUpdate(id, { $set: { lastLogin: new Date().toISOString() } });
  },

  async findAll({ page = 1, limit = 20, search = "" } = {}) {
    const skip   = (page - 1) * limit;
    const filter = search
      ? { $or: [
          { username: { $regex: search, $options: "i" } },
          { mobile:   { $regex: search, $options: "i" } },
        ]}
      : {};
    const [users, total] = await Promise.all([
      User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return { users: users.map((u) => UserModel.safe(u)), total, page, pages: Math.ceil(total / limit) };
  },

  async banUser(id, reason = "") {
    return await User.findByIdAndUpdate(id, { $set: { isBanned: true, banReason: reason } }, { new: true }).lean();
  },

  async unbanUser(id) {
    return await User.findByIdAndUpdate(id, { $set: { isBanned: false, banReason: "" } }, { new: true }).lean();
  },

  async setAdmin(id, isAdmin) {
    return await User.findByIdAndUpdate(id, { $set: { isAdmin } }, { new: true }).lean();
  },

  async countAll() {
    return await User.countDocuments();
  },

  async countNewToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return await User.countDocuments({ createdAt: { $gte: start } });
  },

  safe(user) {
    if (!user) return null;
    const { passwordHash: _, __v, ...rest } = user;
    // Normalize _id → id for frontend
    if (rest._id) { rest.id = rest._id.toString(); delete rest._id; }
    return rest;
  },
};

module.exports = UserModel;
