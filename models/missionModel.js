const mongoose = require("mongoose");

const missionSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    missionId: { type: Number, required: true },
    title:   { type: String, required: true },
    reward:  { type: Number, required: true },
    done:    { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

missionSchema.index({ userId: 1, missionId: 1 }, { unique: true });

const Mission = mongoose.model("Mission", missionSchema);

const DEFAULT_MISSIONS = [
  { missionId: 1, title: "Recharge ₹500",            reward: 50  },
  { missionId: 2, title: "Play 10 rounds of Aviator", reward: 25  },
  { missionId: 3, title: "Invite 1 friend",           reward: 100 },
  { missionId: 4, title: "Win 3 rounds in Wingo",     reward: 30  },
  { missionId: 5, title: "Daily check-in",            reward: 10  },
];

const MissionModel = {
  async init(userId) {
    const existing = await Mission.find({ userId }).lean();
    if (existing.length > 0) return existing;

    const docs = DEFAULT_MISSIONS.map((m) => ({ ...m, userId, done: false, claimed: false }));
    await Mission.insertMany(docs);
    return await Mission.find({ userId }).lean();
  },

  async getByUserId(userId) {
    const missions = await Mission.find({ userId }).sort({ missionId: 1 }).lean();
    // Return in frontend-friendly format (id instead of missionId)
    return missions.map((m) => ({
      id:      m.missionId,
      title:   m.title,
      reward:  m.reward,
      done:    m.done,
      claimed: m.claimed,
    }));
  },

  async findOne(userId, missionId) {
    return await Mission.findOne({ userId, missionId }).lean();
  },

  async claim(userId, missionId) {
    const mission = await Mission.findOne({ userId, missionId });
    if (!mission) return { error: "Mission not found" };
    if (!mission.done)   return { error: "Mission not completed yet" };
    if (mission.claimed) return { error: "Already claimed" };

    mission.claimed = true;
    await mission.save();
    return {
      mission: {
        id:      mission.missionId,
        title:   mission.title,
        reward:  mission.reward,
        done:    mission.done,
        claimed: mission.claimed,
      },
    };
  },

  async markDone(userId, missionId) {
    await Mission.findOneAndUpdate(
      { userId, missionId },
      { $set: { done: true } }
    );
  },

  async checkIn(userId) {
    await MissionModel.markDone(userId, 5);
  },
};

module.exports = MissionModel;
