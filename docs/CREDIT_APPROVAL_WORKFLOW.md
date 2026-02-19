# Credit Approval & Smart Contract Workflow

## Overview

The system now implements a complete credit approval workflow with Solana blockchain NFT integration:

```
Store Owner → Creates Credit → Sent to Borrower (pending_approval)
                                      ↓
Borrower Reviews → Accepts (Creates Solana NFT) → Status: active
                 → Rejects (with optional reason) → Status: rejected
```

## Fixed Issues

### 1. Credit Creation Error
**Problem**: `400 Bad Request - Missing required fields: borrowerPubkey, creditAmount, dueDate`

**Solution**: Updated field names in [app/store-owner/create-credit/page.tsx](app/store-owner/create-credit/page.tsx)
```typescript
// OLD (incorrect field names)
const creditData = {
  borrower_pubkey: ...,    // ❌
  amount: ...,             // ❌
  due_date: ...            // ❌
}

// NEW (matches API expectations)
const creditData = {
  borrowerPubkey: ...,     // ✅
  creditAmount: ...,       // ✅
  dueDate: ...             // ✅
}
```

## Database Schema Changes

### New Migration: `scripts/03-credit-approval-migration.sql`

Added to [scripts/00-base-schema.sql](scripts/00-base-schema.sql):

```sql
-- Status values:
-- 'pending_approval' - Waiting for borrower to accept/reject
-- 'active'          - Accepted, NFT minted, can be repaid
-- 'completed'       - Fully repaid
-- 'overdue'         - Passed due date without full repayment
-- 'cancelled'       - Cancelled by store owner
-- 'rejected'        - Declined by borrower

-- New columns:
- approved_at        TIMESTAMP - When borrower accepted
- rejected_at        TIMESTAMP - When borrower declined
- rejection_reason   TEXT      - Why borrower declined
```

## API Endpoints

### All endpoints require authentication (Bearer token with wallet address)

#### Create Credit (Store Owner Only)
```
POST /api/credits/create

Request:
{
  borrowerPubkey: string,
  creditAmount: number,     // Amount in paisa (÷100 = display amount)
  dueDate: string,          // ISO date string
  description: string,
  currency: string          // 'NPR', 'INR', etc.
}

Response:
{
  success: true,
  data: {
    credit: { id, status: "pending_approval", ... }
  }
}
```

#### Get Pending Credits (Borrower Only)
```
GET /api/borrower/credits?status=pending_approval

Response:
{
  success: true,
  data: {
    credits: [
      {
        id: string,
        store_owner_pubkey: string,
        credit_amount: number,
        currency: string,
        description: string,
        due_date: string,
        created_at: string,
        status: "pending_approval"
      },
      ...
    ],
    total: number,
    status: string
  }
}
```

#### Approve Credit (Borrower Only)
```
POST /api/credits/{creditId}/approve

Process:
1. Verifies credit is pending_approval
2. Creates Solana NFT via createCreditNFT()
3. Updates status to "active"
4. Stores nft_mint_address

Response:
{
  success: true,
  data: {
    credit: { id, status: "active", nft_mint_address: "..." },
    nftMintAddress: string
  }
}
```

#### Reject Credit (Borrower Only)
```
POST /api/credits/{creditId}/reject

Request:
{
  reason?: string  // Optional explanation
}

Response:
{
  success: true,
  data: {
    credit: { 
      id, 
      status: "rejected",
      rejection_reason: string,
      rejected_at: timestamp
    }
  }
}
```

## Component: PendingCreditRequests

Location: [components/PendingCreditRequests.tsx](components/PendingCreditRequests.tsx)

Features:
- Displays all pending credit requests for borrower
- Shows credit amount, lender, description, due date
- "Due Soon" warning if less than 7 days
- Approve/Reject buttons with confirmation dialogs
- NFT creation triggered on approval
- Optional rejection reason

### Integration

Automatically added to [app/borrower/profile/page.tsx](app/borrower/profile/page.tsx) - displays as first section above profile information.

```tsx
import { PendingCreditRequests } from '@/components/PendingCreditRequests'

// ... in component:
<PendingCreditRequests />
```

