// userId → Mission[]
const store = {};

const DEFAULT_MISSIONS = () => [
  { id: 1, title: "Recharge ₹500",            reward: 50,  done: false, claimed: false },
  { id: 2, title: "Play 10 rounds of Aviator", reward: 25,  done: false, claimed: false },
  { id: 3, title: "Invite 1 friend",           reward: 100, done: false, claimed: false },
  { id: 4, title: "Win 3 rounds in Wingo",     reward: 30,  done: false, claimed: false },
  { id: 5, title: "Daily check-in",            reward: 10,  done: false, claimed: false },
];

const MissionModel = {
  init(userId) {
    if (!store[userId]) store[userId] = DEFAULT_MISSIONS();
    return store[userId];
  },

  getByUserId(userId) {
    return store[userId] || [];
  },

  findOne(userId, missionId) {
    return (store[userId] || []).find((m) => m.id === missionId) || null;
  },

  claim(userId, missionId) {
    const mission = MissionModel.findOne(userId, missionId);
    if (!mission) return { error: "Mission not found" };
    if (!mission.done)   return { error: "Mission not completed yet" };
    if (mission.claimed) return { error: "Already claimed" };
    mission.claimed = true;
    return { mission };
  },

  // Mark a mission as done (call when player achieves it)
  markDone(userId, missionId) {
    const mission = MissionModel.findOne(userId, missionId);
    if (mission) mission.done = true;
  },

  // Checkin shortcut — mark mission 5 (daily check-in) done
  checkIn(userId) {
    MissionModel.markDone(userId, 5);
  },
};

module.exports = MissionModel;
