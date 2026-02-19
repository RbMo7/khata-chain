# KhataChain - Architecture & Structure Documentation

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        KhataChain MVP                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │   Kirana Store   │         │   Store Owner    │             │
│  │   (Lender)       │◄───────►│   Dashboard      │             │
│  │                  │         │   (Next.js)      │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │                            │                       │
│           │ Solana Program Call        │ View Borrower Data    │
│           │ (Create Credit Entry)      │                       │
│           ▼                            │                       │
│  ┌─────────────────────────────────┐  │                       │
│  │    SOLANA BLOCKCHAIN            │  │                       │
│  │                                 │  │                       │
│  │  ┌─────────────────────────┐   │  │                       │
│  │  │  Smart Contract         │   │  │                       │
│  │  │  (Anchor Program)       │   │  │                       │
│  │  │  - BorrowerAccount      │   │  │                       │
│  │  │  - CreditEntryAccount   │   │  │                       │
│  │  │  - ReputationData       │   │  │                       │
│  │  │  - SBT Mint/Update      │   │  │                       │
│  │  └─────────────────────────┘   │  │                       │
│  │                                 │  │                       │
│  │  ┌─────────────────────────┐   │  │                       │
│  │  │  Soulbound Token Mint   │   │  │                       │
│  │  │  (Reputation NFT)       │   │  │                       │
│  │  │  - NonTransferable      │   │  │                       │
│  │  │  - Metadata Updates     │   │  │                       │
│  │  └─────────────────────────┘   │  │                       │
│  │                                 │  │                       │
│  └────────────┬────────────────────┘  │                       │
│               │ Emit Events           │                       │
│               │ On-Chain Data         │                       │
│               ▼                       │                       │
│  ┌─────────────────────────────────┐  │                       │
│  │    SUPABASE (Indexing)          │  │                       │
│  │                                 │  │                       │
│  │  - Borrower profiles (read)     │  │                       │
│  │  - Credit history (read)        │  │                       │
│  │  - Reputation snapshots (read)  │  │                       │
│  │  - Event logs                   │  │                       │
│  └────────────┬────────────────────┘  │                       │
│               │                        │                       │
│               │ Query & Display        │                       │
│               └───────────────────────►│                       │
│                                        ▼                       │
│                                  ┌──────────────┐              │
│                                  │  Store Owner  │              │
│                                  │  Views Data  │              │
│                                  └──────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Smart Contract Architecture

### 2.1 Program ID & Account Structure

The Anchor program will derive accounts using **Program Derived Addresses (PDAs)** to ensure deterministic, unique accounts for each borrower and credit entry.

### 2.2 PDAs Structure

```
Borrower Account PDA:
  Seeds: ["borrower", borrower_pubkey]
  Program: KhataChain Program
  Size: ~256 bytes

Credit Entry Account PDA (per transaction):
  Seeds: ["credit_entry", borrower_pubkey, nonce/timestamp]
  Program: KhataChain Program
  Size: ~256 bytes

Reputation Data Account PDA:
  Seeds: ["reputation", borrower_pubkey]
  Program: KhataChain Program
  Size: ~128 bytes

SBT Mint Account:
  Derived from Metaplex Program
  NonTransferable Extension enabled
  Seeds: ["reputation_sbt", borrower_pubkey]
```

### 2.3 Account Structs

#### BorrowerAccount
```
Fields:
  - borrower_pubkey: Pubkey (the borrower's wallet)
  - store_owner_pubkey: Pubkey (the kirana store owner)
  - first_credit_timestamp: i64
  - total_credits_received: u64 (in lamports/smallest unit)
  - total_credits_repaid: u64
  - is_active: bool
  - sbt_mint: Pubkey (points to their SBT token mint)
  - created_at: i64
  - updated_at: i64
  - bump: u8 (for PDA derivation)
```

#### CreditEntryAccount
```
Fields:
  - borrower_pubkey: Pubkey
  - store_owner_pubkey: Pubkey
  - credit_amount: u64
  - repayment_amount: u64 (can be partial)
  - is_repaid: bool
  - credit_date: i64 (timestamp)
  - repayment_date: i64 (null if not repaid)
  - description: String (max 256 chars, what was bought)
  - nonce: u64 (for uniqueness)
  - bump: u8
```

