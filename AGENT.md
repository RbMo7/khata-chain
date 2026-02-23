# Khata-Chain: System Context & Loyalty Implementation Plan

## 1. System Overview
Khata-Chain is a decentralized credit bureau for informal economies.
- **Goal:** Convert informal trust into portable, on-chain credit scores.
- **Identity:** One-person-one-account enforced via SHA-256 hashed citizenship numbers.
- **Repayment:** Hybrid (SOL via Gas Relay or Stripe).
- **Auditability:** Reputation scores are anchored to Solana via the Memo Program after every repayment.

## 2. Current Task: "Khata-Loyalty" & Badge System
The objective is to incentivize positive financial behavior (repayment) by rewarding borrowers with SOL and visual status symbols (badges).

### **A. Loyalty Reward Flow**
1. **Trigger:** Borrower completes a credit repayment.
2. **Logic:** `reputation.service` updates the score and calls `loyalty.service`.
3. **Evaluation:** `loyalty.service` checks milestones (e.g., 5th on-time payment, reaching 800 score).
4. **Distribution:** If a milestone is met, the system records a `borrower_reward` and triggers a SOL transfer from the platform fee wallet.
5. **Verification:** The reward transaction signature is stored for auditability.

### **B. Badge System Flow**
1. **Tiering:**
   - **Bronze:** Building (300-549)
   - **Silver:** Fair (550-699)
   - **Gold:** Good (700-849)
   - **Platinum:** Excellent (850-1000)
2. **Display:** 
   - Public Verifier (`/verify/[wallet]`): Shows the badge to potential lenders.
   - Borrower Dashboard: Shows the badge as a status symbol.
3. **Calculation:** Computed dynamically based on the `reputation_score` in the `borrower_reputation` table.

## 3. Implementation Steps

### **Step 1: Database Migration** [DONE]
- Add `borrower_rewards` table.
- Update `borrower_reputation` with loyalty-specific metadata.
- *File:* `scripts/07-loyalty-schema.sql`

### **Step 2: Backend Services** [DONE]
- `lib/services/loyalty.service.ts`: Handle milestone checks and SOL payouts.
- `lib/services/reputation.service.ts`: Update badge logic during score recalculation.

### **Step 3: Frontend Components** [DONE]
- `components/LoyaltyBadge.tsx`: A visual component for the tiered badges.
- `components/ReputationBadge.tsx`: Updated with reward info.

### **Step 4: Integration** [DONE]
- Update `/api/reputation/[borrowerPubkey]` to return badge and loyalty data.
- Update `/api/verify/[wallet]` to display the new badge.
- Update Borrower Dashboard with Loyalty Reward cards.

## 4. Security Guardrails
- **Anti-Spam:** Rewards only for credits > 0.05 SOL.
- **Sybil Protection:** Linked to verified citizenship hash.
- **Rate Limiting:** Rewards capped per borrower to prevent draining the fee wallet.
