<div align="center">
  <img src="img/Civic Sense.png" alt="CivicSense" width="280" />

  # CivicSense

  **Blockchain-Verified Civic Issue Reporting Platform**

  Report civic issues. Track resolutions. Verify on-chain.

  ![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?logo=solidity)
  ![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
  ![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
  ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
  ![Ethereum](https://img.shields.io/badge/Network-Sepolia-6C5CE7?logo=ethereum)
  ![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## Git Link

- Repository: https://github.com/nishika841/CivicSense

---

## What is CivicSense?

CivicSense is a full-stack civic issue reporting platform where every complaint goes through a **3-step blockchain-verified lifecycle**:

```
User Reports Issue ──→ Admin Resolves ──→ User Confirms Resolution
     (TX #1)              (TX #2)              (TX #3)
```

Each step is recorded as a transaction on the **Ethereum Sepolia testnet**, creating a tamper-proof audit trail. Citizens can report potholes, garbage overflow, broken streetlights, and more — with photo evidence, GPS location, and AI-powered categorizations.

---

## Features

### Core
- **Issue Reporting** — Upload photos, auto-detect GPS location, AI-suggested category & severity
- **Blockchain Verification** — Every report, resolution, and confirmation is signed on-chain (Sepolia)
- **3-Step Lifecycle** — `Reported → Verified → InProgress → Resolved → Confirmed`
- **Before/After Comparison** — Side-by-side slider to compare issue vs resolution images
- **Transaction Popup** — Shows TX hash, block number, and Etherscan link after every blockchain action

### Intelligence
- **AI Category Detection** — Google Gemini 1.5 Flash auto-suggests issue category with confidence %
- **AI Severity Analysis** — Automatic severity scoring (low / medium / high / critical)
- **Duplicate Detection** — Finds similar nearby complaints before submission
- **AI Image Analysis** — Validates uploaded images for relevance

### Community
- **Voting System** — Upvote issues to increase priority
- **Impact Score** — `votes × days_pending` — higher score = higher priority
- **Comments** — Discuss issues with other citizens
- **Leaderboard** — Top reporters ranked by contribution

### Admin
- **Admin Panel** — Verify, assign, track, and resolve complaints
- **Resolution Upload** — Upload "after" images with GPS + EXIF verification
- **Analytics Dashboard** — Category breakdown, trends, resolution rates
- **Organization Portal** — Assign complaints to civic departments

### Notifications
- **Email Notifications** — Nodemailer SMTP integration
- **SMS / WhatsApp** — Twilio integration for status updates

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS, Leaflet Maps, Recharts, Lucide Icons |
| **Backend** | Node.js, Express.js, JWT Auth, Multer, Rate Limiting |
| **Database** | Supabase (PostgreSQL) |
| **Blockchain** | Solidity 0.8.20, Ethers.js v6, Hardhat, Sepolia Testnet |
| **AI** | Google Gemini 1.5 Flash (with keyword fallback) |
| **Notifications** | Nodemailer (SMTP), Twilio (SMS/WhatsApp) |

---

## Project Structure

```
CivicSense/
├── client/                     # React frontend (CRA)
│   ├── src/
│   │   ├── components/         # ComplaintCard, BlockchainTxModal, Navbar, etc.
│   │   ├── pages/              # Dashboard, ReportIssue, MapView, AdminPanel, etc.
│   │   ├── context/            # AuthContext
│   │   └── utils/              # api.js, constants.js
│   └── package.json
├── server/                     # Express backend
│   ├── controllers/            # complaint, admin, auth, verification, ai, etc.
│   ├── routes/                 # API route definitions
│   ├── middleware/             # auth (JWT), upload (Multer)
│   ├── utils/                  # blockchain.js, supabase.js, initSchema.js
│   ├── scripts/                # createAdmin.js
│   └── server.js
├── smart-contract/             # Solidity + Hardhat
│   ├── contracts/
│   │   └── CivicSense.sol      # 3-step lifecycle contract
│   ├── scripts/
│   │   └── deploy.js
│   └── hardhat.config.js
├── img/                        # Logo assets
├── .gitignore
├── LICENSE
└── README.md
```

---

## Blockchain Architecture

### Smart Contract — `CivicSense.sol`

The contract implements a 3-step complaint lifecycle with on-chain state tracking:

```solidity
enum Status { Reported, AdminResolved, Confirmed }

function reportCase(string caseId, bytes32 dataHash)   // Step 1: Citizen reports
function adminResolve(string caseId)                    // Step 2: Admin resolves
function userConfirm(string caseId)                     // Step 3: Citizen confirms
```

### Hybrid Storage Model

| Stored Off-Chain (Supabase) | Stored On-Chain (Sepolia) |
|---|---|
| User profiles, images, comments | Complaint data hash (SHA-256) |
| Votes, assignments, notifications | Report timestamp |
| Full complaint details | Resolution timestamp |
| Status history | Confirmation timestamp |
| GPS coordinates | Immutable status transitions |

### Data Flow

```
1. User submits complaint with photos + GPS
2. Backend saves to Supabase, generates SHA-256 hash
3. reportCase(id, hash) → TX signed with server wallet → Sepolia
4. TX hash + block number stored in DB, shown to user
5. Admin uploads resolution images → adminResolve(id) → TX #2
6. Reporter reviews & confirms → userConfirm(id) → TX #3
7. Case permanently closed on-chain — fully verifiable on Etherscan
```

---

## Getting Started

### Prerequisites

- **Node.js** v16+
- **Supabase** account (free tier works)
- **Alchemy** account for Sepolia RPC (free tier works)
- **Ethereum wallet** with Sepolia ETH (get from [Sepolia Faucet](https://sepoliafaucet.com))

### 1. Clone & Install

```bash
git clone https://github.com/nishika841/CivicSense.git
cd CivicSense

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Install smart contract dependencies
cd ../smart-contract && npm install
```

### 2. Configure Environment

Create `server/.env`:
```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

# Blockchain (Sepolia)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your_key
PRIVATE_KEY=your_wallet_private_key
CONTRACT_ADDRESS=your_deployed_contract_address

# Optional
GEMINI_API_KEY=your_gemini_api_key
```

Create `client/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
```

### 3. Deploy Smart Contract

```bash
cd smart-contract
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

Copy the deployed address into `server/.env` as `CONTRACT_ADDRESS`.

### 4. Create Admin User

```bash
cd server
node scripts/createAdmin.js
```

### 5. Run

```bash
# Terminal 1 — Backend
cd server && node server.js

# Terminal 2 — Frontend
cd client && npm start
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Complaints
| Method | Route | Description |
|---|---|---|
| GET | `/api/complaints` | List all complaints |
| POST | `/api/complaints` | Create complaint (+ blockchain TX) |
| GET | `/api/complaints/:id` | Get complaint details |
| POST | `/api/complaints/:id/vote` | Upvote a complaint |
| POST | `/api/complaints/:id/confirm` | Confirm resolution (+ blockchain TX) |

### Admin
| Method | Route | Description |
|---|---|---|
| POST | `/api/admin/complaints/:id/verify` | Verify complaint |
| PUT | `/api/admin/complaints/:id/status` | Update status |
| POST | `/api/admin/complaints/:id/resolve` | Resolve with images (+ blockchain TX) |

---

## Complaint Lifecycle

```
┌─────────┐     ┌──────────┐     ┌────────────┐     ┌──────────┐     ┌───────────┐
│Reported  │────→│ Verified │────→│ InProgress │────→│ Resolved │────→│ Confirmed │
│  (⛓️ TX1) │     │          │     │            │     │  (⛓️ TX2) │     │  (⛓️ TX3)  │
└─────────┘     └──────────┘     └────────────┘     └──────────┘     └───────────┘
   User            Admin            Admin             Admin            User
  reports         verifies        starts work     uploads after     confirms fix
                                                    images
```

---

## Screenshots

### Blockchain Transaction Modal
After every on-chain action, users see the TX hash, block number, and a direct link to Etherscan:

> Transaction Hash, Data Hash (SHA-256), Block Number — all copyable with one click.

### Before / After Slider
Side-by-side draggable comparison of the issue before and after resolution.

---

## Security

- **JWT Authentication** with bcrypt password hashing
- **Rate Limiting** on all API endpoints
- **CORS** configured for frontend origin
- **File Upload Limits** — max 5 images, 5MB each
- **Input Sanitization** on all user inputs
- **EXIF GPS Verification** — resolution images must be taken near the complaint location

---

## License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
  <b>Built for transparent governance</b>
</div>
#   D e p l o y m e n t   t r i g g e r  
 