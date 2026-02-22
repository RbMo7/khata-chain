# Solana On-Chain Implementation

## Architecture

```
Borrower/StoreOwner signs in with Phantom/Solflare (window.solana)
        ↓
Existing API route creates/updates credit in Supabase (off-chain, instant)
        ↓
Client calls lib/solana/credit-chain.ts
        ↓ (credit creation)
        anchorCreditOnChain() → Memo tx signed by store owner
        ↓ (repayment)
        sendSolPayment() → SOL transfer + Memo, signed by borrower
              Borrower wallet ───SOL──→ Store owner wallet
        ↓
tx_signature returned → POST /api/solana/record-tx → stored in Supabase
        ↓
Borrower calls POST /api/credits/[id]/confirm-repayment → credit marked paid
        ↓
Anyone can verify on Solana Explorer / via RPC
```

**What lives on-chain:**
- Credit creation: Memo inscription (credit hash) signed by store owner
- Repayment: Real SOL transfer from borrower → store owner + Memo (immutable proof)

**What stays in Supabase:** Full credit data, reputation scores, extensions, history.

---

## Task Checklist

### Phase 1 — Wallet Adapter + Memo Anchoring ✅ (implemented)

- [x] Install `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`, `@solana/wallet-adapter-wallets`
- [x] Create `contexts/SolanaProvider.tsx` — wraps app with `ConnectionProvider` + `WalletProvider` (autoConnect)
- [x] Rewrite `lib/solana/credit-chain.ts` — Memo transactions + **`sendSolPayment()`** wallet-to-wallet SOL transfer + `fetchSolPriceNPR()`
- [x] DB migration `scripts/05-solana-tx-signatures.sql` — adds `tx_signature` + `repayment_tx_signature` to `credit_entries`
- [x] API endpoint `POST /api/solana/record-tx` — validates ownership + saves tx_signature to Supabase
- [x] Create `hooks/use-on-chain-anchor.ts` — `useOnChainAnchor()` hook: `anchorCredit()`, `anchorRepayment()`, **`payWithSol()`**
- [x] Update `app/layout.tsx` — wrapped with `<SolanaProvider>`
- [x] Wire `useOnChainAnchor().anchorCredit()` in store-owner credit creation (PendingCreditsActions + PendingCreditRequests)
- [x] Wire `useOnChainAnchor().payWithSol()` in borrower repayment page — **real SOL transfer to store owner wallet**
- [x] `POST /api/credits/[id]/confirm-repayment` — borrower-side repayment confirmation endpoint
- [x] Show tx_signature + Explorer link on credit detail pages
- [x] **Removed Stripe** — all payments are now blockchain-only (SOL)

### Phase 2 — Anchor Program (next sprint)

- [ ] Initialize Anchor workspace: `anchor init programs/khata-chain`
- [ ] Write `create_credit` instruction — PDA keyed by `[b"credit", credit_id]`
  - Stores: amount, due_date_unix, borrower_pubkey, store_owner_pubkey, status
- [ ] Write `record_repayment` instruction — updates PDA status, stores amount_paid
- [ ] Write `close_credit` instruction — marks PDA as paid/closed
- [ ] Deploy program to testnet: `anchor deploy --provider.cluster testnet`
- [ ] Generate IDL and add to `lib/solana/idl/khata_chain.json`
- [ ] Replace Memo calls with Anchor program calls in `credit-chain.ts`

### Phase 3 — Reputation On-Chain (future)

- [ ] Add `anchor_reputation` instruction to Anchor program
  - PDA keyed by `[b"reputation", borrower_pubkey]`
  - Stores: score_hash (sha256 of current score + timestamp)
- [ ] Cron job commits daily reputation hash on-chain
- [ ] Add `/api/solana/verify-reputation` — cross-app verification endpoint

---

## Testnet Setup & Testing Guide

### 1. Switch wallet to Testnet

**Phantom:**
1. Open Phantom → Settings (⚙️) → Developer Settings → Testnet Mode → toggle ON
   *or* Settings → Change Network → Testnet

**Solflare:**
1. In-app network picker (top right) → Testnet

### 2. Get free testnet SOL (airdrop)

