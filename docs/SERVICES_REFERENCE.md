# Services Quick Reference

Quick reference for all available database services.

## Import Statement

```typescript
import {
  // Auth
  authenticateWallet,
  getOrCreateUser,
  verifyWalletSignature,
  updateUserActivity,
  
  // Borrowers
  getBorrowerByPubkey,
  getBorrowerById,
  getBorrowerByEmail,
  createBorrower,
  updateBorrower,
  updateCitizenshipVerification,
  searchBorrowers,
  getBorrowerStats,
  
  // Store Owners
  getStoreOwnerByPubkey,
  getStoreOwnerById,
  getStoreOwnerByEmail,
  createStoreOwner,
  updateStoreOwner,
  searchStoreOwners,
  getStoreOwnerStats,
  getStoreOwnerRecentCredits,
  
  // Credit Entries
  getCreditEntryById,
  getBorrowerCredits,
  getStoreOwnerCredits,
  createCreditEntry,
  updateCreditEntry,
  updateCreditStatus,
  recordStripeRepayment,
  getCreditEntryWithDetails,
  markOverdueCredits,
  getCreditStats,
  
  // Citizenship
  checkCitizenshipAvailability,
  registerCitizenship,
  getCitizenshipByBorrower,
  getCitizenshipByHash,
  logVerificationAttempt,
  updateCitizenshipStatus,
  suspendCitizenship,
  reactivateCitizenship,
  getCitizenshipStats,
  
  // Stripe
  getStoreOwnerStripeAccount,
  createStripeAccount,
  updateStripeAccountStatus,
  createStripePayment,
  updatePaymentStatus,
  getPaymentByIntentId,
  getCreditPayments,
  getStoreOwnerPayments,
  createWebhookEvent,
  markWebhookProcessed,
  webhookEventExists,
  createPayout,
  updatePayoutStatus,
  getPaymentStats,
} from '@/lib/services'
```

---

## Auth Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `authenticateWallet` | `walletAddress: string` | `AuthUser \| null` | Get user by wallet (checks both borrowers & store owners) |
| `getOrCreateUser` | `walletAddress: string`<br/>`userType: 'borrower' \| 'store-owner'`<br/>`email?: string` | `AuthUser \| null` | Create user if doesn't exist, or return existing |
| `verifyWalletSignature` | `walletAddress: string`<br/>`signature: string`<br/>`message: string` | `Promise<boolean>` | Verify signed message (TODO: implement) |
| `updateUserActivity` | `walletAddress: string`<br/>`userType: UserType` | `Promise<void>` | Update last_active timestamp |

### AuthUser Interface
```typescript
interface AuthUser {
  id: string
  walletAddress: string
  userType: 'borrower' | 'store-owner'
  email: string | null
  citizenshipVerified: boolean
  data: Borrower | StoreOwner
}
```

---

## Borrowers Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getBorrowerByPubkey` | `pubkey: string` | `Borrower \| null` | Get borrower by wallet address |
| `getBorrowerById` | `id: string` | `Borrower \| null` | Get borrower by UUID |
| `getBorrowerByEmail` | `email: string` | `Borrower \| null` | Get borrower by email |
| `createBorrower` | `data: BorrowerInsert` | `Borrower \| null` | Create new borrower |
| `updateBorrower` | `pubkey: string`<br/>`updates: Partial<BorrowerUpdate>` | `Borrower \| null` | Update borrower details |
| `updateCitizenshipVerification` | `pubkey: string`<br/>`citizenshipHash: string` | `Borrower \| null` | Update citizenship hash |
| `searchBorrowers` | `query: string`<br/>`limit?: number` | `Borrower[]` | Search by name/email |
| `getBorrowerStats` | `pubkey: string` | `BorrowerStats` | Calculate statistics |

### BorrowerStats Interface
```typescript
interface BorrowerStats {
  totalCredits: number        // Count of all credits
  activeCredits: number        // Count of active credits
  totalOwed: number           // Sum of outstanding amount (paise)
  completedPayments: number   // Count of completed credits
}
```

---

## Store Owners Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getStoreOwnerByPubkey` | `pubkey: string` | `StoreOwner \| null` | Get store owner by wallet |
| `getStoreOwnerById` | `id: string` | `StoreOwner \| null` | Get by UUID |
| `getStoreOwnerByEmail` | `email: string` | `StoreOwner \| null` | Get by email |
| `createStoreOwner` | `data: StoreOwnerInsert` | `StoreOwner \| null` | Create new store owner |
| `updateStoreOwner` | `pubkey: string`<br/>`updates: Partial<StoreOwnerUpdate>` | `StoreOwner \| null` | Update details |
| `searchStoreOwners` | `query: string`<br/>`limit?: number` | `StoreOwner[]` | Search stores |
| `getStoreOwnerStats` | `pubkey: string` | `StoreOwnerStats` | Calculate statistics |
| `getStoreOwnerRecentCredits` | `pubkey: string`<br/>`limit?: number` | `CreditWithBorrower[]` | Get recent credits with borrower info |

