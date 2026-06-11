// src/db.js – Gestion JSON locale (Volume Railway)
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.env.DATA_DIR || './data', 'db.json');

const DEFAULT_DB = {
  matches: {},   // matchId -> matchData
  bets: {},      // matchId -> { userId -> { choice, boosted, points } }
  users: {},     // userId -> { totalPoints, boostUsedToday: "YYYY-MM-DD" | null, username }
};

function load() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('[DB] Erreur lecture:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function save(data) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('[DB] Erreur écriture:', e);
  }
}

module.exports = { load, save };
