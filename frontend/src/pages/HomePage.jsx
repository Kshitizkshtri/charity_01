import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCampaigns, getPlatformStats } from "../utils/api";
import CampaignCard from "../components/CampaignCard";
import { lamportsToSol } from "../hooks/useCharityProgram";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "disaster_relief", label: "🆘 Disaster Relief" },
  { value: "education", label: "📚 Education" },
  { value: "health", label: "🏥 Health" },
  { value: "poverty", label: "🤝 Poverty" },
  { value: "environment", label: "🌿 Environment" },
];

export default function HomePage() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [category]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [campRes, statsRes] = await Promise.all([
        getCampaigns({ category, limit: 9 }),
        getPlatformStats(),
      ]);
      setCampaigns(campRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,16,46,0.25) 0%, transparent 70%)",
        minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center",
        padding: "80px 0",
      }}>
        <div className="container">
          <div style={{ maxWidth: 680 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(200,16,46,0.1)", border: "1px solid rgba(200,16,46,0.3)",
              borderRadius: 99, padding: "6px 16px", fontSize: 13,
              color: "#F4A900", marginBottom: 32, fontWeight: 500,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E",
                animation: "pulse 2s infinite" }} />
              Live on Solana Devnet · Low-fee, transparent giving
            </div>

            <h1 style={{ fontSize: "clamp(42px, 6vw, 72px)", marginBottom: 24,
              background: "linear-gradient(135deg, #F9FAFB 0%, #9CA3AF 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Transparent Giving<br />
              <span style={{
                background: "linear-gradient(135deg, #C8102E, #F4A900)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>for Nepal.</span>
            </h1>

            <p style={{ fontSize: 20, color: "#9CA3AF", marginBottom: 40, lineHeight: 1.7 }}>
              Every SOL you donate is tracked on the blockchain — from your wallet
              to the cause. No middlemen. No corruption. Pure impact.
            </p>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <Link to="/campaigns" className="btn btn-primary" style={{ fontSize: 16, padding: "14px 32px" }}>
                Browse Campaigns →
              </Link>
              <Link to="/register" className="btn btn-secondary" style={{ fontSize: 16, padding: "14px 32px" }}>
                Register Your Charity
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      {stats && (
        <section style={{ background: "#0D1117", borderTop: "1px solid #1E2533",
          borderBottom: "1px solid #1E2533", padding: "48px 0" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
              {[
                { label: "Active Campaigns", value: stats.active_campaigns, icon: "🚀" },
                { label: "Total Donations", value: stats.total_donations?.toLocaleString(), icon: "💎" },
                { label: "SOL Raised", value: `${lamportsToSol(stats.total_raised_lamports)} SOL`, icon: "◎" },
                { label: "Verified Charities", value: stats.verified_orgs, icon: "✅" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#F4A900" }}>{value ?? "—"}</div>
                  <div style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Campaigns ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
            <h2 style={{ fontSize: 32 }}>Active Campaigns</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setCategory(cat.value)}
                  style={{
                    background: category === cat.value ? "#C8102E" : "#1E2533",
                    border: "1px solid", borderColor: category === cat.value ? "#C8102E" : "#2D3748",
                    color: "white", borderRadius: 99, padding: "8px 16px",
                    cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all 0.2s",
                  }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 380, borderRadius: 12 }} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#6B7280" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
              <p>No campaigns found in this category.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
              {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link to="/campaigns" className="btn btn-secondary" style={{ padding: "14px 40px", fontSize: 15 }}>
              View All Campaigns →
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0", background: "#0D1117",
        borderTop: "1px solid #1E2533" }}>
        <div className="container">
          <h2 style={{ textAlign: "center", fontSize: 36, marginBottom: 16 }}>How It Works</h2>
          <p style={{ textAlign: "center", color: "#6B7280", marginBottom: 64, fontSize: 18 }}>
            Powered by Solana smart contracts for zero-trust transparency
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            {[
              { step: "01", title: "Connect Wallet", desc: "Link your Phantom wallet — your on-chain identity. No signups needed to browse.", icon: "🔗" },
              { step: "02", title: "Choose a Cause", desc: "Browse verified campaigns with real-time funding progress tracked on Solana.", icon: "🎯" },
              { step: "03", title: "Donate in SOL", desc: "Send SOL directly to the campaign vault smart contract. Instant, low-fee (avg $0.00025).", icon: "◎" },
              { step: "04", title: "Track Impact", desc: "Funds release only when milestones are achieved and evidence is verified on IPFS.", icon: "📊" },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} style={{
                background: "#141820", border: "1px solid #1E2533",
                borderRadius: 16, padding: 32, position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -8, right: 16,
                  fontSize: 72, fontWeight: 900, color: "#1E2533", lineHeight: 1,
                  fontFamily: "'Space Mono', monospace",
                }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                <h3 style={{ fontSize: 20, marginBottom: 10 }}>{title}</h3>
                <p style={{ color: "#6B7280", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
