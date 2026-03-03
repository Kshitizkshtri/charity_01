import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "react-toastify";
import { recordDonation } from "../utils/api";
import { getCampaignVaultPDA } from "../hooks/useCharityProgram";
import { useCharityProgram } from "../hooks/useCharityProgram";

// You'll need to import your IDL here
// import idl from "../idl/charity.json";

export default function DonateModal({ campaign, onClose, onSuccess }) {
  const { publicKey, connected } = useWallet();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // const { donate } = useCharityProgram(idl);

  const LAMPORTS_PER_SOL = 1_000_000_000;

  const handleDonate = async () => {
    if (!connected || !publicKey) {
      return toast.error("Please connect your Phantom wallet first");
    }
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error("Enter a valid amount");
    }

    setLoading(true);
    try {
      // ── In production, call the Solana program ──
      // const campaignPDA = new PublicKey(campaign.on_chain_address);
      // const [vaultPDA] = getCampaignVaultPDA(campaignPDA);
      // const { tx } = await donate({ campaignPDA, campaignVaultPDA: vaultPDA,
      //   amountSol: amount, message });

      // ── Mock tx for demo (replace with real tx above) ──
      const mockTx = "5DemoTxSignature" + Math.random().toString(36).slice(2, 10);
      const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);
      const netLamports = Math.floor(lamports * 0.98);

      // Record in backend
      await recordDonation(campaign.id, {
        donor_wallet: publicKey.toString(),
        amount_lamports: lamports,
        net_lamports: netLamports,
        message,
        tx_signature: mockTx,
      });

      toast.success(`🎉 Donated ${amount} SOL! Tx: ${mockTx.slice(0, 12)}...`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Donation failed");
    } finally {
      setLoading(false);
    }
  };

  const presets = ["0.1", "0.5", "1", "5"];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#181E28", border: "1px solid #1E2533",
        borderRadius: 16, padding: 32, width: "100%", maxWidth: 440,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 22 }}>Donate to Campaign</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#6B7280",
            cursor: "pointer", fontSize: 20, lineHeight: 1,
          }}>✕</button>
        </div>

        <p style={{ color: "#9CA3AF", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          {campaign.title}
        </p>

        {/* Preset amounts */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {presets.map(p => (
            <button key={p} onClick={() => setAmount(p)}
              style={{
                background: amount === p ? "#C8102E" : "#1E2533",
                border: "1px solid", borderColor: amount === p ? "#C8102E" : "#2D3748",
                color: "white", borderRadius: 8, padding: "10px 4px",
                cursor: "pointer", fontSize: 14, fontWeight: 500, transition: "all 0.2s",
              }}>
              {p} SOL
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="form-group">
          <label className="form-label">Amount (SOL)</label>
          <input type="number" className="form-input" placeholder="0.00"
            min="0.01" step="0.01" value={amount}
            onChange={e => setAmount(e.target.value)} />
        </div>

        {/* Message */}
        <div className="form-group">
          <label className="form-label">Message (optional)</label>
          <textarea className="form-textarea" rows={2}
            placeholder="Leave a message of support..."
            value={message} onChange={e => setMessage(e.target.value)}
            style={{ minHeight: 60 }} />
        </div>

        {/* Fee notice */}
        {amount && (
          <div style={{
            background: "#1E2533", borderRadius: 8, padding: "12px 16px",
            marginBottom: 20, fontSize: 13, color: "#9CA3AF",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Platform fee (2%):</span>
              <span>{(parseFloat(amount || 0) * 0.02).toFixed(4)} SOL</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#F9FAFB", fontWeight: 600 }}>
              <span>Charity receives:</span>
              <span>{(parseFloat(amount || 0) * 0.98).toFixed(4)} SOL</span>
            </div>
          </div>
        )}

        {!connected && (
          <p style={{ color: "#F4A900", fontSize: 13, marginBottom: 16, textAlign: "center" }}>
            ⚠️ Connect your Phantom wallet to donate
          </p>
        )}

        <button onClick={handleDonate} disabled={loading || !amount}
          className="btn btn-saffron w-full"
          style={{ justifyContent: "center", padding: "14px", fontSize: 16 }}>
          {loading ? "Processing..." : `Donate ${amount || "0"} SOL`}
        </button>
      </div>
    </div>
  );
}
