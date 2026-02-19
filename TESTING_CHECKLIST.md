# Testing Checklist - Step by Step

Follow these steps to test the Supabase integration.

## ✅ Status: Database Connection Working
- ✅ Supabase connection successful
- ✅ Database: `zzevhwfuzarvnqoltcka`
- ⏭️ Next: Set up database schema

---

## Step 1: Set Up Database Schema (Do This First!)

### 1.1 Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Select your project: `zzevhwfuzarvnqoltcka`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 1.2 Run SQL Scripts in Order

**Script 1: Base Schema** (Run First)
1. Open file: `scripts/00-base-schema.sql`
2. Copy ALL content
3. Paste in Supabase SQL Editor
4. Click **Run** (or Cmd/Ctrl + Enter)
5. Wait for success message ✅

**Script 2: Citizenship Schema** (Run Second)
1. Open file: `scripts/01-citizenship-schema.sql`
2. Copy ALL content
3. Paste in Supabase SQL Editor
4. Click **Run**
5. Wait for success message ✅

**Script 3: Stripe Schema** (Run Third)
1. Open file: `scripts/02-stripe-schema.sql`
2. Copy ALL content
3. Paste in Supabase SQL Editor
4. Click **Run**
5. Wait for success message ✅

### 1.3 Verify Tables Created

**Option 1: Using SQL** (Recommended)
1. In Supabase SQL Editor, paste this:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```
2. Click **Run**
3. You should see 10 tables:
   - borrowers ✅
   - citizenship_registrations ✅
   - citizenship_verification_logs ✅
   - credit_entries ✅
   - store_owner_stripe_accounts ✅
   - store_owners ✅
   - stripe_disputes ✅
   - stripe_payments ✅
   - stripe_payouts ✅
   - stripe_webhook_events ✅

**Option 2: Using Table Editor**
1. Click **Table Editor** in Supabase dashboard
2. Verify you see all 10 tables listed

**Option 3: Run Check Script**
1. Open `scripts/check-schema.sql` in this project
2. Copy and paste into Supabase SQL Editor
3. Run it - should show all tables present

---

## Step 2: Test Database Connection (Already Done ✅)

```bash
curl http://localhost:3000/api/test/db | jq .
```

**Expected Response:**
```json
{
  "status": "connected",
  "message": "Supabase connection successful! ✅",
  "tables": { "borrowers": 0, "store_owners": 0, "credit_entries": 0 }
}
```

✅ **Status: PASSED**

---

## Step 3: Test Creating Users

### 3.1 Create Test Borrower

```bash
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump",
    "userType": "borrower"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User created successfully! ✅",
  "user": {
    "id": "...",
    "walletAddress": "2VqKhjZ...",
    "userType": "borrower",
    "email": "2VqKhjZ4@test.com",
    "citizenshipVerified": false
  }
}
```

**If you get an error:**
- ❌ "Failed to create/fetch user" → **Schema not created, go back to Step 1**
- ❌ "Database connection failed" → **Check .env file**

### 3.2 Create Test Store Owner

```bash
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "5FhhRA5YQRBpxvaBNJJb8tKSGGjLUZmR9f1fhKNutAPU",
    "userType": "store-owner"
  }' | jq .
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User created successfully! ✅",
  "user": {
    "userType": "store-owner",
    "data": {
      "store_name": null,
      "store_owner_pubkey": "5FhhRA5...",
      "email": "5FhhRA5Y@test.com"
    }
  }
}
```

### 3.3 Verify User Exists

```bash
curl "http://localhost:3000/api/test/auth?wallet=2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump" | jq .
```

**Expected Response:**
```json
{
  "exists": true,
  "user": { ... }
}
```

---

## Step 4: Verify in Supabase Dashboard

1. Go to Supabase Dashboard → **Table Editor**
2. Click on **`borrowers`** table
3. You should see 1 row with the test borrower
4. Click on **`store_owners`** table
5. You should see 1 row with the test store owner

**Screenshot locations to check:**
- borrowers table → Look for wallet `2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump`
- store_owners table → Look for wallet `5FhhRA5YQRBpxvaBNJJb8tKSGGjLUZmR9f1fhKNutAPU`

---

## Step 5: Test Services Directly

Create a test file to verify services work:

```bash
# Create test file
cat > test-services.mjs << 'EOF'
import { config } from 'dotenv'
config()

