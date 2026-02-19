# KhataChain Database Setup Guide

## Overview

This guide explains how to manually create the database schema in Supabase. The system requires PostgreSQL tables for borrowers, store owners, credit entries, citizenship verification, and Stripe payment tracking.

## Setup Instructions

### Step 1: Connect to Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query" to create a new SQL query

### Step 2: Create Tables

Copy and paste the SQL from the scripts in order:

1. **First**, run `scripts/00-base-schema.sql` - Creates all core tables:
   - `borrowers` - User profiles with citizenship number hash
   - `store_owners` - Store owner profiles
   - `credit_entries` - Credit/loan records
   - `citizenship_registrations` - Citizenship audit trail
   - `citizenship_verification_logs` - Verification attempts
   - `stripe_payments` - Payment records
   - `store_owner_stripe_accounts` - Stripe Connect accounts
   - `stripe_payouts` - Payout history
   - `stripe_webhook_events` - Webhook event log
   - `stripe_disputes` - Chargeback tracking

2. **Second**, run `scripts/01-citizenship-schema.sql` - Creates views for citizenship data

3. **Third**, run `scripts/02-stripe-schema.sql` - Creates views for payment analytics

### Step 3: Verify Setup

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 12 tables:
- borrowers
- citizenship_registrations
- citizenship_verification_logs
- credit_entries
- store_owner_stripe_accounts
- store_owners
- stripe_disputes
- stripe_payments
- stripe_payouts
- stripe_webhook_events

### Step 4: Configure RLS (Row Level Security)

For production, set up RLS policies. For development, you can use public access. Run:

```sql
-- Enable RLS on sensitive tables
ALTER TABLE borrowers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizenship_registrations ENABLE ROW LEVEL SECURITY;

-- Allow all access (development only)
CREATE POLICY "Enable all access" ON borrowers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON stripe_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access" ON citizenship_registrations FOR ALL USING (true) WITH CHECK (true);
```

## Key Tables Overview

### borrowers
- `borrower_pubkey` - Solana wallet public key (unique)
- `citizenship_number_hash` - SHA-256 hash of citizenship number (unique, prevents duplicates)
- `email` - User email (unique)
- `wallet_address` - Solana wallet address
- `citizenship_verified_at` - When citizenship was verified

### citizenship_registrations
- Tracks which citizenship numbers are registered
- Prevents same person from creating multiple accounts
- Stores first wallet address per citizenship

### stripe_payments
- `payment_intent_id` - Stripe Payment Intent ID
- `status` - Payment status (pending, succeeded, failed, etc)
- `repayment_method` - on_chain, stripe, or hybrid
- `webhook_received_at` - When Stripe webhook was received

### store_owner_stripe_accounts
- `stripe_account_id` - Stripe Connect account ID
- `onboarding_status` - Stripe onboarding state
- `charges_enabled` - Can accept payments
- `payouts_enabled` - Can receive payouts

## Environment Variables

After setting up the database, ensure these environment variables are configured:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_public_key
STRIPE_WEBHOOK_SECRET=your_webhook_signing_secret
```

## Testing Citizenship Verification

Once the database is set up, you can test citizenship verification:

```bash
curl -X POST http://localhost:3000/api/citizenship/check \
  -H "Content-Type: application/json" \
  -d '{
    "citizenship_number": "12345678901234",
    "wallet_address": "Eys21cSKe......"
  }'
```

## Troubleshooting

**Table already exists error:**
- The `IF NOT EXISTS` clause prevents duplicate creation
- Safe to re-run the scripts multiple times

**Foreign key constraint errors:**
- Ensure tables are created in order: borrowers → store_owners → credit_entries → payment tables
- Don't delete parent records if child records exist

**Index errors:**
- Indexes are optional for functionality but improve query performance
- Safe to create multiple times

## Next Steps

After database setup:
1. Deploy the API routes from `app/api/`
2. Set up Stripe webhook endpoint
3. Test the borrower repayment flow
4. Test the lender Stripe setup flow
