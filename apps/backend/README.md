# Instant Backend

Express API server for the Instant wallet app. Handles user registration via Dynamic webhooks, Unlink address registration, and gift link lifecycle (create, claim, auto-expiry refund).

## Quick start

```bash
npm install
cp .env.example .env   # fill in values
npm run dev             # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm start` | Start for production |
| `npx tsx --test src/tests/*.test.ts` | Run all tests |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3000) |
| `DYNAMIC_WEBHOOK_SECRET` | Yes | HMAC secret for verifying Dynamic webhook signatures |
| `EVM_PRIVATE_KEY` | Yes | Private key for the EVM wallet used by Unlink SDK |
| `RPC_URL` | No | Base Sepolia RPC URL (default: https://sepolia.base.org) |
| `UNLINK_API_KEY` | Yes | API key for Unlink staging API |
| `GIFT_BASE_URL` | No | Deep link base URL for gift claim links (default: https://app.example.com/claim/) |
| `GIFT_EXPIRY_MS` | No | Milliseconds before an unclaimed gift is auto-refunded (default: 300000 = 5 min) |
| `LOG_LEVEL` | No | Set to `debug` for verbose logging |

## API routes

### Health

```
GET /api/health
-> { status: "ok", timestamp: number }
```

### Users

```
GET /api/user/:walletAddress
-> { evmAddress, evmBalance, unlinkAddress }

PUT /api/user/:walletAddress/unlink
<- { unlinkAddress: "unlink1..." }
-> { success: true }
```

### Gift links

```
POST /api/gift
<- { senderAddress, amount, token }
-> { claimCode, claimUrl, giftAddress }

GET /api/gift/:claimCode
-> { amount, token, status, createdAt }

POST /api/gift/:claimCode/claim
<- { receiverAddress }
-> { success: true }
```

### Webhooks

```
POST /webhooks/dynamic
<- UserCreateWebhookPayload (raw body, HMAC verified)
-> { received: true }
```

## Gift link flow

1. Sender calls `POST /api/gift` -- backend generates a throwaway Unlink wallet and returns its address
2. Sender's app transfers funds to the gift address via `unlink.transfer()` (client-side)
3. Sender shows a QR code containing the claim URL (deep link with claim code + gift mnemonic)
4. Receiver scans QR, installs app, signs up via Dynamic
5. Receiver's app calls `POST /api/gift/:code/claim` to mark as claimed
6. Receiver's app imports the gift wallet mnemonic from the deep link and sweeps funds to their own Unlink wallet (client-side)

**Auto-expiry:** Unclaimed gifts are automatically refunded to the sender after `GIFT_EXPIRY_MS` (default 5 minutes for demo). A periodic check runs every 60 seconds, transfers funds from the gift wallet back to the sender's Unlink address, and marks the gift as `expired`.

## Architecture

```
src/
  index.ts              Express entry point
  routes/
    gift.ts             Gift link CRUD (create, metadata, claim)
    user.ts             User lookup + Unlink address registration
    webhook.ts          Dynamic wallet.created webhook handler
  services/
    db.ts               SQLite (sql.js) -- users + gifts tables
    unlink.ts           Unlink SDK wrapper (gift wallet ops only)
  middleware/
    webhookVerify.ts    HMAC-SHA256 signature verification
    errorHandler.ts     Global error handler
  utils/
    logger.ts           Timestamped console logger
  tests/
    db.test.ts          Database CRUD tests
    unlink-structure.test.ts  SDK + export verification
    gift-routes.test.ts       Gift endpoint HTTP tests
    phase4-migration.test.ts  User endpoint + Unlink registration tests
```

## Deploy

Railway-ready via `Procfile`:

```
web: npm start
```

SQLite database is persisted to `data/wallet.db`.
