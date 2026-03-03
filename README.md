<<<<<<< HEAD
# NepalDaan – Blockchain-Based Charity Donation System

> Transparent, low-cost, milestone-based donations for Nepal — powered by **Solana** (Rust + Anchor), **Node.js**, and **React.js**.

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React.js Frontend                       │
│  Phantom Wallet · Campaign UI · Donation Flow · Dashboard   │
└───────────────────────┬─────────────────────────────────────┘
                        │ REST API (Axios)
┌───────────────────────▼─────────────────────────────────────┐
│                   Node.js / Express Backend                 │
│  Auth (JWT) · Organizations · Campaigns · IPFS · MySQL      │
└───────────────────────┬─────────────────────────────────────┘
                        │ @coral-xyz/anchor  
┌───────────────────────▼─────────────────────────────────────┐
│              Solana Blockchain (Devnet / Mainnet)            │
│  Anchor Program (Rust) · PDAs · Vault Accounts · Events      │
└─────────────────────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                   IPFS via Pinata                            │
│  Campaign Images · Verification Docs · Milestone Evidence   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
charity-dapp/
├── anchor-program/            # Solana Smart Contract (Rust + Anchor)
│   ├── programs/charity/src/
│   │   └── lib.rs             ← All on-chain logic
│   ├── tests/
│   │   └── charity.ts         ← TypeScript integration tests
│   ├── Anchor.toml
│   └── Cargo.toml
│
├── backend/                   # Node.js REST API
│   └── src/
│       ├── index.js           ← Express server entry point
│       ├── middleware/
│       │   └── auth.js        ← JWT auth middleware
│       ├── models/
│       │   ├── db.js          ← MySQL connection pool
│       │   └── migrate.js     ← DB schema migration
│       └── routes/
│           ├── auth.js        ← Register / login / wallet link
│           ├── campaigns.js   ← Campaign CRUD + donations
│           ├── organizations.js ← Org registration + verification
│           └── ipfs.js        ← Pinata IPFS uploads
│
└── frontend/                  # React.js dApp
    └── src/
        ├── App.jsx            ← Router + Wallet providers
        ├── hooks/
        │   ├── useCharityProgram.js  ← Solana program interactions + PDAs
        │   └── useAuth.js            ← Auth context
        ├── components/
        │   ├── Navbar.jsx
        │   ├── CampaignCard.jsx
        │   └── DonateModal.jsx
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── CampaignDetailPage.jsx
        │   ├── AuthPages.jsx
        │   └── DashboardPage.jsx
        ├── utils/
        │   └── api.js         ← Axios API client
        └── styles/
            └── globals.css    ← Nepal-themed design system
```

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Solana CLI | ≥1.18 | `sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"` |
| Anchor CLI | 0.29.0 | `cargo install --git https://github.com/coral-xyz/anchor anchor-cli --tag v0.29.0` |
| Node.js | ≥18 | https://nodejs.org |
| MySQL | ≥8 | https://dev.mysql.com/downloads/ |
| Phantom Wallet | latest | https://phantom.app |

---

## 🚀 Setup Guide

### 1. Clone & install

```bash
git clone <your-repo>
cd charity-dapp
```

### 2. Solana Program (Smart Contract)

```bash
cd anchor-program

# Configure Solana for devnet
solana config set --url devnet

# Generate a keypair (if you don't have one)
solana-keygen new

# Airdrop SOL for deployment costs
solana airdrop 4

# Build the program
anchor build

# Deploy to devnet
anchor deploy

# Note the Program ID from output and update:
# - anchor-program/Anchor.toml → programs.devnet.charity
# - frontend/.env → REACT_APP_PROGRAM_ID
# - anchor-program/programs/charity/src/lib.rs → declare_id!(...)

# Run tests
anchor test
```

### 3. Backend

```bash
cd ../backend
cp .env.example .env
# Fill in: DB credentials, JWT_SECRET, Pinata keys, Program ID

npm install

# Create database tables
npm run migrate

# Start development server
npm run dev
# → http://localhost:5000
```

### 4. Frontend

```bash
cd ../frontend
cp .env.example .env
# Fill in: REACT_APP_PROGRAM_ID (from step 2)

npm install
npm start
# → http://localhost:3000
```

---

## 🔗 Key On-Chain Accounts (PDAs)