Method A — Solana CLI:
```bash
# Install CLI if not installed
sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"

# Configure to testnet
solana config set --url https://api.testnet.solana.com

# Check config
solana config get

# Airdrop 2 SOL to your wallet
solana airdrop 2 <YOUR_WALLET_ADDRESS>

# Check balance
solana balance <YOUR_WALLET_ADDRESS>
```

Method B — Web faucet:
- https://faucet.solana.com  (official)
- Paste your wallet address, select Testnet, request 1-2 SOL

### 3. Configure the app for Testnet

In your `.env`:
```env
NEXT_PUBLIC_SOLANA_NETWORK=testnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.testnet.solana.com
```

> **Note:** `devnet` and `testnet` are separate networks with separate balances.  
> The env currently points to devnet. Change it to testnet if your wallets are on testnet.

### 4. Test credit creation on-chain

1. Log in as **store owner** → Create Credit for a borrower
2. After the credit is saved in DB, a Phantom popup will appear asking to sign
3. Approve → tx_signature is stored in Supabase
4. Copy the tx signature → open https://explorer.solana.com/?cluster=testnet → paste → verify

The Memo field will contain:
```json
{"type":"credit_created","id":"<credit_id_short>","amount":5000,"due":"2026-03-22","hash":"ab12..."}
```

### 5. Test repayment on-chain (wallet-to-wallet SOL)

1. Log in as **borrower** → go to a credit → click **Repay**
2. Page fetches live SOL/NPR exchange rate from CoinGecko
3. Shows the NPR amount and the calculated SOL equivalent
4. Click **Pay ◊ X SOL** → Phantom popup to approve the transaction
5. Approve → SOL is transferred from borrower wallet to store owner wallet
6. A Memo instruction is included in the same tx (human-readable on Explorer)
7. `repayment_tx_signature` is stored in Supabase, credit marked as completed
8. Success screen shows the Explorer link

### 6. Verify a transaction

```bash
# CLI
solana confirm -v <TX_SIGNATURE> --url https://api.testnet.solana.com
```

Or: https://explorer.solana.com/tx/<TX_SIGNATURE>?cluster=testnet

### 7. Transfer SOL between your testnet accounts (to test payment flows)

```bash
# Send 0.5 SOL from one to the other
solana transfer <RECIPIENT_ADDRESS> 0.5 --from <KEYPAIR_FILE> --url https://api.testnet.solana.com

# Or via Phantom: Send → paste recipient → pick amount → confirm
```

---

## Memo Program — How It Works

We use the **SPL Memo Program** (`MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`).

A Memo instruction lets you attach a UTF-8 string to any Solana transaction. It:
- Is signed by the transaction signer (proof of authorization)
- Is permanently stored on-chain (immutable)
- Is human-readable on Solana Explorer
- Costs ~5000 lamports (~$0.001) per transaction

The memo we write:
```
KHATACHAIN:v1:<type>:<sha256_hash_of_credit_data>
```

The full credit data stays in Supabase. The hash on-chain is the proof-of-existence and tamper-detection.

---

## Anchor Program (Phase 2 Preview)

```rust
// programs/khata-chain/src/lib.rs
#[program]
pub mod khata_chain {
    pub fn create_credit(ctx: Context<CreateCredit>, params: CreditParams) -> Result<()> { ... }
    pub fn record_repayment(ctx: Context<RecordRepayment>, amount: u64) -> Result<()> { ... }
    pub fn close_credit(ctx: Context<CloseCredit>) -> Result<()> { ... }
}

#[account]
pub struct CreditEntry {
    pub credit_id: [u8; 32],       // UUID as bytes
    pub borrower: Pubkey,
    pub store_owner: Pubkey,
    pub amount: u64,               // in smallest currency unit
    pub due_date: i64,             // unix timestamp
    pub amount_paid: u64,
    pub status: CreditStatus,      // Active, Paid, Overdue, Cancelled
    pub created_at: i64,
    pub bump: u8,
}
```

To initialize Anchor locally:
```bash
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
anchor init programs/khata-chain --no-git
cd programs/khata-chain && anchor build
anchor deploy --provider.cluster testnet
```

---

## Explorer Links (Testnet)

- Account: `https://explorer.solana.com/address/<PUBKEY>?cluster=testnet`
- Transaction: `https://explorer.solana.com/tx/<SIGNATURE>?cluster=testnet`
- Program (Phase 2): `https://explorer.solana.com/address/<PROGRAM_ID>?cluster=testnet`
