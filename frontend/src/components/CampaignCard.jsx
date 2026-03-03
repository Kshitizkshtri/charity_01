import { Link } from "react-router-dom";
import { lamportsToSol } from "../hooks/useCharityProgram";

const PINATA_GW = process.env.REACT_APP_PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export default function CampaignCard({ campaign }) {
  const {
    id, title, description, image_ipfs_cid, goal_lamports,
    raised_lamports, deadline, category, org_name, donor_count,
  } = campaign;

  const pct = Math.min(100, Math.round((raised_lamports / goal_lamports) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(deadline) - Date.now()) / 86400000));
  const imgUrl = image_ipfs_cid ? `${PINATA_GW}${image_ipfs_cid}` : null;

  const categoryColors = {
    disaster_relief: "#C8102E", education: "#3B82F6", health: "#22C55E",
    poverty: "#F4A900", environment: "#10B981", other: "#6B7280",
  };

  return (
    <Link to={`/campaigns/${id}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Image */}
        <div style={{
          height: 180, background: imgUrl ? `url(${imgUrl}) center/cover` : "#1E2533",
          position: "relative", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {!imgUrl && (
            <span style={{ fontSize: 48 }}>
              {category === "disaster_relief" ? "🆘" :
               category === "education" ? "📚" :
               category === "health" ? "🏥" : "🤝"}
            </span>
          )}
          <span className="badge" style={{
            position: "absolute", top: 12, left: 12,
            background: categoryColors[category] + "22",
            color: categoryColors[category], border: `1px solid ${categoryColors[category]}44`,
          }}>
            {category?.replace("_", " ")}
          </span>
        </div>

        {/* Body */}
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <div>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>{org_name}</div>
            <h3 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3 }}>{title}</h3>
            <p className="text-muted text-sm" style={{ marginTop: 6, lineHeight: 1.5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {description}
            </p>
          </div>

          {/* Progress */}
          <div className="mt-auto">
            <div className="progress-track" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span><span style={{ color: "#C8102E", fontWeight: 700 }}>{pct}%</span>
                <span className="text-muted"> funded</span></span>
              <span className="text-muted">{daysLeft}d left</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{lamportsToSol(raised_lamports)} SOL raised</span>
              <span className="text-muted">{donor_count || 0} donors</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