#### ReputationData
```
Fields:
  - borrower_pubkey: Pubkey
  - reputation_score: u32 (0-100 scale)
  - payment_history_score: u32
  - reliability_score: u32
  - total_transactions: u32
  - on_time_repayments: u32
  - late_repayments: u32
  - total_repayment_days: u64 (for average calculation)
  - last_updated: i64
  - bump: u8
```

---

### 2.4 Instruction List

#### 1. `initialize_borrower`
**Purpose:** Create a new BorrowerAccount and mint the SBT token.

**Input Params:**
- `borrower`: The borrower's wallet pubkey
- `store_owner`: The store owner's wallet pubkey

**Accounts Required:**
- Borrower wallet (signer)
- Borrower account (PDA, init)
- Reputation data account (PDA, init)
- SBT mint (PDA, init)
- Metadata account (via Metaplex CPI)
- SPL Token program
- Associated Token Program
- Metaplex Metadata Program
- System program

**On-Chain Logic:**
1. Verify borrower is a signer
2. Create BorrowerAccount PDA
3. Create ReputationData account (initial score: 50/100)
4. Mint SBT token with NonTransferable extension
5. Set metadata with initial reputation score

**Validation Checks:**
- Borrower account must not already exist
- Store owner pubkey must not be zero

---

#### 2. `record_credit_entry`
**Purpose:** Record a new credit transaction (store gives credit to borrower).

**Input Params:**
- `credit_amount`: u64 (amount in lamports)
- `description`: String (item description)

**Accounts Required:**
- Store owner wallet (signer)
- Borrower account (mut)
- Credit entry account (PDA, init)
- Reputation data account (mut)
- System program

**On-Chain Logic:**
1. Verify store owner is a signer
2. Verify borrower account exists
3. Create CreditEntryAccount with nonce
4. Update BorrowerAccount total_credits_received
5. Emit CreditRecorded event

**Validation Checks:**
- Store owner matches borrower's store_owner_pubkey
- Credit amount > 0
- Description not empty

---

#### 3. `record_repayment`
**Purpose:** Record a repayment (borrower pays back store).

**Input Params:**
- `credit_entry_nonce`: u64
- `repayment_amount`: u64

**Accounts Required:**
- Borrower wallet (signer)
- Credit entry account (mut)
- Borrower account (mut)
- Reputation data account (mut)
- System program

**On-Chain Logic:**
1. Verify borrower is a signer
2. Find credit entry by nonce
3. Verify repayment_amount <= credit_amount
4. Update CreditEntryAccount repayment_amount
5. Update BorrowerAccount total_credits_repaid
6. Calculate reputation score update
7. Update ReputationData
8. Emit RepaymentRecorded event

**Validation Checks:**
- Credit entry exists
- Repayment amount > 0
- Repayment amount ≤ outstanding balance
- Credit entry not already fully repaid

---

#### 4. `update_sbt_metadata`
**Purpose:** Update the SBT metadata with the latest reputation score (via Metaplex CPI).

**Input Params:**
- None (derives reputation score from on-chain ReputationData)

**Accounts Required:**
- Borrower account
- Reputation data account
- SBT mint
- Metadata account (mut)
- Metaplex Metadata Program
- System program

**On-Chain Logic:**
1. Read current ReputationData
2. Call Metaplex token_metadata::update_v2 instruction
3. Update metadata URI/attributes with new reputation score
4. Emit MetadataUpdated event

**Validation Checks:**
- Reputation data account exists
- Metadata account owned by Metaplex program

---

### 2.5 Event Emissions

```
Event: BorrowerInitialized
  - borrower_pubkey
  - store_owner_pubkey
  - sbt_mint
  - initial_reputation_score
  - timestamp

Event: CreditRecorded
  - borrower_pubkey
  - store_owner_pubkey
  - credit_amount
  - description
  - timestamp

Event: RepaymentRecorded
  - borrower_pubkey
  - credit_entry_nonce
  - repayment_amount
  - new_reputation_score
  - timestamp

Event: MetadataUpdated
  - borrower_pubkey
  - new_reputation_score
  - timestamp
```

