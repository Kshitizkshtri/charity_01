const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { body, validationResult } = require("express-validator");
const db = require("../models/db");

// ── Register ──────────────────────────────────────────────────────────────────
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("full_name").trim().notEmpty().isLength({ max: 128 }),
    body("role").optional().isIn(["donor", "org_admin"]),
    body("wallet_address").optional().isLength({ min: 32, max: 64 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, full_name, role = "donor", wallet_address } = req.body;

    try {
      const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length) return res.status(409).json({ error: "Email already registered" });

      const password_hash = await bcrypt.hash(password, 12);
      const uuid = uuidv4();

      const [result] = await db.query(
        "INSERT INTO users (uuid, email, password_hash, full_name, role, wallet_address) VALUES (?, ?, ?, ?, ?, ?)",
        [uuid, email, password_hash, full_name, role, wallet_address || null]
      );

      const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      res.status(201).json({
        message: "Registration successful",
        token,
        user: { id: result.insertId, uuid, email, full_name, role },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ── Login ─────────────────────────────────────────────────────────────────────
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
      if (!rows.length) return res.status(401).json({ error: "Invalid credentials" });

      const user = rows[0];
      if (!user.is_active) return res.status(403).json({ error: "Account is disabled" });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      });

      res.json({
        token,
        user: {
          id: user.id,
          uuid: user.uuid,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          wallet_address: user.wallet_address,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ── Update wallet ─────────────────────────────────────────────────────────────
router.patch("/wallet", require("../middleware/auth").auth, async (req, res) => {
  const { wallet_address } = req.body;
  if (!wallet_address) return res.status(400).json({ error: "wallet_address required" });
  await db.query("UPDATE users SET wallet_address = ? WHERE id = ?", [wallet_address, req.user.id]);
  res.json({ message: "Wallet updated" });
});

module.exports = router;
