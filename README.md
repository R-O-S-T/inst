# Instant

**Private crypto transfers, one tap away.**

---

## The Problem

Every on-chain transaction is public by default. Send ETH to a friend and anyone can trace the full history of both wallets. Privacy on Ethereum requires specialist knowledge, obscure tooling, and multiple manual steps. Regular users just want to send money without broadcasting their financial life to the world.

## Our Solution

Instant is a mobile wallet that gives users a choice: send publicly (normal on-chain transfer) or privately (routed through a ZK privacy layer). No seed phrases, no browser extensions -- sign in with email or social, get a wallet, and send.

Under the hood, Instant uses [Dynamic](https://www.dynamic.xyz/) embedded wallets for frictionless onboarding and the [Unlink](https://unlink.io/) ZK protocol for shielded transfers on Base Sepolia.

## Demo Flow

1. Open the app, sign in with email (Dynamic embedded wallet created automatically)
2. View your ETH balance on the Balance tab
3. Tap Send -- choose **Public** (standard on-chain tx) or **Private** (ZK-shielded via Unlink)
4. Enter a recipient address and amount, confirm
5. Check the History tab to see your transaction logged with mode label
6. Share your address or Unlink ID from the Receive tab (QR code)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile app | [React Native](https://reactnative.dev/) + [Expo SDK 54](https://expo.dev/) |
| Auth + wallets | [Dynamic SDK v4](https://www.dynamic.xyz/) (embedded wallets, email/social login) |
| On-chain | [Viem](https://viem.sh/) on [Base Sepolia](https://docs.base.org/) |
| Privacy | [Unlink SDK](https://unlink.io/) (ZK shielded transfers) |
| Backend | Express + sql.js (webhook handler, user mapping) |
| Monorepo | npm workspaces, shared TypeScript types |

## Architecture

```
+-----------------+         +------------------+         +------------------+
|                 |  viem   |                  | webhook |                  |
|   Expo Mobile   | ------> |   Base Sepolia   |         |  Express Backend |
|   (React Native)|         |   (on-chain)     |         |  (sql.js)        |
|                 |         +------------------+         +------------------+
|  Dynamic SDK    |                                             |
|  (auth/wallet)  | ---- POST /api/send-private --------------->|
|                 |                                             |
|  Unlink SDK     | <-- ZK privacy layer (stubbed) ----------->|
+-----------------+         +------------------+
                            |  Dynamic Webhook |
                            |  wallet.created  |---------> Backend stores mapping
                            +------------------+
```

**Key API routes:**

- `POST /webhooks/dynamic` -- wallet creation webhook from Dynamic
- `POST /api/send-private` -- initiate a ZK-shielded transfer via Unlink
- `GET /api/user/:walletAddress` -- fetch EVM + Unlink balances
- `GET /api/health` -- status check

## Setup

```bash
# Clone
git clone https://github.com/<your-org>/instant.git
cd instant

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Fill in your Dynamic environment ID, backend URL, etc.

# Run the mobile app (Android — requires physical device or emulator)
cd apps/mobile
npx expo prebuild --platform android
npx expo run:android

# Run the backend (separate terminal)
cd apps/backend
pnpm dev
```

**Dynamic Dashboard setup:**

1. Create a project at [app.dynamic.xyz](https://app.dynamic.xyz/)
2. Enable Email and Social login providers
3. Enable EVM embedded wallets (Base Sepolia)
4. Add a webhook pointing to `<your-backend-url>/webhooks/dynamic` for the `wallet.created` event
5. Copy your Environment ID into `.env`

## What's Built vs. Stubbed

| Status | Feature |
|--------|---------|
| Done | Auth flow (email/social via Dynamic) |
| Done | Embedded wallet creation (no seed phrase) |
| Done | On-chain ETH balance via Viem |
| Done | Public send (standard Base Sepolia tx) |
| Done | Tab UI: Balance, Send, Receive, History |
| Done | Transaction history with mode labels |
| Stubbed | Unlink private transfers (SDK integrated, ZK flow mocked) |
| Stubbed | Backend webhook processing + user DB |
| Cut | WalletConnect via Reown WalletKit |
| Cut | NFC tap-to-pay |
| Cut | ERC-7730 clear signing |

## What's Next

- **Unlink mainnet integration** -- complete the ZK transfer flow end-to-end once Unlink SDK stabilizes
- **WalletConnect** -- connect to dApps via Reown WalletKit
- **NFC transfers** -- tap phones to pre-fill recipient and amount
- **ERC-7730 clear signing** -- human-readable transaction approval
- **Multi-token support** -- USDC, DAI, and ERC-20s beyond ETH
- **Mainnet deployment** -- Base mainnet with production Dynamic environment

---

Built at ETHGlobal Cannes 2026.