---

## 3. Soulbound Reputation NFT Design

### 3.1 Token Specifications

**Token Name:** KhataChain Reputation Badge (Per Borrower)
**Mint Authority:** KhataChain Program (controlled)
**Freeze Authority:** KhataChain Program (optional, for safety)
**Decimals:** 0 (NFT)
**Supply:** 1 (one per borrower)
**Token Extensions:**
- **NonTransferable**: Prevents selling/transferring the token
- **Metadata**: Standard SPL Token Metadata

### 3.2 Mint Logic

1. **On `initialize_borrower`:**
   - Mint exactly 1 token to borrower's associated token account
   - Token cannot be transferred (NonTransferable extension)
   - Borrower cannot burn or discard reputation token

2. **Metadata Initialization:**
   - Token name: `KhataChain Reputation - Borrower {borrower_pubkey truncated}`
   - Symbol: `KREPN`
   - Initial image URI: Points to IPFS/Arweave image with score 50/100
   - Attributes:
     - reputation_score: 50
     - payment_history: "new"
     - reliability_tier: "bronze"

### 3.3 Metadata Update Strategy

**Update Trigger:** When ReputationData score changes significantly (every repayment calculation).

**Update Method:** Cross-program invocation (CPI) to Metaplex token_metadata program.

**Metadata Fields Updated:**
```
{
  "name": "KhataChain Reputation - {borrower_short}",
  "symbol": "KREPN",
  "description": "Decentralized credit reputation token",
  "image": "ipfs://{reputation_image_cid}",
  "attributes": [
    { "trait_type": "reputation_score", "value": <0-100> },
    { "trait_type": "total_transactions", "value": <count> },
    { "trait_type": "on_time_repayments", "value": <count> },
    { "trait_type": "payment_history", "value": "<excellent|good|fair|poor>" },
    { "trait_type": "reliability_tier", "value": "<gold|silver|bronze|new>" }
  ]
}
```

### 3.4 NonTransferable Extension Usage

- **When Minting:** Enable NonTransferable extension to prevent token transfers
- **Why:** Prevents reputation trading/selling; ensures reputation is tied to the individual
- **Trade-off:** User cannot transfer even to own wallets; must re-initialize if they lose wallet access (future recovery mechanism)

---

## 4. Next.js Frontend Structure

### 4.1 App Router Structure

```
app/
├── layout.tsx (root layout, wallet provider setup)
├── page.tsx (landing/home page)
├── borrower/
│   ├── layout.tsx
│   ├── page.tsx (borrower dashboard)
│   └── history/
│       └── page.tsx (credit history view)
├── store-owner/
│   ├── layout.tsx
│   ├── page.tsx (store owner dashboard)
│   ├── add-borrower/
│   │   └── page.tsx (form to initialize new borrower)
│   └── credit-entry/
│       └── [nonce]/
│           └── page.tsx (view/manage credit entry)
├── reputation/
│   ├── page.tsx (public reputation lookup)
│   └── [borrower]/
│       └── page.tsx (view single borrower reputation)
├── api/
│   ├── borrower/
│   │   ├── route.ts (GET borrower data from Supabase)
│   │   └── [pubkey]/
│   │       └── route.ts (GET single borrower)
│   ├── credit-entries/
│   │   └── route.ts (GET credit entries from Supabase)
│   └── reputation/
│       └── [borrower]/
│           └── route.ts (GET reputation score)
└── components/
    ├── WalletProvider.tsx
    ├── SolanaWalletButton.tsx
    ├── BorrowerCard.tsx
    ├── CreditEntryForm.tsx
    ├── ReputationDisplay.tsx
    └── ...
```

### 4.2 Components List

**Authentication & Wallet:**
- `WalletProvider`: Wraps app with Solana wallet context
- `SolanaWalletButton`: Connect/disconnect wallet UI
- `RequireWallet`: Guard component for authenticated pages

