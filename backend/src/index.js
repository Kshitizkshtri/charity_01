require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const db = require("./models/db");

const REQUIRED_VARS = ["JWT_SECRET", "CHARITY_PROGRAM_ID", "SOLANA_NETWORK"];
const OPTIONAL_VARS = ["PINATA_API_KEY", "PINATA_SECRET_KEY"];

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("   NepalDaan — Charity Donation API");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
REQUIRED_VARS.forEach((v) => {
  if (!process.env[v]) console.warn(`⚠️  Missing: ${v}`);
  else console.log(`✅ ${v}: ${v.includes("SECRET") ? "***" : process.env[v]}`);
});
OPTIONAL_VARS.forEach((v) => {
  const val = process.env[v];
  console.log(!val || val.startsWith("your_") ? `ℹ️  ${v}: not configured` : `✅ ${v}: ***`);
});
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: "Too many requests" },
});
app.use("/api/", limiter);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/organizations", require("./routes/organizations"));
app.use("/api/campaigns", require("./routes/campaigns"));
app.use("/api/ipfs", require("./routes/ipfs"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "1.0.0", network: process.env.SOLANA_NETWORK || "devnet" });
});

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

// Initialize database FIRST, then start server
db.initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Charity Donation API running on port ${PORT}`);
    console.log(`🌐 Network: ${process.env.SOLANA_NETWORK || "devnet"}`);
    console.log(`📋 Program: ${process.env.CHARITY_PROGRAM_ID}\n`);
  });
}).catch(err => {
  console.error("❌ Failed to initialize database:", err.message);
  process.exit(1);
});

module.exports = app;