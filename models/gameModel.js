const games = [
  { id:"1",  name:"Aviator",     slug:"aviator", category:"crash",   badge:"hot",  online:2412, gradient:"from-red-500 to-orange-400",    emoji:"✈️",  popular:true  },
  { id:"5",  name:"Limbo",       slug:"limbo",   category:"crash",   badge:"new",  online:488,  gradient:"from-pink-500 to-rose-500",      emoji:"🚀",  popular:true  },
  { id:"10", name:"Crash X",     slug:"aviator", category:"crash",   badge:"new",  online:71,   gradient:"from-orange-500 to-red-600",     emoji:"💥",  popular:false },
  { id:"2",  name:"Wingo",       slug:"wingo",   category:"lottery", badge:"hot",  online:1840, gradient:"from-emerald-500 to-teal-500",   emoji:"🎲",  popular:true  },
  { id:"9",  name:"K3 Lotre",    slug:"wingo",   category:"lottery", badge:null,   online:44,   gradient:"from-lime-500 to-green-600",     emoji:"🎟️", popular:false },
  { id:"3",  name:"Mines",       slug:"mines",   category:"arcade",  badge:"new",  online:932,  gradient:"from-yellow-400 to-amber-600",   emoji:"💎",  popular:true  },
  { id:"13", name:"Chicken",     slug:"mines",   category:"arcade",  badge:"hot",  online:761,  gradient:"from-yellow-300 to-lime-400",    emoji:"🐔",  popular:true  },
  { id:"4",  name:"Dice",        slug:"dice",    category:"dice",    badge:null,   online:612,  gradient:"from-indigo-500 to-purple-600",  emoji:"🎯",  popular:true  },
  { id:"11", name:"Hi-Lo",       slug:"dice",    category:"dice",    badge:null,   online:28,   gradient:"from-sky-500 to-indigo-600",     emoji:"🔼",  popular:false },
  { id:"8",  name:"Plinko",      slug:"aviator", category:"casino",  badge:"hot",  online:1102, gradient:"from-fuchsia-500 to-violet-600", emoji:"⚪",  popular:true  },
  { id:"12", name:"Wheel",       slug:"aviator", category:"casino",  badge:null,   online:156,  gradient:"from-amber-500 to-pink-600",     emoji:"🎡",  popular:true  },
  { id:"6",  name:"Andar Bahar", slug:"aviator", category:"casino",  badge:null,   online:312,  gradient:"from-cyan-500 to-blue-600",      emoji:"🃏",  popular:false },
  { id:"7",  name:"Roulette",    slug:"aviator", category:"casino",  badge:null,   online:221,  gradient:"from-rose-600 to-red-800",       emoji:"🎰",  popular:false },
];

const GameModel = {
  getAll({ category, popular } = {}) {
    let list = [...games];
    if (category)         list = list.filter((g) => g.category === category);
    if (popular === true) list = list.filter((g) => g.popular);
    return list;
  },

  getBySlug(slug) {
    return games.find((g) => g.slug === slug) || null;
  },

  // Called by stats ticker
  tickOnline() {
    games.forEach((g) => {
      g.online = Math.max(5, g.online + Math.floor(Math.random() * 20) - 10);
    });
  },
};

module.exports = GameModel;
