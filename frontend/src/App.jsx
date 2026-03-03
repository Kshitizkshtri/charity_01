import { useMemo } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { clusterApiUrl } from "@solana/web3.js";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./styles/globals.css";

import { AuthProvider } from "./hooks/useAuth";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import DashboardPage from "./pages/DashboardPage";

// Lazy campaign list page (simple grid)
import { useState, useEffect } from "react";
import { getCampaigns } from "./utils/api";
import CampaignCard from "./components/CampaignCard";

function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCampaigns({ active: "all", limit: 50 })
      .then(r => setCampaigns(r.data))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        <h1 style={{ fontSize: 40, marginBottom: 40 }}>All Campaigns</h1>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 380, borderRadius: 12 }} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
            {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgsPage() {
  const [orgs, setOrgs] = useState([]);
  useEffect(() => {
    import("./utils/api").then(({ getOrganizations }) =>
      getOrganizations().then(r => setOrgs(r.data))
    );
  }, []);
  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        <h1 style={{ fontSize: 40, marginBottom: 40 }}>Verified Organizations</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24 }}>
          {orgs.map(o => (
            <div key={o.id} className="card" style={{ padding: 28 }}>
              <h3 style={{ marginBottom: 8 }}>{o.name}</h3>
              <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 16 }}>{o.description}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#6B7280" }}>{o.district}, {o.province}</span>
                <span className="badge badge-verified">✅ Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const network = process.env.REACT_APP_SOLANA_NETWORK || "devnet";
  const endpoint = useMemo(() =>
    process.env.REACT_APP_SOLANA_RPC || clusterApiUrl(network), [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>
            <BrowserRouter>
              <Navbar />
              <main>
                <Routes>
                  <Route path="/"               element={<HomePage />} />
                  <Route path="/campaigns"       element={<CampaignsPage />} />
                  <Route path="/campaigns/:id"   element={<CampaignDetailPage />} />
                  <Route path="/organizations"   element={<OrgsPage />} />
                  <Route path="/login"           element={<LoginPage />} />
                  <Route path="/register"        element={<RegisterPage />} />
                  <Route path="/dashboard/*"     element={<DashboardPage />} />
                </Routes>
              </main>
              <ToastContainer position="bottom-right" theme="dark" />
            </BrowserRouter>
          </AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
