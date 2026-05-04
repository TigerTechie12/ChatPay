# ChatPay

A full-stack digital payments platform with end-to-end encrypted chat, QR-based merchant payments, P2P wallet transfers, and async withdrawal processing.

---

## What it does

- **Users** can add money to their wallet, send money to other users by phone number, pay merchants by scanning QR codes, withdraw funds, and chat securely with other users
- **Merchants** sign in via Google OAuth, generate static or amount-locked QR codes for checkout, track incoming payments, and request payouts to their bank account
- **Chat** between users is end-to-end encrypted using NaCl box encryption — the server never sees plaintext messages

---

## Architecture

```
ChatPay/
├── frontend/my-app        # Next.js 16 frontend (users + merchants)
├── user-app               # User auth & wallet API       :3000
├── merchant-app           # Merchant API                 :3006
├── chat-server            # Chat HTTP + WebSocket        :3001 / :3003
├── bank-webhook           # Stripe webhook listener
├── withdrawal-service     # Async payout queue (BullMQ)
└── packages/
    ├── db                 # Shared Prisma client (PostgreSQL)
    ├── common             # Shared utilities
    └── middleware         # Shared JWT auth middleware
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 (Pages Router) | Framework |
| React 19 | UI |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| shadcn/ui | Component library |
| TweetNaCl (`tweetnacl`) | E2E encryption for chat |
| Axios | HTTP client |
| WebSocket (`ws`) | Real-time chat |
| `qrcode` | QR code scanning/generation |
| Lucide React | Icons |

### Backend Services
| Service | Tech | Responsibility |
|---|---|---|
| `user-app` | Node.js, Prisma | Signup/signin, wallet balance, P2P transfers, OnRamp transactions |
| `merchant-app` | Express 5, JWT, Redis | Google OAuth, QR generation, merchant payments, Razorpay/Stripe payouts |
| `chat-server` | Express 5, WS, Redis | Conversation management, message relay, public key exchange |
| `bank-webhook` | Express 5, Stripe | Listens for bank/Stripe payment confirmations, updates OnRamp status |
| `withdrawal-service` | BullMQ, Redis, Razorpay | Processes withdrawal requests asynchronously via job queue |

### Infrastructure
| Technology | Purpose |
|---|---|
| PostgreSQL | Primary database |
| Prisma 7 | ORM + migrations (shared via `chatpay-db` package) |
| Redis | Pub/Sub for chat relay, BullMQ job queue for withdrawals |
| Razorpay | Indian payment gateway (payouts) |
| Stripe | International payment gateway (webhooks) |

---

## Database Models (Prisma)

- **User** — email, password, phone number, wallet balance, NaCl public key for chat
- **Merchant** — Google OAuth, merchant balance, bank account details
- **Balance / MerchantBalance** — wallet amounts with locked funds for in-flight transactions
- **OnRampTransaction** — money added to wallet (Stripe/bank)
- **OffRampTransaction** — withdrawals to bank (Razorpay)
- **p2pTransfer** — wallet-to-wallet transfers between users
- **MerchantPayment** — QR scan payments from users to merchants
- **QRCode** — merchant-generated codes with optional amount lock
- **Conversation / ConversationParticipant / Message** — E2E encrypted chat

---

## Features

### User
- Email + password signup/signin with JWT
- Add money to wallet (OnRamp via Stripe)
- Send money to another user by phone number (P2P)
- Scan merchant QR code to pay
- Withdraw funds to bank (async via Razorpay + BullMQ queue)
- End-to-end encrypted chat with any other user

### Merchant
- Google OAuth signup/signin (auto-registers on first login)
- Generate QR codes — open-amount or fixed-amount for counter checkout
- Dashboard showing incoming payments and balance
- Request payout to registered bank account
- Settings for bank account details

### Chat (E2E Encryption)
- Each user has a NaCl keypair generated on first use, stored in `localStorage`
- Public key is uploaded to the server; private key never leaves the device
- Messages are encrypted with `nacl.box` (X25519 + XSalsa20-Poly1305) before sending
- WebSocket server relays ciphertext only — plaintext is never visible server-side

---

## Getting Started

### Prerequisites
- Node.js 20.9+
- PostgreSQL
- Redis

### Environment Variables

Each service needs its own `.env`. Key variables:

**user-app**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

**merchant-app**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
REDIS_URL=...
```

**chat-server**
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=...
```

**bank-webhook**
```
STRIPE_WEBHOOK_SECRET=...
DATABASE_URL=postgresql://...
```

**withdrawal-service**
```
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
REDIS_URL=...
DATABASE_URL=postgresql://...
```

**frontend (`frontend/my-app/.env.local`)**
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_CHAT_WS_URL=ws://localhost:3003
```

### Run locally

```bash
# Install shared packages first
cd packages/db && npm install
cd packages/common && npm install
cd packages/middleware && npm install

# Start each service
cd user-app && npm install && npm run dev          # :3000
cd merchant-app && npm install && npm run dev      # :3006
cd chat-server && npm install && npm run dev       # :3001 + :3003
cd bank-webhook && npm install && npm run dev
cd withdrawal-service && npm install && npm run dev

# Start frontend
cd frontend/my-app && npm install && npm run dev  # :3000 → use a different port if conflict
```

---

## Deployment

The frontend is deployed on **Vercel** with Root Directory set to `frontend/my-app`.

Backend services are independent Node.js apps and can be deployed to any platform (Railway, Render, EC2, etc.) — each as a separate service pointing to the shared PostgreSQL database.
