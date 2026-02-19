# Supabase Integration Guide

## Overview

This document explains how to use the Supabase database connection, services, and middleware in the KhataChain project.

## Table of Contents

1. [Database Setup](#database-setup)
2. [Services Overview](#services-overview)
3. [API Routes with Middleware](#api-routes-with-middleware)
4. [Testing the Connection](#testing-the-connection)
5. [Common Patterns](#common-patterns)

---

## Database Setup

### 1. Initialize Database Schema

Run the SQL scripts in Supabase SQL Editor in this order:

```bash
# Connect to your Supabase project
# Go to SQL Editor and run these scripts:

1. scripts/00-base-schema.sql
2. scripts/01-citizenship-schema.sql
3. scripts/02-stripe-schema.sql
```

### 2. Verify Environment Variables

Make sure your `.env` file has:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Services Overview

### Auth Service

**Location:** `lib/services/auth.service.ts`

**Methods:**

```typescript
import { authenticateWallet, getOrCreateUser } from '@/lib/services'

// Authenticate existing user by wallet address
const user = await authenticateWallet(walletAddress)
// Returns: { id, walletAddress, userType, email, citizenshipVerified, data }

// Get or create user
const user = await getOrCreateUser(walletAddress, 'borrower', 'user@email.com')
```

### Borrowers Service

**Location:** `lib/services/borrowers.service.ts`

**Methods:**

```typescript
import {
  getBorrowerByPubkey,
  createBorrower,
  updateBorrower,
  getBorrowerStats,
  searchBorrowers,
  updateCitizenshipVerification,
} from '@/lib/services'

// Get borrower
const borrower = await getBorrowerByPubkey(pubkey)

// Create borrower
const newBorrower = await createBorrower({
  borrower_pubkey: walletAddress,
  email: 'user@example.com',
  wallet_address: walletAddress,
  full_name: 'John Doe',
})

// Update borrower
const updated = await updateBorrower(pubkey, {
  full_name: 'Jane Doe',
  phone_number: '+91-9876543210',
})

// Get statistics
const stats = await getBorrowerStats(pubkey)
// Returns: { totalCredits, activeCredits, totalOwed, completedPayments }

// Search borrowers
const results = await searchBorrowers('john')

// Update citizenship
const verified = await updateCitizenshipVerification(pubkey, citizenshipHash)
```

### Store Owners Service

**Location:** `lib/services/store-owners.service.ts`

**Methods:**

```typescript
import {
  getStoreOwnerByPubkey,
  createStoreOwner,
  updateStoreOwner,
  getStoreOwnerStats,
  getStoreOwnerRecentCredits,
} from '@/lib/services'

// Get store owner
const owner = await getStoreOwnerByPubkey(pubkey)

// Create store owner
const newOwner = await createStoreOwner({
  store_owner_pubkey: walletAddress,
  email: 'store@example.com',
  store_name: 'My Store',
})

// Get statistics
const stats = await getStoreOwnerStats(pubkey)
// Returns: { totalCreditsIssued, activeCredits, totalLent, totalCollected, etc. }

// Get recent credits
const credits = await getStoreOwnerRecentCredits(pubkey, 10)
```

### Credit Entries Service

**Location:** `lib/services/credit-entries.service.ts`

**Methods:**

```typescript
import {
  getCreditEntryById,
  getBorrowerCredits,
  getStoreOwnerCredits,
  createCreditEntry,
  updateCreditEntry,
  recordStripeRepayment,
  getCreditEntryWithDetails,
  markOverdueCredits,
} from '@/lib/services'

// Get credit by ID
const credit = await getCreditEntryById(creditId)

// Get borrower's credits
const credits = await getBorrowerCredits(borrowerPubkey, 'active')

// Create credit entry
const newCredit = await createCreditEntry({
  borrower_pubkey: borrowerPubkey,
  store_owner_pubkey: storeOwnerPubkey,
  credit_amount: 500000, // in paise
  currency: 'INR',
  description: 'Groceries',
  due_date: '2026-03-15',
})

// Record payment
const updated = await recordStripeRepayment(creditId, 100000, paymentIntentId)

// Get with full details
const details = await getCreditEntryWithDetails(creditId)
// Includes borrower and store owner info

// Mark overdue credits (run periodically)
const count = await markOverdueCredits()
```

### Citizenship Service

**Location:** `lib/services/citizenship.service.ts`

**Methods:**

```typescript
import {
  checkCitizenshipAvailability,
  registerCitizenship,
  logVerificationAttempt,
  getCitizenshipByBorrower,
} from '@/lib/services'

// Check if citizenship is available
const { available, existingRegistration } = await checkCitizenshipAvailability(hash)

// Register citizenship
const registration = await registerCitizenship(hash, borrowerPubkey, walletAddress)

// Log verification attempt
await logVerificationAttempt(
  hash,
  walletAddress,
  'allowed', // or 'rejected_duplicate' or 'rejected_invalid'
  'Verification successful',
  ipAddress,
  userAgent
)

// Get by borrower
const registration = await getCitizenshipByBorrower(borrowerPubkey)
```

### Stripe Service

**Location:** `lib/services/stripe.service.ts`

**Methods:**

```typescript
import {
  getStoreOwnerStripeAccount,
  createStripeAccount,
  updateStripeAccountStatus,
  createStripePayment,
  updatePaymentStatus,
  createWebhookEvent,
  getPaymentStats,
} from '@/lib/services'

// Get Stripe account
const account = await getStoreOwnerStripeAccount(storeOwnerPubkey)

// Create payment record
const payment = await createStripePayment({
  credit_entry_id: creditId,
  borrower_pubkey: borrowerPubkey,
  store_owner_pubkey: storeOwnerPubkey,
  store_owner_stripe_id: stripeAccountId,
  amount: 100000,
  currency: 'INR',
  payment_intent_id: intentId,
})

// Update payment status
await updatePaymentStatus(intentId, 'succeeded')

// Log webhook event
await createWebhookEvent(eventId, eventType, eventData)

// Get payment statistics
const stats = await getPaymentStats(storeOwnerPubkey)
```

---

## API Routes with Middleware

### Protected Route Example

**File:** `app/api/borrower/profile/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getBorrowerByPubkey, updateBorrower } from '@/lib/services'

// GET /api/borrower/profile
async function GET(req: NextRequest) {
  const user = (req as any).user // Attached by withAuth middleware

  const borrower = await getBorrowerByPubkey(user.walletAddress)

  if (!borrower) {
    return errorResponse('Borrower not found', 404)
  }

  return successResponse(borrower)
}

// PUT /api/borrower/profile
async function PUT(req: NextRequest) {
  const user = (req as any).user
  const body = await req.json()

  const updated = await updateBorrower(user.walletAddress, body)

  if (!updated) {
    return errorResponse('Failed to update profile', 500)
  }

  return successResponse(updated)
}

// Export with auth middleware
export const GET = withAuth(GET, 'borrower')
export const PUT = withAuth(PUT, 'borrower')
```

### Public Route Example

**File:** `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
```

### Webhook Route Example

**File:** `app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createWebhookEvent, updatePaymentStatus } from '@/lib/services'
import { successResponse, errorResponse } from '@/lib/middleware/auth.middleware'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const event = body.event

    // Log webhook event
    await createWebhookEvent(event.id, event.type, event.data)

    // Process based on event type
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      await updatePaymentStatus(paymentIntent.id, 'succeeded')
    }

    return successResponse({ received: true })
  } catch (error) {
    return errorResponse('Webhook processing failed', 500)
  }
}
```

---

## Testing the Connection

### 1. Create Test API Route

**File:** `app/api/test/db/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Test connection
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .select('count')
      .limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'error', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'connected',
      message: 'Supabase connection successful!',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: String(error) },
      { status: 500 }
    )
  }
}
```

### 2. Test in Browser

Visit: `http://localhost:3000/api/test/db`

Expected response:
```json
{
  "status": "connected",
  "message": "Supabase connection successful!",
  "timestamp": "2026-02-19T..."
}
```

### 3. Test Auth Service

**File:** `app/api/test/auth/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateWallet, getOrCreateUser } from '@/lib/services'

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, userType } = await req.json()

    // Try to get or create user
    const user = await getOrCreateUser(
      walletAddress,
      userType,
      `${walletAddress.slice(0, 8)}@test.com`
    )

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
```

Test with `curl`:
```bash
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "Eys21cSKe8xVrK...",
    "userType": "borrower"
  }'
```

---

## Common Patterns

### 1. Create User on Wallet Connection

```typescript
// In your wallet connection logic
import { getOrCreateUser } from '@/lib/services'

const handleWalletConnect = async (walletAddress: string, userType: 'borrower' | 'store-owner') => {
  const user = await getOrCreateUser(walletAddress, userType)
  
  if (user) {
    // Store in context/state
    setUser(user)
  }
}
```

### 2. Fetch User's Data

```typescript
// In a dashboard page
import { getBorrowerByPubkey, getBorrowerStats, getBorrowerCredits } from '@/lib/services'

async function loadBorrowerData(pubkey: string) {
  const [borrower, stats, credits] = await Promise.all([
    getBorrowerByPubkey(pubkey),
    getBorrowerStats(pubkey),
    getBorrowerCredits(pubkey, 'active'),
  ])

  return { borrower, stats, credits }
}
```

### 3. Create Credit Entry

```typescript
// In store owner's create credit flow
import { createCreditEntry } from '@/lib/services'

const handleCreateCredit = async () => {
  const credit = await createCreditEntry({
    borrower_pubkey: selectedBorrower.pubkey,
    store_owner_pubkey: currentUser.walletAddress,
    credit_amount: amount * 100, // Convert to paise
    currency: 'INR',
    description: description,
    due_date: dueDate.toISOString(),
  })

  if (credit) {
    // Redirect or show success
  }
}
```

### 4. Handle Payment

```typescript
// After Stripe payment succeeds
import { recordStripeRepayment, updatePaymentStatus } from '@/lib/services'

const handlePaymentSuccess = async (paymentIntent: any) => {
  // Update payment record
  await updatePaymentStatus(paymentIntent.id, 'succeeded')

  // Update credit entry
  await recordStripeRepayment(
    creditEntryId,
    paymentIntent.amount,
    paymentIntent.id
  )
}
```

---

## Next Steps

1. ✅ Run SQL scripts in Supabase
2. ✅ Test database connection
3. ⏭️ Update existing API routes to use services
4. ⏭️ Replace mock data in UI components
5. ⏭️ Test end-to-end flows

---

## Security Notes

- **Never expose service role key to client**
- Always use `withAuth` middleware for protected routes
- Validate all inputs before database operations
- Use prepared statements (Supabase does this automatically)
- Enable RLS (Row Level Security) in Supabase for production

---

## Troubleshooting

### Connection Issues

```typescript
// Test raw connection
import { supabaseAdmin } from '@/lib/supabase/server'

const { data, error } = await supabaseAdmin.from('borrowers').select('*').limit(1)
console.log({ data, error })
```

### Type Errors

If TypeScript complains about types, regenerate them:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
```

### Auth Not Working

Check:
1. Authorization header format: `Bearer <wallet_address>`
2. User exists in database
3. Middleware is applied correctly

---

For more help, see:
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