| Account | Seeds | Purpose |
|---------|-------|---------|
| `Platform` | `["platform"]` | Global state: fee, campaign count, total donated |
| `Platform Treasury` | `["platform_treasury"]` | Receives 2% platform fee |
| `Organization` | `["organization", authority]` | Org data: name, docs CID, verification |
| `Campaign` | `["campaign", org, id]` | Campaign state + milestones |
| `Campaign Vault` | `["campaign_vault", campaign]` | Holds donated SOL until milestones |
| `Donation Record` | `["donation", donor, campaign, total]` | Immutable donation receipt |
| `Milestone Release` | `["milestone_release", campaign, idx]` | Evidence + amounts released |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Get JWT token |
| PATCH | `/api/auth/wallet` | Link Phantom wallet |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List campaigns (filter: category, province) |
| GET | `/api/campaigns/:id` | Campaign + milestones + recent donations |
| POST | `/api/campaigns` | Create campaign (org_admin) |
| POST | `/api/campaigns/:id/donate` | Record on-chain donation |
| GET | `/api/campaigns/:id/donations` | List donations |
| POST | `/api/campaigns/:id/milestones/:idx/release` | Record milestone release |
| GET | `/api/campaigns/stats/platform` | Platform-wide stats |

### Organizations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/organizations` | List verified orgs |
| POST | `/api/organizations` | Register org |
| PATCH | `/api/organizations/:id/verify` | Admin: verify/revoke |

### IPFS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ipfs/file` | Upload image/PDF to IPFS |
| POST | `/api/ipfs/json` | Upload JSON metadata to IPFS |

---

## 🔄 Donation Flow

```
Donor                   Frontend              Solana Program         Backend
  │                         │                       │                   │
  │── Click Donate ─────────▶│                       │                   │
  │                         │── Build TX ───────────▶│                   │
  │                         │                       │── Verify campaign  │
  │── Approve in Phantom ───▶│                       │── Transfer SOL    │
  │                         │                       │── 2% → treasury   │
  │                         │                       │── 98% → vault     │
  │                         │                       │── Create PDA       │
  │                         │◀── TX Signature ───────│                   │
  │                         │── POST /donate ────────────────────────────▶│
  │                         │                       │                   │── Store in MySQL
  │                         │◀── 201 OK ─────────────────────────────────│
  │◀── Success Toast ────────│                       │                   │
```

---

## 🏛 Milestone-Based Fund Release

Funds sit in a **Campaign Vault PDA** and are only released when:

1. The organization uploads evidence (IPFS CID) of milestone completion
2. They call `release_milestone_funds` on the Solana program
3. The program verifies the milestone index and percentage
4. SOL is transferred from vault → organization wallet

**Example**: A school-rebuild campaign with 3 milestones:
- Milestone 1 (30%): Foundation complete
- Milestone 2 (40%): Walls and roof built
- Milestone 3 (30%): Interior and furnishing done

---

## 🔐 Security Features

- **Ed25519 signatures**: Every transaction signed by donor's private key
- **Proof of History**: Tamper-proof timestamps on all events
- **PDA ownership**: Only the Anchor program can modify vault accounts
- **Input validation**: Both Rust (on-chain) and Express (off-chain) validation
- **JWT + bcrypt**: Secure off-chain authentication
- **Rate limiting**: 100 requests / 15 min per IP
- **Helmet.js**: HTTP security headers

---

## 🧪 Test Accounts (Devnet)

After running `anchor test`, use these flows:

```bash
# 1. Create platform admin account on frontend
# 2. Initialize platform via Anchor CLI or tests
# 3. Register org → submit to admin for verification
# 4. Admin verifies → org creates campaign
# 5. Connect Phantom (devnet) → donate
# 6. View tx on: https://explorer.solana.com/?cluster=devnet
```

---

## 📦 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Blockchain | Solana (devnet → mainnet) |
| Smart Contracts | Rust + Anchor Framework 0.29 |
| Backend | Node.js + Express.js |
| Frontend | React.js + React Router |
| Wallet | Phantom (via @solana/wallet-adapter) |
| Database | MySQL 8 |
| Decentralized Storage | IPFS via Pinata |
| Auth | JWT + bcryptjs |

---

## 🇳🇵 Built for Nepal

This platform addresses the specific trust and transparency challenges in Nepal's charity ecosystem, with:
- Nepali geography fields (district, province)
- SOL as the donation currency (low fees vs. traditional transfers)
- Public audit trail on Solana Explorer
- IPFS-stored milestone evidence that anyone can verify
=======
# minor_789
>>>>>>> e460551bda124c431a61a835a08e06387b40ef00
