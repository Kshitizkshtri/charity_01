const router = require("express").Router();
const db = require("../models/db");
const { auth, requireRole } = require("../middleware/auth");

// ── List campaigns ────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const { category, province, active = true, limit = 20, offset = 0 } = req.query;
  let sql = `
    SELECT c.*, o.name as org_name, o.logo_ipfs_cid,
           (SELECT COUNT(*) FROM donations d WHERE d.campaign_id = c.id) as donor_count
    FROM campaigns c
    JOIN organizations o ON c.org_id = o.id
    WHERE 1=1
  `;
  const params = [];
  if (active !== "all") { sql += " AND c.is_active = ?"; params.push(active === "true"); }
  if (category) { sql += " AND c.category = ?"; params.push(category); }
  if (province) { sql += " AND c.province = ?"; params.push(province); }
  sql += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
  params.push(parseInt(limit), parseInt(offset));

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// ── Get single campaign ───────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const [campaigns] = await db.query(
    `SELECT c.*, o.name as org_name, o.logo_ipfs_cid, o.on_chain_address as org_chain_address,
            o.district as org_district
     FROM campaigns c JOIN organizations o ON c.org_id = o.id
     WHERE c.id = ?`,
    [req.params.id]
  );
  if (!campaigns.length) return res.status(404).json({ error: "Not found" });

  const [milestones] = await db.query(
    "SELECT * FROM milestones WHERE campaign_id = ? ORDER BY milestone_idx",
    [req.params.id]
  );
  const [recentDonations] = await db.query(
    `SELECT donor_wallet, amount_lamports, net_lamports, message, donated_at
     FROM donations WHERE campaign_id = ?
     ORDER BY donated_at DESC LIMIT 10`,
    [req.params.id]
  );

  res.json({ ...campaigns[0], milestones, recent_donations: recentDonations });
});

// ── Create campaign (org_admin) ───────────────────────────────────────────────
router.post("/", auth, requireRole("org_admin"), async (req, res) => {
  const {
    title, description, image_ipfs_cid, goal_lamports, deadline,
    category, district, province, on_chain_address, campaign_id_chain,
    milestones = []
  } = req.body;

  if (!title || !goal_lamports || !deadline) {
    return res.status(400).json({ error: "title, goal_lamports, deadline are required" });
  }

  const [orgs] = await db.query(
    "SELECT id, is_verified FROM organizations WHERE user_id = ?",
    [req.user.id]
  );
  if (!orgs.length) return res.status(403).json({ error: "No organization found" });
  if (!orgs[0].is_verified) return res.status(403).json({ error: "Organization not verified" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO campaigns
        (campaign_id_chain, on_chain_address, org_id, title, description,
         image_ipfs_cid, goal_lamports, deadline, category, district, province)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [campaign_id_chain, on_chain_address, orgs[0].id, title, description,
       image_ipfs_cid, goal_lamports, new Date(deadline), category, district, province]
    );

    const campaignDbId = result.insertId;

    for (const [i, m] of milestones.entries()) {
      await conn.query(
        "INSERT INTO milestones (campaign_id, milestone_idx, release_pct, description) VALUES (?, ?, ?, ?)",
        [campaignDbId, i, m.release_pct, m.description]
      );
    }

    await conn.commit();
    res.status(201).json({ id: campaignDbId, message: "Campaign created" });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
});

// ── Record donation (called after on-chain tx) ───────────────────────────────
router.post("/:id/donate", auth, async (req, res) => {
  const {
    donor_wallet, amount_lamports, net_lamports,
    message, tx_signature, on_chain_address
  } = req.body;

  if (!donor_wallet || !amount_lamports || !tx_signature) {
    return res.status(400).json({ error: "donor_wallet, amount_lamports, tx_signature required" });
  }

  try {
    await db.query(
      `INSERT INTO donations
        (on_chain_address, donor_user_id, donor_wallet, campaign_id,
         amount_lamports, net_lamports, message, tx_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [on_chain_address, req.user.id, donor_wallet, req.params.id,
       amount_lamports, net_lamports, message, tx_signature]
    );
    await db.query(
      "UPDATE campaigns SET raised_lamports = raised_lamports + ? WHERE id = ?",
      [net_lamports, req.params.id]
    );
    res.status(201).json({ message: "Donation recorded" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Transaction already recorded" });
    res.status(500).json({ error: "Server error" });
  }
});

// ── Get campaign donations ────────────────────────────────────────────────────
router.get("/:id/donations", async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const [rows] = await db.query(
    `SELECT d.*, u.full_name as donor_name
     FROM donations d
     LEFT JOIN users u ON d.donor_user_id = u.id
     WHERE d.campaign_id = ?
     ORDER BY d.donated_at DESC LIMIT ? OFFSET ?`,
    [req.params.id, parseInt(limit), parseInt(offset)]
  );
  res.json(rows);
});

// ── Record milestone release ──────────────────────────────────────────────────
router.post("/:id/milestones/:idx/release", auth, requireRole("org_admin"), async (req, res) => {
  const { evidence_cid, tx_signature, amount_released } = req.body;
  await db.query(
    `UPDATE milestones
     SET is_released = TRUE, released_at = NOW(), evidence_cid = ?, tx_signature = ?
     WHERE campaign_id = ? AND milestone_idx = ?`,
    [evidence_cid, tx_signature, req.params.id, req.params.idx]
  );
  res.json({ message: "Milestone release recorded" });
});

// ── Platform stats ────────────────────────────────────────────────────────────
router.get("/stats/platform", async (req, res) => {
  const [[totals]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM campaigns WHERE is_active = TRUE) as active_campaigns,
      (SELECT COUNT(*) FROM donations) as total_donations,
      (SELECT COALESCE(SUM(amount_lamports), 0) FROM donations) as total_raised_lamports,
      (SELECT COUNT(*) FROM organizations WHERE is_verified = TRUE) as verified_orgs
  `);
  res.json(totals);
});

module.exports = router;
