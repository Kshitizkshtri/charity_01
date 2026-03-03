const router = require("express").Router();
const multer = require("multer");
const FormData = require("form-data");
const fetch = require("node-fetch");
const { auth } = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP, PDF allowed"));
  },
});

// ── Upload a single file to IPFS via Pinata ───────────────────────────────────
router.post("/file", auth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  const formData = new FormData();
  formData.append("file", req.file.buffer, {
    filename: req.file.originalname,
    contentType: req.file.mimetype,
  });

  const metadata = JSON.stringify({
    name: req.file.originalname,
    keyvalues: { uploader: String(req.user.id) },
  });
  formData.append("pinataMetadata", metadata);

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: "IPFS upload failed", details: err });
    }

    const data = await response.json();
    res.json({
      cid: data.IpfsHash,
      url: `${process.env.PINATA_GATEWAY}${data.IpfsHash}`,
      size: data.PinSize,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "IPFS upload failed" });
  }
});

// ── Upload JSON metadata to IPFS ──────────────────────────────────────────────
router.post("/json", auth, async (req, res) => {
  const { data, name = "metadata" } = req.body;
  if (!data) return res.status(400).json({ error: "data required" });

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
      },
      body: JSON.stringify({
        pinataMetadata: { name },
        pinataContent: data,
      }),
    });

    const result = await response.json();
    res.json({
      cid: result.IpfsHash,
      url: `${process.env.PINATA_GATEWAY}${result.IpfsHash}`,
    });
  } catch (err) {
    res.status(500).json({ error: "IPFS JSON upload failed" });
  }
});

module.exports = router;