### StoreOwnerStats Interface
```typescript
interface StoreOwnerStats {
  totalCreditsIssued: number   // Count of all credits issued
  activeCredits: number         // Count of active credits
  totalLent: number            // Sum of all credit amounts (paise)
  totalCollected: number       // Sum of paid amounts (paise)
  totalOutstanding: number     // Sum of outstanding amounts (paise)
  overdueCredits: number       // Count of overdue credits
  stripeConnected: boolean     // Stripe onboarding complete
  totalPaymentsReceived: number // Sum of Stripe payments (paise)
  pendingPayouts: number       // Sum of pending payouts (paise)
  completedPayouts: number     // Sum of completed payouts (paise)
}
```

---

## Credit Entries Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getCreditEntryById` | `id: string` | `CreditEntry \| null` | Get credit by ID |
| `getBorrowerCredits` | `borrowerPubkey: string`<br/>`status?: CreditStatus \| 'all'`<br/>`limit?: number` | `CreditEntry[]` | Get borrower's credits |
| `getStoreOwnerCredits` | `storeOwnerPubkey: string`<br/>`status?: CreditStatus \| 'all'`<br/>`limit?: number` | `CreditEntry[]` | Get store owner's credits |
| `createCreditEntry` | `data: CreditEntryInsert` | `CreditEntry \| null` | Create new credit |
| `updateCreditEntry` | `id: string`<br/>`updates: Partial<CreditEntryUpdate>` | `CreditEntry \| null` | Update credit |
| `updateCreditStatus` | `id: string`<br/>`status: CreditStatus` | `CreditEntry \| null` | Update status only |
| `recordStripeRepayment` | `id: string`<br/>`amount: number`<br/>`paymentIntentId: string` | `CreditEntry \| null` | Record payment & auto-complete if fully paid |
| `getCreditEntryWithDetails` | `id: string` | `CreditWithDetails \| null` | Get with borrower & store owner info |
| `markOverdueCredits` | none | `number` | Batch update past due_date to 'overdue' |
| `getCreditStats` | `storeOwnerPubkey?: string`<br/>`startDate?: string`<br/>`endDate?: string` | `CreditStatsResult` | Aggregate statistics |

### Credit Status Types
```typescript
type CreditStatus = 'active' | 'overdue' | 'paid' | 'defaulted' | 'disputed'
```

---

## Citizenship Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `checkCitizenshipAvailability` | `citizenshipHash: string` | `{ available: boolean, existingRegistration?: Registration }` | Check if hash can be registered |
| `registerCitizenship` | `hash: string`<br/>`borrowerPubkey: string`<br/>`walletAddress: string` | `Registration \| null` | Register new citizenship |
| `getCitizenshipByBorrower` | `borrowerPubkey: string` | `Registration \| null` | Get by borrower |
| `getCitizenshipByHash` | `hash: string` | `Registration \| null` | Get by hash |
| `logVerificationAttempt` | `hash: string`<br/>`walletAddress: string`<br/>`status: 'allowed' \| 'rejected_duplicate' \| 'rejected_invalid'`<br/>`notes?: string`<br/>`ipAddress?: string`<br/>`userAgent?: string` | `VerificationLog \| null` | Log verification attempt |
| `updateCitizenshipStatus` | `hash: string`<br/>`status: CitizenshipStatus` | `Registration \| null` | Update status |
| `suspendCitizenship` | `hash: string`<br/>`reason: string` | `Registration \| null` | Suspend citizenship |
| `reactivateCitizenship` | `hash: string` | `Registration \| null` | Reactivate citizenship |
| `getCitizenshipStats` | none | `CitizenshipStats` | Get overall statistics |

### Citizenship Status
```typescript
type CitizenshipStatus = 'active' | 'suspended' | 'revoked'
```

---

