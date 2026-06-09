const WalletModel        = require("../models/walletModel");
const TransactionModel   = require("../models/transactionModel");
const MissionModel       = require("../models/missionModel");
const UserModel          = require("../models/userModel");
const { validateAmount } = require("../utils/validators");
const { success, error } = require("../utils/response");
const { MAX_DEPOSIT, MAX_WITHDRAW } = require("../config/constants");

const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP || "923359348844";

const notifyAdmin = (message) => {
  console.log(`[NOTIFY] WhatsApp to +${ADMIN_WHATSAPP}: ${message}`);
};

const getWallet = async (req, res) => {
  try {
    const wallet = await WalletModel.getByUserId(req.userId);
    if (!wallet) return error(res, "Wallet not found", 404);
    return success(res, wallet);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const deposit = async (req, res) => {
  try {
    const { amount, method, accountNumber } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);

    const amt = Number(amount);
    if (amt < 100)         return error(res, "Minimum deposit is PKR 100");
    if (amt > MAX_DEPOSIT) return error(res, `Maximum deposit is PKR ${MAX_DEPOSIT.toLocaleString()}`);

    const validMethods = ["easypaisa", "jazzcash", "bank"];
    if (!method || !validMethods.includes(method))
      return error(res, "Payment method required: easypaisa, jazzcash, or bank");

    const user = await UserModel.findById(req.userId);

    // Create PENDING deposit — balance credited only after admin approves
    const tx = await TransactionModel.create(req.userId, {
      type:          "deposit",
      label:         `Deposit via ${method.charAt(0).toUpperCase() + method.slice(1)}`,
      amount:        amt,
      positive:      true,
      status:        "pending",
      method,
      accountNumber: accountNumber || "",
    });

    notifyAdmin(
      `💰 NEW DEPOSIT REQUEST\nUser: ${user?.username} (${user?.mobile})\nAmount: PKR ${amt.toLocaleString()}\nMethod: ${method.toUpperCase()}\nAccount: ${accountNumber || "N/A"}\nTX ID: ${tx._id}\n→ Approve in Admin Panel`
    );

    const wallet = await WalletModel.getByUserId(req.userId);
    return success(res, {
      wallet,
      transaction: tx,
      message: `Deposit request of PKR ${amt} submitted. Send payment to ${ADMIN_WHATSAPP} and admin will credit within a few hours.`,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const withdraw = async (req, res) => {
  try {
    const { amount, method, accountNumber, accountName } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);

    const amt = Number(amount);
    if (amt < 100)          return error(res, "Minimum withdrawal is PKR 100");
    if (amt > MAX_WITHDRAW)  return error(res, `Maximum withdrawal is PKR ${MAX_WITHDRAW.toLocaleString()}`);
    if (!accountNumber)      return error(res, "Account number is required");

    const result = await WalletModel.withdraw(req.userId, amt);
    if (result.error) return error(res, result.error);

    const user = await UserModel.findById(req.userId);

    const tx = await TransactionModel.create(req.userId, {
      type:          "withdraw",
      label:         `Withdrawal via ${(method || "manual").charAt(0).toUpperCase() + (method || "manual").slice(1)}`,
      amount:        amt,
      positive:      false,
      status:        "pending",
      method:        method || "",
      accountNumber: accountNumber || "",
      accountName:   accountName   || "",
    });

    notifyAdmin(
      `🏧 WITHDRAWAL REQUEST\nUser: ${user?.username} (${user?.mobile})\nAmount: PKR ${amt.toLocaleString()}\nMethod: ${(method || "N/A").toUpperCase()}\nAccount: ${accountNumber || "N/A"} (${accountName || "N/A"})\nBalance left: PKR ${result.wallet.balance.toLocaleString()}\nTX ID: ${tx._id}\n→ Approve in Admin Panel`
    );

    return success(res, {
      wallet: result.wallet,
      transaction: tx,
      message: `Withdrawal request of PKR ${amt} submitted. Admin will process within 24 hours.`,
    });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

const placeBet = async (req, res) => {
  try {
    const { amount, game: gameName, result, payout } = req.body;
    const amtErr = validateAmount(amount);
    if (amtErr) return error(res, amtErr);
    const betAmt = Number(amount);

    const walletAfterBet = await WalletModel.deductBet(req.userId, betAmt);
    if (!walletAfterBet) return error(res, "Insufficient balance");

    await TransactionModel.create(req.userId, {
      type: "bet", label: `${gameName} Bet`, amount: betAmt, positive: false,
    });

    let finalWallet = walletAfterBet;

    if (result === "win" && payout) {
      const winAmt = Number(payout);
      finalWallet  = await WalletModel.creditWin(req.userId, winAmt);
      await TransactionModel.create(req.userId, {
        type: "win", label: `${gameName} Win`, amount: winAmt, positive: true,
      });
    }

    // ── VIP XP: 1 XP per PKR 10 bet ─────────────────────────────────────────
    const xpGained = Math.floor(betAmt / 10);
    if (xpGained > 0) {
      const user = await UserModel.findById(req.userId);
      if (user) {
        let newXp     = (user.vipXp || 0) + xpGained;
        let newLevel  = user.vipLevel  || 1;
        let newXpNext = user.vipXpNext || 1000;
        while (newXp >= newXpNext && newLevel < 10) {
          newXp    -= newXpNext;
          newLevel += 1;
          newXpNext = Math.floor(newXpNext * 1.5);
        }
        await UserModel.update(req.userId, { vipXp: newXp, vipLevel: newLevel, vipXpNext: newXpNext });
      }
    }

    // ── Mission 2: Play 10 rounds of Aviator ─────────────────────────────────
    if (gameName === "Aviator") {
      // Count total Aviator bets; mark done after 10
      const mongoose = require("mongoose");
      const Tx = mongoose.model("Transaction");
      const aviatorBets = await Tx.countDocuments({ userId: req.userId, type: "bet", label: /Aviator Bet/ });
      if (aviatorBets >= 10) await MissionModel.markDone(req.userId, 2).catch(() => {});
    }

    // ── Mission 4: Win 3 rounds in Wingo ─────────────────────────────────────
    if (gameName === "Wingo" && result === "win") {
      const mongoose = require("mongoose");
      const Tx = mongoose.model("Transaction");
      const wingoWins = await Tx.countDocuments({ userId: req.userId, type: "win", label: /Wingo Win/ });
      if (wingoWins >= 3) await MissionModel.markDone(req.userId, 4).catch(() => {});
    }

    return success(res, { wallet: finalWallet });
  } catch (e) {
    return error(res, e.message, 500);
  }
};

// ── Server-side game result generation (provably fair) ───────────────────────
const getGameResult = async (req, res) => {
  try {
    const { game, clientSeed } = req.body;
    if (!game) return error(res, "game is required");

    // Server seed (per-request random — for real provably fair, store hash before reveal)
    const crypto      = require("crypto");
    const serverSeed  = crypto.randomBytes(16).toString("hex");
    const combined    = `${serverSeed}:${clientSeed || "default"}`;
    const hash        = crypto.createHash("sha256").update(combined).digest("hex");

    // Derive a float 0–1 from first 8 hex chars
    const float = parseInt(hash.slice(0, 8), 16) / 0xffffffff;

    let result = null;
    switch (game) {
      case "aviator":
      case "limbo": {
        // House edge 3% — crash point distribution
        const crash = Math.max(1.00, +(1 / (1 - float * 0.97)).toFixed(2));
        result = { crash, serverSeed, hash };
        break;
      }
      case "dice": {
        const roll = +(float * 100).toFixed(2);
        result = { roll, serverSeed, hash };
        break;
      }
      case "wingo": {
        const num = Math.floor(float * 10);
        result = { num, serverSeed, hash };
        break;
      }
      case "k3": {
        // K3 Lotre — roll 3 dice (1-6 each)
        const d1 = Math.floor(parseInt(crypto.createHash("sha256").update(`${combined}:d1`).digest("hex").slice(0,8), 16) % 6) + 1;
        const d2 = Math.floor(parseInt(crypto.createHash("sha256").update(`${combined}:d2`).digest("hex").slice(0,8), 16) % 6) + 1;
        const d3 = Math.floor(parseInt(crypto.createHash("sha256").update(`${combined}:d3`).digest("hex").slice(0,8), 16) % 6) + 1;
        const sum = d1 + d2 + d3;
        result = { dice: [d1, d2, d3], sum, serverSeed, hash };
        break;
      }
      case "5d": {
        // 5D Lotre — generate 5 digits (0-9 each)
        const digits = Array.from({ length: 5 }, (_, i) =>
          Math.floor(parseInt(crypto.createHash("sha256").update(`${combined}:5d${i}`).digest("hex").slice(0,8), 16) % 10)
        );
        result = { digits, serverSeed, hash };
        break;
      }
      case "trx": {
        // TRX Hash — last digit of hash determines result (0-9)
        const trxNum = parseInt(hash.slice(-1), 16) % 10;
        result = { num: trxNum, hash: hash.slice(0, 16) + "...", serverSeed, fullHash: hash };
        break;
      }
      case "plinko": {
        // Plinko — ball drops through 16 rows of pegs, result is slot 0-16
        const rows = 16;
        let pos = 0;
        for (let r = 0; r < rows; r++) {
          const rHash = crypto.createHash("sha256").update(`${combined}:plinko:${r}`).digest("hex");
          const bit = parseInt(rHash[0], 16) % 2;
          pos += bit; // 0 = go left, 1 = go right
        }
        // Multiplier table for 16-row plinko (slot 0..16)
        const multipliers = [1000, 130, 26, 9, 4, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 4, 9, 26, 130, 1000];
        const multiplier = multipliers[pos] ?? 0.2;
        result = { slot: pos, multiplier, rows, serverSeed, hash };
        break;
      }
      case "andarbahar": {
        // Andar Bahar — 0=andar wins, 1=bahar wins
        const abResult = parseInt(hash.slice(0, 8), 16) % 2;
        result = { num: abResult, serverSeed, hash };
        break;
      }
      case "roulette": {
        // European Roulette 0-36
        const rouNum = Math.floor(float * 37); // 0 to 36
        result = { num: rouNum, serverSeed, hash };
        break;
      }
      case "wheel": {
        // Lucky Wheel — 16 segments
        const wheelIdx = Math.floor(float * 16);
        result = { num: wheelIdx, serverSeed, hash };
        break;
      }
      case "mines": {
        // Generate mine positions for a 5×5 grid
        const { numMines = 3 } = req.body;
        const positions = new Set();
        let attempt = 0;
        while (positions.size < Math.min(numMines, 24)) {
          const idx = Math.floor(
            parseInt(
              crypto.createHash("sha256")
                .update(`${combined}:mine:${attempt++}`)
                .digest("hex")
                .slice(0, 8),
              16
            ) % 25
          );
          positions.add(idx);
        }
        result = { mines: Array.from(positions), serverSeed, hash };
        break;
      }
      default:
        return error(res, "Unknown game");
    }

    return success(res, result);
  } catch (e) {
    return error(res, e.message, 500);
  }
};

module.exports = { getWallet, deposit, withdraw, placeBet, getGameResult };
