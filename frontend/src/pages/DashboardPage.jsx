import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import { getCampaigns, getMyOrg, updateWallet } from "../utils/api";
import { lamportsToSol } from "../hooks/useCharityProgram";

export default function DashboardPage() {
  const { user } = useAuth();
  const { publicKey, connected } = useWallet();
  const [campaigns, setCampaigns] = useState([]);
  const [myOrg, setMyOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      if (user?.role === "org_admin") {
        const [campRes, orgRes] = await Promise.all([
          getCampaigns({ active: "all" }),
          getMyOrg().catch(() => ({ data: null })),
        ]);
        setCampaigns(campRes.data);
        setMyOrg(orgRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const linkWallet = async () => {
    if (!connected || !publicKey) return toast.error("Connect Phantom wallet first");
    try {
      await updateWallet(publicKey.toString());
      toast.success("Wallet linked successfully!");
    } catch (err) {
      toast.error("Failed to link wallet");
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, marginBottom: 8 }}>
            Welcome, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "#6B7280" }}>
            {user?.role === "org_admin" ? "Manage your campaigns and track donations"
             : "Track your donations and impact"}
          </p>
        </div>

        {/* Wallet banner */}
        {!user?.wallet_address && (
          <div style={{
            background: "rgba(244,169,0,0.08)", border: "1px solid rgba(244,169,0,0.25)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 32,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>🔗 Link your Phantom Wallet</div>
              <div style={{ color: "#6B7280", fontSize: 14 }}>
                Connect and link your wallet to start donating on-chain
              </div>
            </div>
            <button onClick={linkWallet} className="btn btn-saffron">
              {connected ? `Link ${publicKey?.toString().slice(0,8)}...` : "Connect Wallet First"}
            </button>
          </div>
        )}

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, alignItems: "start" }}>
          {/* Sidebar */}
          <div>
            <div className="card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "linear-gradient(135deg, #C8102E, #F4A900)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 20,
                }}>
                  {user?.full_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{user?.full_name}</div>
                  <div style={{ fontSize: 13, color: "#6B7280" }}>{user?.role?.replace("_", " ")}</div>
                </div>
              </div>

              {user?.wallet_address && (
                <div style={{
                  background: "#0D1117", borderRadius: 8, padding: 12, fontSize: 12,
                  fontFamily: "Space Mono, monospace", color: "#9CA3AF", wordBreak: "break-all",
                }}>
                  {user.wallet_address}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className="card" style={{ padding: 16 }}>
              {(user?.role === "org_admin" ? [
                { to: "/dashboard/create-campaign", label: "➕ Create Campaign" },
                { to: "/dashboard/register-org", label: "🏢 Register Organization" },
                { to: "/campaigns", label: "📋 View All Campaigns" },
              ] : [
                { to: "/campaigns", label: "🔍 Browse Campaigns" },
                { to: "/dashboard/my-donations", label: "💎 My Donations" },
              ]).map(({ to, label }) => (
                <Link key={to} to={to} style={{
                  display: "block", padding: "12px 16px", color: "#9CA3AF",
                  textDecoration: "none", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#1E2533"; e.currentTarget.style.color = "#F9FAFB"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9CA3AF"; }}
                >{label}</Link>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div>
            {/* Organization status (for org_admin) */}
            {user?.role === "org_admin" && (
              <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 style={{ marginBottom: 16 }}>Organization Status</h3>
                {myOrg ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 18 }}>{myOrg.name}</div>
                      <div style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>
                        {myOrg.district}, {myOrg.province}
                      </div>
                    </div>
                    <span className={`badge ${myOrg.is_verified ? "badge-verified" : "badge-pending"}`}>
                      {myOrg.is_verified ? "✅ Verified" : "⏳ Pending Verification"}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ color: "#6B7280" }}>No organization registered yet</p>
                    <Link to="/dashboard/register-org" className="btn btn-primary" style={{ padding: "10px 20px" }}>
                      Register Now
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Campaigns */}
            {user?.role === "org_admin" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 22 }}>Your Campaigns</h3>
                  <Link to="/dashboard/create-campaign" className="btn btn-primary" style={{ padding: "10px 20px", fontSize: 14 }}>
                    + New Campaign
                  </Link>
                </div>
                {loading ? (
                  <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
                ) : campaigns.length === 0 ? (
                  <div className="card" style={{ padding: 48, textAlign: "center" }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
                    <p style={{ color: "#6B7280" }}>No campaigns yet. Create your first one!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {campaigns.map(c => (
                      <Link key={c.id} to={`/campaigns/${c.id}`} style={{ textDecoration: "none" }}>
                        <div className="card" style={{ padding: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                              <div style={{ fontSize: 13, color: "#6B7280" }}>
                                {lamportsToSol(c.raised_lamports)} / {lamportsToSol(c.goal_lamports)} SOL raised
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 700, color: "#F4A900", fontSize: 18 }}>
                                {Math.round((c.raised_lamports / c.goal_lamports) * 100)}%
                              </div>
                              <span className={`badge ${c.is_active ? "badge-verified" : "badge-inactive"}`}>
                                {c.is_active ? "Active" : "Closed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Donor view */}
            {user?.role === "donor" && (
              <div className="card" style={{ padding: 48, textAlign: "center" }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>💎</div>
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>Start Making an Impact</h3>
                <p style={{ color: "#6B7280", marginBottom: 28, lineHeight: 1.6 }}>
                  Browse campaigns and donate with Phantom Wallet. Every transaction is
                  permanently recorded on the Solana blockchain.
                </p>
                <Link to="/campaigns" className="btn btn-saffron" style={{ padding: "14px 32px", fontSize: 16 }}>
                  Browse Campaigns →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}