## Stripe Service

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getStoreOwnerStripeAccount` | `storeOwnerPubkey: string` | `StripeAccount \| null` | Get Stripe account |
| `createStripeAccount` | `data: StripeAccountInsert` | `StripeAccount \| null` | Create Stripe account record |
| `updateStripeAccountStatus` | `storeOwnerPubkey: string`<br/>`updates: Partial<StripeAccountUpdate>` | `StripeAccount \| null` | Update account status |
| `createStripePayment` | `data: StripePaymentInsert` | `StripePayment \| null` | Create payment record |
| `updatePaymentStatus` | `paymentIntentId: string`<br/>`status: PaymentStatus`<br/>`errorMessage?: string` | `StripePayment \| null` | Update payment status |
| `getPaymentByIntentId` | `paymentIntentId: string` | `StripePayment \| null` | Get payment by Stripe ID |
| `getCreditPayments` | `creditEntryId: string` | `StripePayment[]` | Get all payments for credit |
| `getStoreOwnerPayments` | `storeOwnerPubkey: string`<br/>`status?: PaymentStatus`<br/>`limit?: number` | `StripePayment[]` | Get store owner's payments |
| `createWebhookEvent` | `eventId: string`<br/>`eventType: string`<br/>`eventData: any` | `WebhookEvent \| null` | Log webhook event |
| `markWebhookProcessed` | `eventId: string` | `WebhookEvent \| null` | Mark as processed |
| `webhookEventExists` | `eventId: string` | `boolean` | Check if already processed |
| `createPayout` | `data: PayoutInsert` | `Payout \| null` | Create payout record |
| `updatePayoutStatus` | `payoutId: string`<br/>`status: string` | `Payout \| null` | Update payout status |
| `getPaymentStats` | `storeOwnerPubkey: string` | `PaymentStats` | Get payment statistics |

### Payment Status
```typescript
type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'disputed'
```

---

## Middleware

### Auth Middleware

```typescript
import { withAuth, withOptionalAuth } from '@/lib/middleware/auth.middleware'

// Protect route - requires authentication
export const GET = withAuth(GET, 'borrower')  // Only borrowers
export const GET = withAuth(GET, 'store-owner')  // Only store owners
export const GET = withAuth(GET)  // Any authenticated user

// Optional auth - user attached if present
export const GET = withOptionalAuth(GET)
```

### Validation Middleware

```typescript
import { validateRequiredFields } from '@/lib/middleware/auth.middleware'

const body = await req.json()
const validation = validateRequiredFields(body, ['amount', 'description'])

if (!validation.valid) {
  return errorResponse(validation.error!, 400)
}
```

### Utility Functions

```typescript
import { 
  successResponse, 
  errorResponse, 
  corsHeaders, 
  handleOptions 
} from '@/lib/middleware/auth.middleware'

// Success response
return successResponse({ data: 'value' })

// Error response
return errorResponse('Error message', 400)

// CORS headers
return new NextResponse(json, { headers: corsHeaders() })
```

---

## Usage Examples

### Create User on Wallet Connect
```typescript
const user = await getOrCreateUser(walletAddress, 'borrower', email)
```

### Get Borrower Dashboard Data
```typescript
const [borrower, stats, credits] = await Promise.all([
  getBorrowerByPubkey(walletAddress),
  getBorrowerStats(walletAddress),
  getBorrowerCredits(walletAddress, 'active'),
])
```

### Create Credit Entry
```typescript
const credit = await createCreditEntry({
  borrower_pubkey: borrowerPubkey,
  store_owner_pubkey: storeOwnerPubkey,
  credit_amount: amount * 100, // Convert to paise
  currency: 'INR',
  description: description,
  due_date: dueDate.toISOString(),
})
```

### Process Stripe Payment
```typescript
// Update payment status
await updatePaymentStatus(paymentIntentId, 'succeeded')

// Record repayment on credit
await recordStripeRepayment(creditId, amount, paymentIntentId)
```

### Register Citizenship
```typescript
// Check availability
const { available } = await checkCitizenshipAvailability(hash)

if (!available) {
  return errorResponse('Citizenship already registered', 400)
}

// Register
const registration = await registerCitizenship(hash, borrowerPubkey, walletAddress)

// Log attempt
await logVerificationAttempt(hash, walletAddress, 'allowed', ipAddress, userAgent)
```

---

## Type Definitions

All types are defined in `/lib/supabase/types.ts`:

```typescript
import type { Database } from '@/lib/supabase/types'

type Borrower = Database['public']['Tables']['borrowers']['Row']
type BorrowerInsert = Database['public']['Tables']['borrowers']['Insert']
type BorrowerUpdate = Database['public']['Tables']['borrowers']['Update']

type StoreOwner = Database['public']['Tables']['store_owners']['Row']
type CreditEntry = Database['public']['Tables']['credit_entries']['Row']
type StripePayment = Database['public']['Tables']['stripe_payments']['Row']
// ... etc
```

---

## Error Handling

All service functions return `null` or empty arrays on error, with console.error logging:

```typescript
const borrower = await getBorrowerByPubkey(pubkey)

if (!borrower) {
  // Handle error - check console for details
  return errorResponse('Borrower not found', 404)
}
```

---

For detailed documentation, see:
- [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)
- [TESTING_SUPABASE.md](./TESTING_SUPABASE.md)