**Borrower Pages:**
- `BorrowerDashboard`: Shows borrower's credit history, reputation
- `BorrowerHistoryTable`: Lists all credit transactions
- `BorrowerReputationCard`: Displays current score and tier

**Store Owner Pages:**
- `StoreOwnerDashboard`: Lists all borrowers, credit entries
- `BorrowerBrowserTable`: Searchable list of borrowers
- `AddBorrowerForm`: Initialize new borrower (calls smart contract)
- `CreditEntryForm`: Record new credit transaction
- `RepaymentForm`: Record repayment

**Shared Components:**
- `ReputationBadge`: Shows score, tier, icon
- `SBTDisplay`: Shows NFT metadata
- `TransactionList`: Generic transaction table
- `LoadingSpinner`, `ErrorBoundary`, etc.

### 4.3 Wallet Integration

**Library:** `@solana/wallet-adapter-react`

**Setup in layout.tsx:**
1. Create WalletProvider wrapper with available wallets
2. Wrap entire app with wallet context
3. Use `useWallet()` hook in components to access wallet state

**Key Hooks:**
- `useWallet()`: Access connected wallet pubkey, send transaction
- `useConnection()`: Access Solana RPC connection
- `useAnchorWallet()`: Get wallet in Anchor-compatible format

---

## 5. Supabase Indexing Strategy

### 5.1 Database Schema (Read-Only Indexing)

The Supabase database is **read-only** from the application perspective. It is populated by an off-chain indexer that listens to Solana events.

#### Tables

**borrowers**
```sql
id: uuid (primary key)
borrower_pubkey: varchar (unique, indexed)
store_owner_pubkey: varchar (indexed)
sbt_mint: varchar
total_credits_received: bigint
total_credits_repaid: bigint
is_active: boolean
created_at: timestamp
updated_at: timestamp
```

**credit_entries**
```sql
id: uuid (primary key)
borrower_pubkey: varchar (indexed)
store_owner_pubkey: varchar
credit_amount: bigint
repayment_amount: bigint (default 0)
is_repaid: boolean (default false)
description: text
credit_date: timestamp
repayment_date: timestamp (nullable)
created_at: timestamp
updated_at: timestamp
```

**reputation_snapshots**
```sql
id: uuid (primary key)
borrower_pubkey: varchar (unique, indexed)
reputation_score: integer (0-100)
payment_history_score: integer
reliability_score: integer
total_transactions: integer
on_time_repayments: integer
late_repayments: integer
reliability_tier: varchar (gold|silver|bronze|new)
last_updated: timestamp
```

**event_logs** (for debugging/audit)
```sql
id: uuid (primary key)
event_type: varchar (BorrowerInitialized|CreditRecorded|RepaymentRecorded|MetadataUpdated)
borrower_pubkey: varchar (indexed)
event_data: jsonb
timestamp: timestamp
block_height: bigint
```

### 5.2 Indexing Architecture

**Off-Chain Indexer** (not part of MVP scope, but documented):
- Listens to KhataChain program events via Solana RPC
- On BorrowerInitialized event → Insert into `borrowers` table
- On CreditRecorded event → Insert into `credit_entries` table
- On RepaymentRecorded event → Update `credit_entries` and `reputation_snapshots` table
- On MetadataUpdated event → Update `reputation_snapshots` table

### 5.3 API Query Patterns (Next.js Backend)

**GET /api/borrower/[pubkey]**
- Query: `SELECT * FROM borrowers WHERE borrower_pubkey = $1`
- Returns: Borrower profile with credit stats

**GET /api/credit-entries?borrower=[pubkey]**
- Query: `SELECT * FROM credit_entries WHERE borrower_pubkey = $1 ORDER BY credit_date DESC`
- Returns: List of credit transactions

**GET /api/reputation/[borrower]**
- Query: `SELECT * FROM reputation_snapshots WHERE borrower_pubkey = $1`
- Returns: Current reputation score and breakdown

