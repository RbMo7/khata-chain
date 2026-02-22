# KhataChain

An on-chain credit bureau for informal economies, built on Solana.

Live: https://hisabkitab.rbmo.xyz/
Repository: https://github.com/RbMo7/khata-chain

---

## Problem Statement

Across South Asia and other emerging markets, hundreds of millions of people participate in informal credit. A shopkeeper extends credit to a regular customer. A local trader borrows from a supplier. These relationships exist entirely on paper — in handwritten ledgers called "khata" — or purely on trust.

When that borrower walks into a different shop, a different town, or tries to access a formal loan, their entire credit history is invisible. There is no portable proof of reliability. No institution can verify whether they repaid on time, defaulted, or never borrowed at all.

At the same time, formal credit bureaus do not serve this population. They require bank accounts, formal employment, and government-issued financial records that informal workers simply do not have.

The result: people who have demonstrated creditworthiness hundreds of times in their real lives are treated as having no financial history at all.

---

## Business Case

KhataChain addresses a market of roughly 1.5 billion people in informal economies who are excluded from formal credit systems. The mechanism is straightforward:

1. A store owner creates a credit entry for a borrower (the digital equivalent of writing in a khata).
2. When the borrower repays, the repayment is settled in SOL on-chain and the transaction signature is recorded.
3. A SHA-256 hash of the borrower's reputation data is anchored to the Solana blockchain using the Memo program, creating a tamper-proof timestamp of their credit score at that moment.
4. Any third party — a lender, a new store, an NGO — can verify that reputation on the public verifier page using just the borrower's wallet address.

For store owners, this replaces paper ledgers with an auditable digital record and removes the risk of "I have no proof this person owes me." For borrowers, consistent repayment builds a portable credit history that follows them across institutions and borders. For lenders, the on-chain proof means they can assess creditworthiness without relying on self-reported data or a centralised bureau that may not exist in that country.

The platform charges no gas fees to borrowers. All SOL transaction costs are covered by the platform wallet via a gas relay. This removes the primary barrier to blockchain adoption in this demographic: the requirement to hold and manage cryptocurrency before receiving any benefit from the system.

---

## Potential Impact

- Enables informal borrowers to build verifiable credit histories for the first time.
- Reduces information asymmetry between borrowers and lenders in markets where credit bureaus do not operate.
- Creates tamper-proof repayment records that cannot be falsified by either party.
- Position-agnostic: the same system works for a corner shop in Kathmandu, a market trader in Lagos, or a gig worker in Jakarta.
- As the borrower's on-chain history grows, it becomes portable collateral for accessing progressively larger or more formal credit products.
- Because reputation data is publicly verifiable via wallet address, third parties can integrate without requiring API agreements or data-sharing arrangements.

---

## Creative Use Cases

**Migrant worker credit portability.** A construction worker builds a repayment history with local suppliers in Nepal over three years. When they move to Qatar for work, they take nothing with them that a lender can verify — no bank statements, no formal payslips, no credit report. With KhataChain, they present their wallet address. The on-chain history is already there, immutable, timestamped, and readable by anyone with an internet connection. A remittance company or employer-linked lender in Qatar can verify it in seconds without contacting a bureau that doesn't exist in that jurisdiction.

**Cooperative lending pools.** A village self-help group maintains a shared lending fund. Rather than keeping a manual register of who repaid and who didn't, each transaction is recorded on KhataChain. Members who consistently repay on time achieve higher reputation scores. The cooperative's governance rules can tie borrowing limits directly to score thresholds — enforced by the data, not by the committee's memory of who repaid two years ago.

**NGO and microfinance integration.** An NGO running a microloan programme typically handles eligibility assessment manually, which is slow and expensive. If applicants have KhataChain histories, the NGO can call the public verifier API, retrieve a score and a tamper-proof on-chain commitment, and automate the eligibility decision. No data-sharing agreement is needed because the data is already public. The hash on-chain means the applicant cannot alter their history between when they applied and when the NGO checks.

