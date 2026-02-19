# KhataChain Testing Guide

## Pre-Testing Checklist

Before testing, ensure you have:

- [ ] Supabase project set up with database schema
- [ ] Stripe account with test keys
- [ ] Environment variables configured (.env.local)
- [ ] Stripe CLI installed and listening for webhooks
- [ ] Development server running (`npm run dev`)

## Test Scenarios

### Scenario 1: Citizenship Verification

**Objective:** Ensure duplicate accounts are prevented

**Steps:**

1. Open `/api/citizenship/check` endpoint in browser or Postman
2. Send POST request:
```json
{
  "citizenship_number": "98765432101234",
  "wallet_address": "EysAbcd..."
}
```

3. Expected response (first time):
```json
{
  "is_registered": false,
  "citizenship_hash": "sha256...",
  "can_register": true
}
```

4. Register the citizen via `/api/citizenship/register`:
```json
{
  "citizenship_number": "98765432101234",
  "wallet_address": "EysAbcd...",
  "email": "user@example.com"
}
```

5. Send check request again with same citizenship number
6. Expected response (second time):
```json
{
  "is_registered": true,
  "citizenship_hash": "sha256...",
  "can_register": false,
  "error": "This citizenship number is already registered"
}
```

**Pass Criteria:**
- First check returns `is_registered: false`
- Registration succeeds
- Second check returns `is_registered: true`
- Duplicate registration is rejected

### Scenario 2: Store Owner Stripe Connect

**Objective:** Verify Stripe Connect onboarding works

**Steps:**

1. Call `/api/stripe/connect/onboard` POST:
```json
{
  "store_owner_pubkey": "StoreOwner123...",
  "email": "owner@store.com",
  "business_name": "My Store"
}
```

2. Expected response:
```json
{
  "success": true,
  "onboarding_link": "https://connect.stripe.com/...",
  "stripe_account_id": "acct_1234567890"
}
```

3. Open the onboarding link
4. Fill in fake business details:
   - Business name: "My Store"
   - Business type: Retail
   - Bank account: Use Stripe test account
5. Complete onboarding
6. Check database: `store_owner_stripe_accounts` should have:
   - `onboarding_status: 'active'`
   - `charges_enabled: true`

**Pass Criteria:**
- Onboarding link generated
- Can complete Stripe Connect flow
- Status updated in database
- Account marked as `charges_enabled: true`

### Scenario 3: Payment Intent Creation

**Objective:** Verify payment intent creation and validation

**Setup:**
- Store owner must be Stripe Connect onboarded
- Credit entry must exist in database

**Steps:**

1. Create a credit entry (manually in Supabase):
```sql
INSERT INTO credit_entries (
  id, borrower_pubkey, store_owner_pubkey, 
  credit_amount, due_date, status
) VALUES (
  'uuid-123', 'Borrower456...', 'StoreOwner123...',
  50000, NOW() + INTERVAL '30 days', 'active'
);
```

2. Call `/api/stripe/payment/intent` POST:
```json
{
  "credit_entry_id": "uuid-123",
  "amount": 50000,
  "currency": "INR",
  "borrower_pubkey": "Borrower456...",
  "store_owner_pubkey": "StoreOwner123..."
}
```

3. Expected response:
```json
{
  "success": true,
  "client_secret": "pi_1234_secret_5678",
  "payment_intent_id": "pi_1234567890",
  "amount": 50000,
  "currency": "INR"
}
```

4. Check Stripe Dashboard:
   - Payment Intent shows in test mode
   - Amount is correct
   - Status is "requires_payment_method"

**Pass Criteria:**
- Payment intent created successfully
- Client secret returned
- Shows in Stripe Dashboard
- Ready for payment collection

### Scenario 4: Stripe Payment Processing

**Objective:** Complete a full payment flow with test card

**Steps:**

1. On borrower repay page `/borrower/repay`:
   - Select Stripe as payment method
   - Enter test card: `4242 4242 4242 4242`
   - Any future expiry (e.g., 12/26)
   - Any 3-digit CVC (e.g., 123)

2. Click "Pay Now"

3. Monitor webhook handler:
   - Check logs for `payment_intent.succeeded` event
   - Verify Stripe CLI shows: "Request succeeded"

4. Check database:
   - `stripe_payments` table should have new record
   - Status should be `succeeded`
   - `completed_at` should be set

5. Check `credit_entries`:
   - `repayment_status` should be `completed`
   - `status` should be changed to `completed`

