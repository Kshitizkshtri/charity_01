import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getCampaign, getCampaignDonations } from "../utils/api";
import { lamportsToSol } from "../hooks/useCharityProgram";
import DonateModal from "../components/DonateModal";

const PINATA_GW = process.env.REACT_APP_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

function shortWallet(w) {
  if (!w) return "";
  return `${w.slice(0, 4)}...${w.slice(-4)}`;
}

export default function CampaignDetailPage() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonate, setShowDonate] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    try {
      const [campRes, donRes] = await Promise.all([
        getCampaign(id),
        getCampaignDonations(id, { limit: 20 }),
      ]);
      setCampaign(campRes.data);
      setDonations(donRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="container" style={{ padding: "80px 0" }}>
      <div className="skeleton" style={{ height: 400, borderRadius: 16, marginBottom: 32 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
    </div>
  );

  if (!campaign) return (
    <div className="container" style={{ padding: "120px 0", textAlign: "center" }}>
      <h2>Campaign not found</h2>
      <Link to="/campaigns" className="btn btn-primary" style={{ marginTop: 24 }}>Back to Campaigns</Link>
    </div>
  );

  const pct = Math.min(100, Math.round((campaign.raised_lamports / campaign.goal_lamports) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.deadline) - Date.now()) / 86400000));
  const imgUrl = campaign.image_ipfs_cid ? `${PINATA_GW}${campaign.image_ipfs_cid}` : null;

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        <Link to="/campaigns" style={{ color: "#6B7280", fontSize: 14, textDecoration: "none",
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 32 }}>
          ← Back to Campaigns
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div>
            {/* Hero image */}
            <div style={{
              height: 360, borderRadius: 16, overflow: "hidden",
              background: imgUrl ? `url(${imgUrl}) center/cover` : "#1E2533",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 32, fontSize: 80,
            }}>
              {!imgUrl && "🤝"}
            </div>

            {/* Title & org */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ color: "#9CA3AF", fontSize: 14 }}>{campaign.org_name}</span>
              {campaign.is_active && <span className="badge badge-verified">● Active</span>}
            </div>
            <h1 style={{ fontSize: 36, marginBottom: 24 }}>{campaign.title}</h1>
            <p style={{ color: "#9CA3AF", lineHeight: 1.8, fontSize: 16, marginBottom: 40 }}>
              {campaign.description}
            </p>

            {/* ── Milestones ─────────────────────────────────────────────── */}
            {campaign.milestones?.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h3 style={{ fontSize: 20, marginBottom: 20 }}>Milestone-Based Fund Release</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {campaign.milestones.map((m, i) => (
                    <div key={i} style={{
                      background: "#141820", border: "1px solid",
                      borderColor: m.is_released ? "#22C55E" : "#1E2533",
                      borderRadius: 12, padding: 20,
                      display: "flex", alignItems: "center", gap: 16,
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: m.is_released ? "#22C55E22" : "#1E2533",
                        border: `2px solid ${m.is_released ? "#22C55E" : "#2D3748"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 700, color: m.is_released ? "#22C55E" : "#6B7280",
                      }}>
                        {m.is_released ? "✓" : i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.description}</div>
                        <div style={{ fontSize: 13, color: "#6B7280" }}>
                          {m.release_pct}% of funds · {m.is_released
                            ? <span style={{ color: "#22C55E" }}>Released ✓</span>
                            : "Pending"}
                        </div>
                      </div>
                      {m.evidence_cid && (
                        <a href={`${PINATA_GW}${m.evidence_cid}`} target="_blank" rel="noreferrer"
                          style={{ color: "#F4A900", fontSize: 13, textDecoration: "none" }}>
                          View Evidence ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Donations feed ─────────────────────────────────────────── */}
            <h3 style={{ fontSize: 20, marginBottom: 20 }}>Recent Donations</h3>
            {donations.length === 0 ? (
              <p style={{ color: "#6B7280" }}>Be the first to donate!</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {donations.map((d, i) => (
                  <div key={i} style={{
                    background: "#141820", border: "1px solid #1E2533",
                    borderRadius: 10, padding: 16,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>
                        {d.donor_name || shortWallet(d.donor_wallet)}
                      </div>
                      {d.message && <div style={{ color: "#6B7280", fontSize: 13, marginTop: 2 }}>
                        "{d.message}"
                      </div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#F4A900" }}>
                        {lamportsToSol(d.amount_lamports)} SOL
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        {new Date(d.donated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right column (sticky) ───────────────────────────────────── */}
          <div style={{ position: "sticky", top: 80 }}>
            <div className="card" style={{ padding: 28 }}>
              {/* Progress */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: "#F4A900" }}>
                    {lamportsToSol(campaign.raised_lamports)} SOL
                  </span>
                  <span style={{ color: "#6B7280", fontSize: 14, alignSelf: "flex-end" }}>
                    raised of {lamportsToSol(campaign.goal_lamports)} SOL goal
                  </span>
                </div>
                <div className="progress-track" style={{ height: 10, marginBottom: 12 }}>
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {[
                    { label: "Funded", value: `${pct}%` },
                    { label: "Days Left", value: daysLeft },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      background: "#0D1117", borderRadius: 10, padding: 14, textAlign: "center",
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 20 }}>{value}</div>
                      <div style={{ color: "#6B7280", fontSize: 13 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => setShowDonate(true)}
                className="btn btn-saffron w-full"
                style={{ justifyContent: "center", padding: "16px", fontSize: 16, marginBottom: 16 }}>
                💎 Donate Now
              </button>

              <hr className="divider" />

              {/* On-chain details */}
              <div style={{ fontSize: 13, color: "#6B7280" }}>
                <div style={{ fontWeight: 600, color: "#9CA3AF", marginBottom: 10 }}>
                  On-Chain Details
                </div>
                {[
                  { label: "Program", value: "Solana / Anchor" },
                  { label: "Network", value: process.env.REACT_APP_SOLANA_NETWORK || "devnet" },
                  campaign.on_chain_address && {
                    label: "Campaign PDA",
                    value: shortWallet(campaign.on_chain_address),
                    link: `https://explorer.solana.com/address/${campaign.on_chain_address}?cluster=devnet`,
                  },
                ].filter(Boolean).map(({ label, value, link }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between",
                    padding: "6px 0", borderBottom: "1px solid #1E2533" }}>
                    <span>{label}</span>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer"
                        style={{ color: "#F4A900", textDecoration: "none" }}>{value} ↗</a>
                    ) : <span style={{ color: "#9CA3AF" }}>{value}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDonate && (
        <DonateModal
          campaign={campaign}
          onClose={() => setShowDonate(false)}
          onSuccess={loadCampaign}
        />
      )}
    </div>
  );
}