## Solana Smart Contract Integration

Location: [lib/solana/credit-nft.ts](lib/solana/credit-nft.ts)

### Functions (TODO: Full Implementation)

#### `createCreditNFT(creditData)`
Creates NFT representing credit agreement on Solana blockchain

**Input**:
```typescript
{
  borrowerPubkey: string,
  storeOwnerPubkey: string,
  amount: number,        // In paisa
  dueDate: string,       // ISO date
  creditId: string,
  description?: string
}
```

**Returns**: Mint address (string)

**Implementation Plan**:
1. Use Metaplex SDK to upload metadata to IPFS
2. Mint NFT with traits:
   - Amount
   - Due Date
   - Borrower Wallet
   - Lender Wallet
   - Credit ID
3. Return mint address to store in database

#### `recordCreditRepayment(nftMintAddress, amountRepaid, remainingBalance)`
Updates NFT metadata when borrower makes payment

**Implementation Plan**:
1. Update NFT metadata to reflect new balance
2. Emit on-chain event for repayment
3. Return transaction signature

#### `verifyCreditState(nftMintAddress)`
Fetch current credit status from blockchain

**Implementation Plan**:
1. Query Solana network for NFT metadata
2. Parse credit details
3. Return current balance and status

## API Client

Updated [lib/api-client.ts](lib/api-client.ts):

```typescript
export const creditApi = {
  create: (data) => post('/api/credits/create', data),
  getPending: () => get('/api/borrower/credits?status=pending_approval'),
  approve: (id) => post(`/api/credits/${id}/approve`, {}),
  reject: (id, reason) => post(`/api/credits/${id}/reject`, { reason }),
}
```

## Service Layer

Updated [lib/services/credit-entries.service.ts](lib/services/credit-entries.service.ts):

```typescript
// Updated to accept optional additional updates
export async function updateCreditStatus(
  id: string,
  status: CreditEntry['status'],
  additionalUpdates?: Partial<CreditEntry>
): Promise<CreditEntry | null>
```

## Complete Flow Example

### Store Owner Creates Credit
```
1. Navigate to /store-owner/create-credit
2. Search for borrower by email
3. Enter amount, due date, description
4. Click "Create Credit"
   → API: POST /api/credits/create
   → Status set to "pending_approval"
   → Stored in database
```

### Borrower Reviews & Approves
```
1. Navigate to /borrower/profile
2. See "Pending Credit Requests" section
3. Review credit details:
   - Amount
   - Lender wallet
   - Description
   - Due date
4. Click "Accept (Create NFT)"
5. Confirmation dialog explains NFT will be created
6. On approval:
   → API: POST /api/credits/{id}/approve
   → Creates Solana NFT (via createCreditNFT)
   → Status changes to "active"
   → Mint address stored
   → Component removed from pending list
```

### Borrower Declines
```
1. Click "Decline" button
2. Optional: Enter reason for declining
3. On rejection:
   → API: POST /api/credits/{id}/reject
   → Status changes to "rejected"
   → Reason stored in database
   → Component removed from pending list
```

## Build Status

✅ All changes compile successfully
- Added 2 new API routes: `/api/credits/[id]/approve` and `/api/credits/[id]/reject`
- Added 1 new UI component: `PendingCreditRequests`
- Updated 4 existing files

Total routes: 24 API endpoints, 33 pages

## Next Steps

### Phase 1: Testing
- [ ] Test credit creation with actual borrower
- [ ] Test approval flow end-to-end
- [ ] Verify database updates correctly

### Phase 2: Solana Integration
- [ ] Implement full `createCreditNFT()` with Metaplex SDK
- [ ] Test NFT creation on Solana devnet
- [ ] Implement `recordCreditRepayment()`
- [ ] Test repayment flow

### Phase 3: Repayment System
- [ ] Implement repayment API endpoints
- [ ] Add repayment tracking UI
- [ ] Integrate payment methods (Stripe, on-chain)

### Phase 4: Polish
- [ ] Add credit request notifications
- [ ] Implement credit status dashboard
- [ ] Add credit history/documents