**Disaster recovery lending.** After a flood or earthquake, governments and aid organisations need to extend emergency credit quickly to affected households. Traditional credit assessment collapses in disaster contexts because records are destroyed and institutions are offline. If a borrower's reputation is already anchored on-chain before the disaster, any relief lender can assess risk and recover funds later through the same repayment infrastructure, regardless of what happened to local paper records.

**Supplier finance for small manufacturers.** A small garment manufacturer buys fabric on credit from a textile wholesaler. The wholesaler records the transaction on KhataChain. When the manufacturer later approaches a supply chain finance platform for early payment on a purchase order, the finance platform can verify the manufacturer's repayment history with multiple suppliers, all on-chain, rather than relying on invoices the manufacturer provides themselves.

---

## How It Works

### For Store Owners

1. Register an account and complete identity verification using a national citizenship number. The number is SHA-256 hashed before storage — the plaintext is never retained.
2. Search for a borrower by wallet address.
3. Issue a credit entry specifying amount, due date, and description.
4. Approve or reject pending repayments from the dashboard.
5. View completed credits alongside their Solana Explorer transaction links directly from the dashboard.

### For Borrowers

1. Register with a citizenship number (one account per person, enforced cryptographically).
2. View active credits from store owners.
3. Repay in SOL directly from the browser — no wallet top-up required, gas is relayed by the platform.
4. After repayment is confirmed on-chain, the transaction signature is stored and a new reputation hash is anchored to Solana.
5. View the full credit history and on-chain Explorer links from the history page.

### For Third-Party Verifiers

Visit `/verify/[wallet-address]` or use the public verifier on the landing page. Enter any borrower's wallet address to see:

- Reputation score
- Total credits, on-time payments, late payments by severity
- The most recent on-chain hash anchored to Solana, with an Explorer link proving when it was committed and what the score was at that moment.

No login required.

---

## Technical Implementation

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (33 endpoints) |
| Database | Supabase (PostgreSQL) |
| Blockchain | Solana (Memo Program, SPL transfers) |
| Auth | JWT-based session tokens, wallet-address-bound |
| Deployment | Vercel |

### On-Chain Architecture

KhataChain does not deploy a custom smart contract. It uses two native Solana primitives:

**Repayment settlement:** When a borrower repays, the client initiates a SOL transfer from the platform relay wallet to the store owner's wallet. The transaction signature is recorded against the credit entry in the database.

**Reputation anchoring:** After a repayment is confirmed, the API computes a SHA-256 hash of the borrower's current reputation fields (score, total credits, on-time payments, late payment counts). This hash is written to the Solana blockchain as a Base58-encoded memo transaction, signed by the platform keypair. The transaction signature and hash are stored in `borrower_reputation`. Anyone who independently computes the same hash from the reputation data can verify it matches the on-chain memo.

**Gas relay:** The platform keypair (`EWhDaoqMtEJs6qRSaixiaXZkDTkoA3ZoxfmjTSuzMAC6`) signs and pays for all on-chain transactions. Borrowers never need SOL in their wallets.

### API Endpoints (selected)

```
POST   /api/auth/login                        Authenticate with wallet address
GET    /api/auth/me                           Current session
POST   /api/credits/create                    Create a credit entry
POST   /api/credits/[id]/approve             Approve a credit
POST   /api/credits/[id]/reject              Reject a credit
POST   /api/credits/[id]/mark-paid          Mark repayment confirmed
POST   /api/solana/record-tx                 Record on-chain tx signature after repayment
POST   /api/solana/relay                     Gas relay: sign and broadcast SOL transfer
POST   /api/solana/anchor-reputation        Anchor reputation hash to Solana via Memo
GET    /api/reputation/[borrowerPubkey]     Public reputation data
GET    /api/verify/[wallet]                 Public verifier endpoint
GET    /api/public/recent-credits           Anonymised live feed for landing page
GET    /api/borrower/credits                All credits for authenticated borrower
GET    /api/store-owner/credits             All credits for authenticated store owner
POST   /api/cron/overdue                    Mark past-due credits (Vercel cron, daily)
GET    /api/sol-price                       Current SOL/NPR price for UI display
```

### Database Schema

14 tables managed in Supabase PostgreSQL:

