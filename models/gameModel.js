const mongoose = require("mongoose");

// Game definitions — static metadata only (no fake online counts)
const games = [
  // ── Lottery / Color Prediction ─────────────────────────────────────────────
  { id:"2",  name:"Wingo",       slug:"wingo",      category:"lottery", badge:"hot",  gradient:"from-emerald-500 to-teal-500",    emoji:"🎲",  popular:true },
  { id:"14", name:"K3 Lotre",    slug:"k3",         category:"lottery", badge:"hot",  gradient:"from-lime-500 to-green-600",      emoji:"🎯",  popular:true },
  { id:"15", name:"5D Lotre",    slug:"5d",         category:"lottery", badge:"new",  gradient:"from-blue-500 to-indigo-600",     emoji:"🔢",  popular:true },
  { id:"16", name:"TRX Hash",    slug:"trx",        category:"lottery", badge:"hot",  gradient:"from-violet-500 to-purple-700",   emoji:"⛓️", popular:true },

  // ── Crash ──────────────────────────────────────────────────────────────────
  { id:"1",  name:"Aviator",     slug:"aviator",    category:"crash",   badge:"hot",  gradient:"from-red-500 to-orange-400",      emoji:"✈️",  popular:true },
  { id:"5",  name:"Limbo",       slug:"limbo",      category:"crash",   badge:"new",  gradient:"from-pink-500 to-rose-500",       emoji:"🚀",  popular:true },

  // ── Arcade / Mini Games ────────────────────────────────────────────────────
  { id:"3",  name:"Mines",       slug:"mines",      category:"arcade",  badge:"new",  gradient:"from-yellow-400 to-amber-600",    emoji:"💎",  popular:true },
  { id:"17", name:"Plinko",      slug:"plinko",     category:"arcade",  badge:"hot",  gradient:"from-fuchsia-500 to-violet-600",  emoji:"⚪",  popular:true },

  // ── Dice ───────────────────────────────────────────────────────────────────
  { id:"4",  name:"Dice",        slug:"dice",       category:"dice",    badge:null,   gradient:"from-indigo-500 to-purple-600",   emoji:"🎯",  popular:true },

  // ── Casino ─────────────────────────────────────────────────────────────────
  { id:"6",  name:"Andar Bahar", slug:"andarbahar", category:"casino",  badge:"hot",  gradient:"from-cyan-500 to-blue-600",      emoji:"🃏",  popular:true },
  { id:"7",  name:"Roulette",    slug:"roulette",   category:"casino",  badge:"hot",  gradient:"from-rose-600 to-red-800",       emoji:"🎰",  popular:true },
  { id:"12", name:"Lucky Wheel", slug:"wheel",      category:"casino",  badge:"new",  gradient:"from-amber-500 to-pink-600",     emoji:"🎡",  popular:true },
];

// Build slug→name lookup for online count query
const slugToName = {};
games.forEach((g) => { slugToName[g.slug] = g.name; });

const GameModel = {
  /**
   * Get all games with real online counts from DB.
   * online = unique users who placed a bet on this game in last 10 minutes.
   */
  async getAll({ category, popular } = {}) {
    let list = [...games];
    if (category)         list = list.filter((g) => g.category === category);
    if (popular === true) list = list.filter((g) => g.popular);

    // Attach real online counts
    const onlineCounts = await GameModel._getOnlineCounts();
    return list.map((g) => ({
      ...g,
      online: onlineCounts[g.slug] ?? 0,
    }));
  },

  async getBySlug(slug) {
    const game = games.find((g) => g.slug === slug);
    if (!game) return null;
    const onlineCounts = await GameModel._getOnlineCounts();
    return { ...game, online: onlineCounts[slug] ?? 0 };
  },

  /**
   * Returns { [slug]: count } — real unique active players per game (last 10 min).
   * Uses the Transaction collection's "game" field (slug stored in label or dedicated field).
   */
  async _getOnlineCounts() {
    try {
      const Transaction = mongoose.model("Transaction");
      const since = new Date(Date.now() - 10 * 60 * 1000);

      // Count distinct users per game slug from recent bets
      const results = await Transaction.aggregate([
        {
          $match: {
            type:      "bet",
            game:      { $exists: true, $ne: null },
            createdAt: { $gte: since },
          },
        },
        {
          $group: {
            _id:   "$game",
            count: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            _id:   1,
            count: { $size: "$count" },
          },
        },
      ]);

      const map = {};
      results.forEach((r) => { map[r._id] = r.count; });
      return map;
    } catch {
      // If DB not ready or Transaction model not registered yet, return empty
      return {};
    }
  },

  // Legacy: no-op — kept so any old import doesn't break
  tickOnline() {},
};

module.exports = GameModel;
