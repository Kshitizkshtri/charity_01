const router = require("express").Router();
const db = require("../models/db");
const { auth, requireRole } = require("../middleware/auth");

// ── List all verified orgs ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT o.*, u.email, u.full_name as contact_name
       FROM organizations o
       JOIN users u ON o.user_id = u.id
       WHERE o.is_verified = TRUE
       ORDER BY o.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Get single org ────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const [rows] = await db.query(
    `SELECT o.*, u.email, u.full_name as contact_name
     FROM organizations o JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// ── Register org (org_admin only) ─────────────────────────────────────────────
router.post("/", auth, requireRole("org_admin"), async (req, res) => {
  const {
    name, description, registration_number,
    phone, address, district, province,
    ipfs_docs_cid, logo_ipfs_cid, on_chain_address
  } = req.body;

  if (!name) return res.status(400).json({ error: "name required" });

  try {
    const [result] = await db.query(
      `INSERT INTO organizations
        (user_id, name, description, registration_number, phone, address,
         district, province, ipfs_docs_cid, logo_ipfs_cid, on_chain_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, description, registration_number, phone, address,
       district, province, ipfs_docs_cid, logo_ipfs_cid, on_chain_address]
    );
    res.status(201).json({ id: result.insertId, message: "Organization registered, pending verification" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Verify org (platform_admin only) ─────────────────────────────────────────
router.patch("/:id/verify", auth, requireRole("platform_admin"), async (req, res) => {
  const { verified } = req.body;
  await db.query(
    "UPDATE organizations SET is_verified = ?, verified_at = ?, verified_by = ? WHERE id = ?",
    [verified, verified ? new Date() : null, req.user.id, req.params.id]
  );
  res.json({ message: `Organization ${verified ? "verified" : "unverified"}` });
});

// ── My org (for org_admin) ────────────────────────────────────────────────────
router.get("/me/profile", auth, requireRole("org_admin"), async (req, res) => {
  const [rows] = await db.query(
    "SELECT * FROM organizations WHERE user_id = ?",
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: "No organization found" });
  res.json(rows[0]);
});

module.exports = router;
