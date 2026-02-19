# Supabase Services Testing Guide

This guide will help you test the database connection and all services step-by-step.

## Prerequisites

1. ✅ Supabase project created
2. ✅ Environment variables configured in `.env`
3. ✅ SQL scripts executed in Supabase SQL Editor
4. ✅ Development server running (`pnpm dev`)

## Step 1: Test Database Connection

### Method 1: Browser Test

1. Start the dev server:
```bash
pnpm dev
```

2. Visit in browser:
```
http://localhost:3000/api/test/db
```

3. Expected response:
```json
{
  "status": "connected",
  "message": "Supabase connection successful! ✅",
  "tables": {
    "borrowers": 0,
    "store_owners": 0,
    "credit_entries": 0
  },
  "timestamp": "2026-02-19T...",
  "database": "zzevhwfuzarvnqoltcka"
}
```

### Method 2: Terminal Test

```bash
curl http://localhost:3000/api/test/db
```

**If you get an error:**
- Check `.env` has correct `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Verify SQL scripts were run in Supabase
- Check Supabase project is not paused

---

## Step 2: Test Auth Service

### Create a Test Borrower

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump",
    "userType": "borrower"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "User created successfully! ✅",
  "user": {
    "id": "uuid-here",
    "walletAddress": "2VqKhjZ...",
    "userType": "borrower",
    "email": "2VqKhjZ4@test.com",
    "citizenshipVerified": false,
    "data": {
      "borrower_pubkey": "2VqKhjZ...",
      "email": "2VqKhjZ4@test.com",
      "created_at": "..."
    }
  },
  "details": { /* full borrower object */ }
}
```

### Create a Test Store Owner

```bash
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "5FhhRA5YQRBpxvaBNJJb8tKSGGjLUZmR9f1fhKNutAPU",
    "userType": "store-owner"
  }'
```

### Check if User Exists

```bash
curl "http://localhost:3000/api/test/auth?wallet=2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump"
```

---

## Step 3: Test Services Directly (Node.js REPL)

You can test services directly in a Node.js environment:

1. Create a test script `test-services.mjs`:

```javascript
import { config } from 'dotenv'
config()

// Import services
import { 
  getBorrowerByPubkey,
  createBorrower,
  getBorrowerStats,
  createCreditEntry,
  getBorrowerCredits,
  checkCitizenshipAvailability,
  registerCitizenship,
} from './lib/services/index.js'

async function testServices() {
  const testWallet = '2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump'
  
  // Test 1: Get or create borrower
  console.log('\n=== Test 1: Create Borrower ===')
  let borrower = await getBorrowerByPubkey(testWallet)
  
  if (!borrower) {
    borrower = await createBorrower({
      borrower_pubkey: testWallet,
      email: 'test@example.com',
      wallet_address: testWallet,
      full_name: 'Test User',
    })
  }
  console.log('Borrower:', borrower)
  
  // Test 2: Get stats
  console.log('\n=== Test 2: Get Borrower Stats ===')
  const stats = await getBorrowerStats(testWallet)
  console.log('Stats:', stats)
  
  // Test 3: Get credits
  console.log('\n=== Test 3: Get Borrower Credits ===')
  const credits = await getBorrowerCredits(testWallet)
  console.log('Credits:', credits)
  
  // Test 4: Check citizenship
  console.log('\n=== Test 4: Check Citizenship ===')
  const citizenshipHash = 'test-hash-123'
  const availability = await checkCitizenshipAvailability(citizenshipHash)
  console.log('Citizenship availability:', availability)
}

testServices()
```

2. Run it:
```bash
node test-services.mjs
```

---

## Step 4: Verify in Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **Table Editor**
3. Check these tables:
   - `borrowers` - Should see test users created
   - `store_owners` - Should see store owner created
   - `credit_entries` - Should see any credits created
   - `citizenship_registrations` - Check citizenship data
   - `citizenship_verification_logs` - Check verification attempts

---

## Step 5: Test Credit Creation

Create a test credit entry:

