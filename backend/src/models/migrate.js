const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const DB_PATH = path.resolve(__dirname, "../../charity.db");

async function migrate() {
  const SQL = await initSqlJs();
  let db;
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'donor',
      wallet_address TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      on_chain_address TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      registration_number TEXT,
      phone TEXT,
      address TEXT,
      district TEXT,
      province TEXT,
      ipfs_docs_cid TEXT,
      logo_ipfs_cid TEXT,
      is_verified INTEGER DEFAULT 0,
      verified_at TEXT NULL,
      verified_by INTEGER NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id_chain INTEGER UNIQUE,
      on_chain_address TEXT UNIQUE,
      org_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_ipfs_cid TEXT,
      goal_lamports INTEGER NOT NULL,
      raised_lamports INTEGER DEFAULT 0,
      deadline TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      district TEXT,
      province TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      milestone_idx INTEGER NOT NULL,
      release_pct INTEGER NOT NULL,
      description TEXT,
      is_released INTEGER DEFAULT 0,
      released_at TEXT NULL,
      evidence_cid TEXT,
      tx_signature TEXT
    );
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      on_chain_address TEXT UNIQUE,
      donor_user_id INTEGER,
      donor_wallet TEXT NOT NULL,
      campaign_id INTEGER NOT NULL,
      amount_lamports INTEGER NOT NULL,
      net_lamports INTEGER NOT NULL,
      message TEXT,
      tx_signature TEXT NOT NULL UNIQUE,
      donated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id INTEGER,
      metadata TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `;

  try {
    console.log("🔄 Running migration...");
    db.run(schema);
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log("✅ Migration complete – all tables created.");
    console.log("💾 Database:", DB_PATH);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();