**GET /api/store-owner/borrowers?store=[pubkey]**
- Query: `SELECT * FROM borrowers WHERE store_owner_pubkey = $1`
- Returns: All borrowers for a specific store owner

---

## 6. Event Flow Diagrams

### 6.1 Borrower Initialization Flow

```
Store Owner                 Solana Program              Supabase Indexer            Frontend
    │                           │                            │                        │
    ├──────────────────────────►│ initialize_borrower        │                        │
    │    (tx with borrower      │ (instruction)              │                        │
    │     wallet, pubkey)       │                            │                        │
    │                           │                            │                        │
    │                           ├─ Create BorrowerAccount    │                        │
    │                           ├─ Mint SBT token           │                        │
    │                           ├─ Set Metadata (score 50)  │                        │
    │                           │                            │                        │
    │                           ├───► Emit BorrowerInitialized event                 │
    │                           │     (to blockchain)        │                        │
    │                           │                            │                        │
    │◄──────────────────────────┤ Success / TxID            │                        │
    │                           │                            │                        │
    │                           │                            │                        │
    │                           │                            ├─► Listen to event     │
    │                           │                            │   Parse PDA data      │
    │                           │                            │   Insert into DB      │
    │                           │                            │                        │
    │                           │                            │   (borrowers table)   │
    │                           │                            │                        │
    │                           │                            │───────────────────────►│
    │                           │                            │ API Response           │
    │                           │                            │ Borrower created ✓     │
```

### 6.2 Credit Entry & Repayment Flow

```
Store Owner              Borrower              Solana Program        Supabase           Frontend
    │                      │                        │                  │                  │
    ├──────────────────────────────────────────────►│ record_credit     │                  │
    │ "Buy 500 flour"                               │ _entry()          │                  │
    │ (amount: 5000 lamports)                       │                   │                  │
    │                                               │                   │                  │
    │                                               ├─ Create           │                  │
    │                                               │  CreditEntry PDA  │                  │
    │                                               ├─ Emit event       │                  │
    │                                               │                   │                  │
    │◄──────────────────────────────────────────────┤ Success           │                  │
    │                                               │                   │                  │
    │  [Days pass, borrower pays back]              │                   │                  │
    │                                               │                   │                  │
    │                           ├──────────────────►│ record_repayment  │                  │
    │                           │ (amount: 5000)    │ (full repay)      │                  │
    │                           │                   │                   │                  │
    │                           │                   ├─ Update Credit    │                  │
    │                           │                   │  Entry is_repaid  │                  │
    │                           │                   ├─ Calculate new    │                  │
    │                           │                   │  reputation score │                  │
    │                           │                   ├─ Emit event       │                  │
    │                           │                   │                   │                  │
    │                           │◄──────────────────┤ Success           │                  │
    │                           │                   │                   │                  │
    │                           │                   │                   ├─ Sync data       │
    │                           │                   │                   │ Update tables    │
    │                           │                   │                   │                  │
    │                           │                   │                   ├─────────────────►│
    │                           │                   │                   │ Reputation now  │
    │                           │                   │                   │ 75/100 ✓         │
```

### 6.3 Metadata Update Flow

```
On-Chain Reputation Update              Solana Program              Frontend
            │                                 │                         │
            ├─ RepaymentRecorded event        │                         │
            │ (reputation_score updated)      │                         │
            │                                 │                         │
            └──────────────────────────────► │ update_sbt_metadata()   │
                                             │                         │
                                             ├─ Read ReputationData    │
                                             │                         │
                                             ├─ Call Metaplex CPI     │
                                             │  (token_metadata update)│
                                             │                         │
                                             ├─ Update attributes     │
                                             │  (score, tier, etc.)    │
                                             │                         │
                                             ├─ Emit MetadataUpdated   │
                                             │ event                   │
                                             │                         │
                                             ├────────────────────────►│
                                             │                         │
                                             │                         │ NFT metadata
                                             │                         │ reflects new
                                             │                         │ score ✓
```

---

## 7. Security Considerations

### 7.1 Smart Contract Security