- `borrowers` — borrower profiles, citizenship hash, wallet address
- `store_owners` — store profiles
- `credit_entries` — credit records with status, amounts, due dates, tx signatures
- `borrower_reputation` — score, payment counts, reputation hash, on-chain tx
- `citizenship_registrations` — audit log of citizenship number hashes
- `citizenship_verification_logs` — registration attempt log

### Identity Verification

Each user (borrower or store owner) provides a national citizenship number at registration. The system computes `SHA-256(salt + citizenship_number)` and stores only the hash. If the hash already exists, registration is rejected — preventing one person from holding multiple accounts. The plaintext is discarded immediately after hashing.

### Reputation Scoring

Scores are computed as integer values on each repayment event:

- On-time payment: positive contribution
- Minor late (1-7 days): small penalty
- Major late (8-30 days): larger penalty
- Severe late (>30 days): significant penalty

The resulting integer score is the input to the on-chain hash computation. The hash serves as a cryptographic commitment: anyone who has the raw reputation data can verify it has not been altered since it was anchored.

### Overdue Detection

A Vercel cron job calls `POST /api/cron/overdue` daily. It queries all `active` credits where `due_date < now()` and transitions them to `overdue`. This triggers a reputation recalculation on the next borrower-facing API call.

---

## Running Locally

### Prerequisites

- Node.js 18+
- pnpm
- A Supabase project
- A funded Solana testnet wallet (for gas relay)

### Setup

```bash
git clone https://github.com/RbMo7/khata-chain.git
cd khata-chain
pnpm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SOLANA_NETWORK=testnet
PLATFORM_WALLET_PRIVATE_KEY=        # base58 private key for gas relay
NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS=

JWT_SECRET=
CRON_SECRET=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Migrations

Run the following SQL files in Supabase SQL Editor, in order:

```
scripts/00-base-schema.sql
scripts/01-citizenship-schema.sql
scripts/03-credit-approval-migration.sql
scripts/04-update-credit-approval-schema.sql
scripts/05-solana-tx-signatures.sql
scripts/06-reputation-anchor.sql
```

### Start

```bash
pnpm dev
```

Open `http://localhost:3000`.

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with live on-chain activity feed and public reputation verifier |
| `/select-role` | Choose borrower or store owner at registration |
| `/borrower/dashboard` | Active credits, current reputation score |
| `/borrower/credits` | All active credits with repay action |
| `/borrower/history` | Full credit history with on-chain Explorer links |
| `/borrower/verify` | Borrower's own reputation proof |
| `/borrower/profile` | Profile and account settings |
| `/store-owner/dashboard` | Credits issued, quick stats, Explorer links |
| `/store-owner/credits` | Full list of issued credits with status |
| `/store-owner/credits/[id]` | Credit detail and approval workflow |
| `/store-owner/create-credit` | Issue a new credit to a borrower |
| `/store-owner/profile` | Store profile |
| `/verify/[wallet]` | Public verifier — no login required |

---

## Hackathon Alignment

This submission addresses the on-chain loyalty and reputation track. The core mechanism — anchoring a cryptographic hash of a user's on-chain behaviour history — is directly analogous to a token extension loyalty system, applied to the credit domain. Rather than token balances growing over time, reputation scores grow with each successful repayment, are committed to the chain at each milestone, and are publicly redeemable for access to credit by presenting the verifiable proof.

Key properties that satisfy the on-chain experience requirement:

- Every repayment produces a real on-chain transaction (SOL transfer, Solana testnet).
- Every reputation update produces a second on-chain transaction (Memo anchor).
- Both are publicly verifiable on Solana Explorer with no special tooling.
- The gas relay means the user never touches SOL directly, providing a native experience for users who do not hold cryptocurrency.

---

## Deployment

The production build is deployed to Vercel from the `main` branch. Environment variables are configured in the Vercel project settings. The Supabase instance is shared across local and production environments.

Network: Solana testnet  
Platform wallet: `EWhDaoqMtEJs6qRSaixiaXZkDTkoA3ZoxfmjTSuzMAC6`

---

## License

MIT
