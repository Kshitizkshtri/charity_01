import { Link, useNavigate } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(10,13,18,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1E2533",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", height: 64, gap: 32 }}>
        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #C8102E, #F4A900)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 16, color: "white",
          }}>दान</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "#F9FAFB" }}>
            Nepal<span style={{ color: "#C8102E" }}>Daan</span>
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: "flex", gap: 24, marginLeft: 8 }}>
          {[
            { label: "Campaigns", to: "/campaigns" },
            { label: "Organizations", to: "/organizations" },
            { label: "About", to: "/about" },
          ].map(({ label, to }) => (
            <Link key={to} to={to} style={{
              color: "#9CA3AF", fontSize: 14, textDecoration: "none", fontWeight: 500,
              transition: "color 0.2s",
            }}
              onMouseEnter={e => e.target.style.color = "#F9FAFB"}
              onMouseLeave={e => e.target.style.color = "#9CA3AF"}
            >{label}</Link>
          ))}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <WalletMultiButton style={{
            background: "#1E2533", border: "1px solid #2D3748",
            borderRadius: 10, fontSize: 13, height: 38, padding: "0 16px",
          }} />

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to="/dashboard" style={{
                fontSize: 14, color: "#F4A900", textDecoration: "none", fontWeight: 500,
              }}>
                {user.full_name.split(" ")[0]}
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: 13 }}>
                Logout
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <Link to="/login" className="btn btn-secondary"
                style={{ padding: "8px 16px", fontSize: 13 }}>Login</Link>
              <Link to="/register" className="btn btn-primary"
                style={{ padding: "8px 16px", fontSize: 13 }}>Sign Up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
