// Database layer using sql.js (pure JavaScript SQLite - no compilation needed)
const initSqlJs = require("sql.js");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.resolve(__dirname, "../../charity.db");

let db = null;

// Save database to disk
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// Initialize database (sync-style wrapper for async sql.js)
function getDb() {
  if (db) return db;
  throw new Error("Database not initialized. Call initDb() first.");
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  console.log("💾 SQLite database:", DB_PATH);
  return db;
}

// mysql2-compatible API: const [rows] = await db.query(sql, params)
const dbWrapper = {
  query: async (sql, params = []) => {
    const database = getDb();
    try {
      const trimmed = sql.trim().toUpperCase();

      if (trimmed.startsWith("SELECT") || trimmed.startsWith("SHOW")) {
        const stmt = database.prepare(sql);
        const rows = [];
        stmt.bind(params);
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return [rows];
      }

      // INSERT / UPDATE / DELETE
      database.run(sql, params);
      saveDb();

      if (trimmed.startsWith("INSERT")) {
        const lastId = database.exec("SELECT last_insert_rowid() as id")[0];
        const insertId = lastId ? lastId.values[0][0] : 0;
        return [{ insertId, affectedRows: database.getRowsModified() }];
      }

      return [{ affectedRows: database.getRowsModified() }];
    } catch (err) {
      console.error("DB Error:", err.message, "\nSQL:", sql);
      throw err;
    }
  },

  getConnection: async () => ({
    query: async (sql, params = []) => dbWrapper.query(sql, params),
    beginTransaction: async () => { getDb().run("BEGIN"); },
    commit: async () => { getDb().run("COMMIT"); saveDb(); },
    rollback: async () => { getDb().run("ROLLBACK"); },
    release: () => {},
  }),

  initDb,
};

module.exports = dbWrapper;