// Dynamic import for ES modules
const { getBorrowerByPubkey, getBorrowerStats } = await import('./lib/services/index.js')

async function test() {
  const wallet = '2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump'
  
  console.log('\n=== Test 1: Get Borrower ===')
  const borrower = await getBorrowerByPubkey(wallet)
  console.log('Result:', borrower ? '✅ Found' : '❌ Not found')
  
  console.log('\n=== Test 2: Get Stats ===')
  const stats = await getBorrowerStats(wallet)
  console.log('Stats:', stats)
}

test()
EOF

# Run test
node test-services.mjs
```

---

## Step 6: Test in Browser UI

### 6.1 Test Wallet Connection with Real User

1. Open browser: http://localhost:3000
2. Click **Connect Wallet**
3. Select **Phantom** (if you have it)
4. Connect with wallet: `2VqKhjZ4HwUqWC7fXZtmvMWdZb2EQnPXcMgHWbSXpump`
5. Select role: **Borrower**
6. Should redirect to dashboard

### 6.2 Check Dashboard Loads

- Should see borrower stats (all zeros for new user)
- No errors in browser console
- AuthContext should have user data

---

## Troubleshooting

### Problem: "Failed to create/fetch user"

**Solution:**
1. Check SQL scripts were run in Supabase
2. Run `scripts/check-schema.sql` to verify tables exist
3. Check server logs for actual error
4. Verify .env has correct credentials

### Problem: "Database connection failed"

**Solution:**
1. Check `.env` file exists
2. Verify `SUPABASE_URL` is correct
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is correct  
4. Check Supabase project is not paused
5. Test connection: `curl http://localhost:3000/api/test/db`

### Problem: Tables don't exist

**Solution:**
1. Go to Supabase Dashboard
2. SQL Editor → New Query
3. Run each SQL script in order (00, 01, 02)
4. Verify in Table Editor

### Problem: Port 3000 already in use

**Solution:**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9

# Restart server
pnpm dev
```

---

## Quick Test Commands

```bash
# Test database connection
curl http://localhost:3000/api/test/db | jq .

# Create borrower
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "test1", "userType": "borrower"}' | jq .

# Create store owner  
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "test2", "userType": "store-owner"}' | jq .

# Check if user exists
curl "http://localhost:3000/api/test/auth?wallet=test1" | jq .
```

---

## Testing Checklist Summary

- [ ] **Step 1:** Run all 3 SQL scripts in Supabase ⚠️ **DO THIS FIRST!**
- [ ] **Step 2:** Test database connection (Already ✅)
- [ ] **Step 3:** Create test borrower
- [ ] **Step 3:** Create test store owner  
- [ ] **Step 4:** Verify users in Supabase dashboard
- [ ] **Step 5:** Test services directly (optional)
- [ ] **Step 6:** Test in browser UI (optional)

---

## Current Test Results

| Test | Status | Notes |
|------|--------|-------|
| Database Connection | ✅ PASSED | Connection successful |
| Create Borrower | ⏭️ PENDING | Need to run SQL scripts first |
| Create Store Owner | ⏭️ PENDING | Need to run SQL scripts first |
| Verify in Dashboard | ⏭️ PENDING | - |

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Database connection works
2. ✅ Services create/fetch users correctly
3. ✅ Data visible in Supabase dashboard
4. ⏭️ **Move to Phase 2:** Create production API routes
5. ⏭️ **Replace mock data** in UI components with real API calls
6. ⏭️ **Test end-to-end flows**

---

**Need help?**
- Check: [TESTING_SUPABASE.md](../docs/TESTING_SUPABASE.md) for detailed guide
- Reference: [SERVICES_REFERENCE.md](../docs/SERVICES_REFERENCE.md) for all service methods
- Guide: [SUPABASE_INTEGRATION.md](../docs/SUPABASE_INTEGRATION.md) for integration details