**PDA Derivation Safety:**
- All account PDAs use borrower_pubkey as seed
- Ensures only one borrower account per wallet
- Prevents collision attacks via bump seed validation

**Signer Verification:**
- All mutable instruction checks for explicit signer requirement
- `record_credit_entry`: Only store owner can record credit
- `record_repayment`: Only borrower can record repayment
- `initialize_borrower`: Only borrower can initialize own account

**NonTransferable Token:**
- Prevents reputation token from being sold/transferred
- Ties reputation score permanently to borrower
- Stops reputation "laundering" or gaming via token transfers

**Input Validation:**
- Credit amount must be > 0
- Description length bounded (max 256 chars)
- Repayment amount must be ≤ outstanding balance
- Store owner pubkey cannot be zero

**Instruction Logic Safeguards:**
- CreditEntry can only be marked repaid once
- ReputationData updates only after validation
- Metadata CPI failures don't break transaction (non-critical)

### 7.2 Frontend Security

**Wallet Connection:**
- Use standard @solana/wallet-adapter-react
- Never store private keys in browser
- Verify all transactions before signing

**API Layer:**
- Supabase read-only tables (no direct write access from frontend)
- Validate pubkeys match connected wallet
- Rate limiting on API endpoints (future enhancement)

**Data Integrity:**
- Frontend verifies on-chain data matches Supabase index
- If mismatch detected, re-fetch from blockchain

### 7.3 Indexing Security

**Off-Chain Indexer:**
- Verify event signatures before indexing
- Use RPC endpoint with rate limiting
- Maintain transaction log for audit
- Regular validation of DB state against on-chain

---

## 8. Explicit NON-GOALS (Scope Control)

**What KhataChain MVP does NOT include:**

### ❌ DeFi Features
- No lending pools
- No interest calculations
- No collateral mechanisms
- No swap/DEX integration
- No staking or yield farming

### ❌ Complex Identity System
- No KYC/AML integration
- No multi-signature accounts
- No hierarchical wallet management
- No custody solutions

### ❌ Off-Chain Reputation Logic
- No machine learning models
- No complex scoring algorithms
- Reputation score is **formula-based only** (see agent.md for formula)
- No subjective weighting or custom rules per store

### ❌ Advanced NFT Features
- No secondary metadata mutations (SBT is immutable by design)
- No royalties or creator fees
- No collection-level metadata
- No bulk minting/airdropping

### ❌ Payment Integration
- No Stripe/payment processor integration
- No on/off-ramp solutions
- No fiat bridge
- No USD conversion on-chain

### ❌ Mobile App
- MVP is web-only (Next.js)
- Mobile responsiveness is a nice-to-have, not required

### ❌ Advanced Analytics
- No dashboards with complex charts
- No predictive analytics
- No ML-based risk scoring

### ❌ Governance
- No DAO mechanism
- No voting or governance tokens
- No multi-sig admin control

### ❌ Social Features
- No messaging system
- No marketplace
- No rating/review system
- No borrower-to-borrower interactions

### ❌ Wallet Recovery
- No built-in key recovery (if user loses key, account is inaccessible)
- Future feature only

### ❌ Automated Actions
- No cron jobs for auto-repayment reminders
- No automated interest accrual
- No automatic score decay over time

---

## Summary

This document defines the complete architecture of KhataChain MVP without implementation code. 

**Key Takeaways:**
1. **Solana Program** handles all credit logic, soulbound NFT minting, and reputation calculations
2. **Soulbound NFT** proves borrower identity and reputation (non-transferable, metadata-driven)
3. **Next.js Frontend** allows store owners to manage borrowers and borrowers to view their reputation
4. **Supabase Indexing** provides fast query access to borrower data, credit history, and reputation
5. **Security-first** design: PDAs, signer verification, NonTransferable tokens prevent abuse
6. **Narrow scope** ensures MVP is deliverable: no DeFi, no complex identity, no ML, no off-chain reputation logic

---

**Next Steps:**
Awaiting confirmation to proceed to agent.md (system instructions for all future AI coding agents).