**Pass Criteria:**
- Payment processes without error
- Webhook event received
- Database updated correctly
- Borrower sees success message
- Store owner can see payment in Stripe Dashboard

### Scenario 5: Payment Failure Handling

**Objective:** Verify failed payments are handled correctly

**Steps:**

1. Use declining test card: `4000 0000 0000 0002`
2. Attempt payment through borrower repay page
3. Payment should fail
4. Check `stripe_payments` table:
   - Status should be `failed`
   - `failed_reason` should be populated
5. Verify error message shown to borrower
6. Borrower can retry payment

**Pass Criteria:**
- Failure captured and logged
- Borrower sees error message
- Can retry without issues
- Database reflects failure

### Scenario 6: Webhook Security

**Objective:** Verify webhook signature verification

**Steps:**

1. Send fake webhook to `/api/stripe/webhook`:
```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "stripe-signature: fake-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {...}
  }'
```

2. Expected: Request rejected with 401 Unauthorized

3. Send valid webhook using Stripe CLI:
```bash
stripe trigger payment_intent.succeeded
```

4. Expected: Request processed successfully

**Pass Criteria:**
- Fake webhooks rejected
- Valid webhooks processed
- No unauthorized access

## Stress Testing

### Load Test: Multiple Payments

1. Create 10 test credit entries
2. Attempt 10 concurrent payments
3. Verify all complete successfully
4. Check database for consistency
5. Verify no duplicate charges

### Load Test: Duplicate Citizenship

1. Attempt to register same citizenship 5 times concurrently
2. Only first should succeed
3. Others should fail with "already registered"

## Edge Cases

### Edge Case 1: Partial Refund
```bash
# In Stripe Dashboard, issue partial refund
# Verify database shows refund
# Verify borrower still owes remaining amount
```

### Edge Case 2: Network Timeout
```bash
# Simulate timeout during payment processing
# Verify payment intent is still in database
# Verify borrower can retry
```

### Edge Case 3: Webhook Replay
```bash
# Send same webhook twice
# Verify idempotency - only processes once
```

## Performance Testing

### API Response Times

Target: < 500ms for all endpoints

```bash
# Test citizenship check
time curl -X POST http://localhost:3000/api/citizenship/check \
  -H "Content-Type: application/json" \
  -d '{"citizenship_number": "12345...", "wallet_address": "Eys..."}'

# Test payment intent
time curl -X POST http://localhost:3000/api/stripe/payment/intent \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Database Query Performance

```sql
-- Check slow queries
EXPLAIN ANALYZE
SELECT * FROM stripe_payments 
WHERE store_owner_pubkey = 'StoreOwner123...'
ORDER BY created_at DESC;

-- Should use indexes, no sequential scans
```

## Monitoring & Logs

### Enable Debug Logging

Add to your API routes:
```typescript
console.log("[v0] Payment intent created:", {
  id: paymentIntent.id,
  amount: paymentIntent.amount,
  timestamp: new Date()
});
```

### Check Stripe Webhook Logs

1. Stripe Dashboard > Developers > Webhooks
2. Click your endpoint
3. View recent deliveries
4. Check response codes (200 = success, 4xx/5xx = failure)

### Supabase Database Logs

1. Supabase Dashboard > Logs
2. Filter by table: `stripe_payments`
3. View insert/update operations

## Rollback Procedures

### If Payment Goes Through Twice

1. Find duplicate in `stripe_payments`
2. Manually issue refund in Stripe Dashboard
3. Update database:
```sql
UPDATE stripe_payments 
SET status = 'refunded', refund_id = 'refund_id'
WHERE payment_intent_id = 'pi_duplicate';
```

### If Webhook Stuck

1. Check `stripe_webhook_events` for unprocessed events
2. Manually trigger webhook processing
3. Or replay webhook from Stripe Dashboard

## Sign-Off Checklist

- [ ] All 6 scenarios pass
- [ ] No errors in console logs
- [ ] Database updates correctly
- [ ] Stripe Dashboard shows transactions
- [ ] Webhook signature verification works
- [ ] Performance acceptable (< 500ms)
- [ ] Error handling works
- [ ] Borrower sees status updates
- [ ] Store owner can see payouts
- [ ] Refund flow works

## Production Pre-Launch

1. Switch Stripe keys to live
2. Update webhook URL to production
3. Run full test suite with live keys
4. Monitor for 24 hours
5. Gradually increase traffic
6. Set up alerts for failures