```bash
curl -X POST http://localhost:3000/api/test/credit \
  -H "Content-Type: application/json" \
  -d '{
    "borrowerPubkey": "2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump",
    "storeOwnerPubkey": "5FhhRA5YQRBpxvaBNJJb8tKSGGjLUZmR9f1fhKNutAPU",
    "amount": 50000,
    "description": "Test credit",
    "dueDate": "2026-03-30"
  }'
```

*(You'll need to create this API route first)*

---

## Step 6: Test Services in Your Components

Example in a React component:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { getBorrowerByPubkey, getBorrowerStats } from '@/lib/services'

export default function BorrowerProfile() {
  const [borrower, setBorrower] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadData() {
      const walletAddress = 'your-wallet-address'
      
      const [borrowerData, statsData] = await Promise.all([
        getBorrowerByPubkey(walletAddress),
        getBorrowerStats(walletAddress),
      ])
      
      setBorrower(borrowerData)
      setStats(statsData)
      setLoading(false)
    }
    
    loadData()
  }, [])
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <h1>Welcome, {borrower?.full_name}</h1>
      <p>Total Credits: {stats?.totalCredits}</p>
      <p>Active Credits: {stats?.activeCredits}</p>
      <p>Total Owed: ₹{(stats?.totalOwed || 0) / 100}</p>
    </div>
  )
}
```

---

## Common Test Scenarios

### 1. Test Borrower Flow

```bash
# 1. Create borrower
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "borrower1", "userType": "borrower"}'

# 2. Register citizenship
curl -X POST http://localhost:3000/api/citizenship/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer borrower1" \
  -d '{"citizenshipHash": "hash123"}'

# 3. Get borrower profile
curl http://localhost:3000/api/borrower/profile \
  -H "Authorization: Bearer borrower1"
```

### 2. Test Store Owner Flow

```bash
# 1. Create store owner
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "store1", "userType": "store-owner"}'

# 2. Get store owner profile
curl http://localhost:3000/api/store-owner/profile \
  -H "Authorization: Bearer store1"

# 3. Issue credit
curl -X POST http://localhost:3000/api/credit/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer store1" \
  -d '{
    "borrowerPubkey": "borrower1",
    "amount": 50000,
    "description": "Groceries",
    "dueDate": "2026-03-30"
  }'
```

### 3. Test Payment Flow

```bash
# 1. Get credit details
curl http://localhost:3000/api/credit/{credit-id} \
  -H "Authorization: Bearer borrower1"

# 2. Create payment intent
curl -X POST http://localhost:3000/api/stripe/payment/intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer borrower1" \
  -d '{"creditId": "credit-id", "amount": 10000}'

# 3. After payment succeeds (simulated)
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "id": "evt_test",
      "type": "payment_intent.succeeded",
      "data": {
        "object": {
          "id": "pi_test",
          "amount": 10000,
          "status": "succeeded"
        }
      }
    }
  }'
```

---

## Troubleshooting

### Error: "Failed to fetch"
- Check dev server is running
- Verify URL is correct (http://localhost:3000)

### Error: "Database connection failed"
- Verify `.env` has correct Supabase credentials
- Check Supabase project is active (not paused)
- Run SQL scripts in Supabase SQL Editor

### Error: "User not found"
- Create user first using test auth endpoint
- Verify wallet address is correct

### Error: "Unauthorized"
- Check Authorization header format: `Bearer <wallet_address>`
- Verify user exists in database
- Check middleware is applied correctly

### Type Errors
- Regenerate types: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts`
- Restart TypeScript server in VS Code

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Database connection works
2. ✅ Services return correct data
3. ✅ Auth middleware works
4. ⏭️ Create production API routes
5. ⏭️ Replace mock data in UI
6. ⏭️ Test end-to-end flows
7. ⏭️ Deploy to testnet

---

## Quick Checklist

- [ ] Database connection test passes
- [ ] Can create borrower via test endpoint
- [ ] Can create store owner via test endpoint
- [ ] Can fetch user details
- [ ] Borrower stats calculate correctly
- [ ] Store owner stats calculate correctly
- [ ] Can create credit entry
- [ ] Can register citizenship
- [ ] Services visible in Supabase dashboard
- [ ] Ready to build API routes

---

For more details, see [SUPABASE_INTEGRATION.md](./SUPABASE_INTEGRATION.md)
