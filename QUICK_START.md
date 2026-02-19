# KhataChain Quick Start Guide

Get started in 5 minutes!

## 1. Clone & Install (2 min)

```bash
# Install dependencies
npm install
# or
pnpm install
```

## 2. Setup Environment (1 min)

```bash
# Copy example env
cp .env.example .env.local

# Edit with your keys:
# - Supabase URL and keys
# - Stripe test keys
```

## 3. Setup Database (1 min)

Go to Supabase Dashboard → SQL Editor:

1. Create new query
2. Copy content from `scripts/00-base-schema.sql`
3. Run it
4. Repeat with `scripts/01-citizenship-schema.sql`
5. Repeat with `scripts/02-stripe-schema.sql`

## 4. Start Dev Server (30 sec)

```bash
npm run dev
# Visit http://localhost:3000
```

## 5. Test (30 sec)

### Test Citizenship Check
```bash
curl -X POST http://localhost:3000/api/citizenship/check \
  -H "Content-Type: application/json" \
  -d '{
    "citizenship_number": "12345678901234",
    "wallet_address": "Eys21cSKe..."
  }'
```

### Test Stripe Payment Intent
```bash
curl -X POST http://localhost:3000/api/stripe/payment/intent \
  -H "Content-Type: application/json" \
  -d '{
    "credit_entry_id": "uuid-123",
    "amount": 50000,
    "currency": "INR",
    "borrower_pubkey": "Borrower...",
    "store_owner_pubkey": "StoreOwner..."
  }'
```

## Pages

- `/borrower/repay` - Borrower repayment
- `/store-owner/stripe-setup` - Store owner Stripe setup

## Database Tables

Key tables for queries:

```sql
-- Check borrowers
SELECT * FROM borrowers;

-- Check stripe accounts
SELECT * FROM store_owner_stripe_accounts;

-- Check payments
SELECT * FROM stripe_payments;

-- Check citizenship
SELECT * FROM citizenship_registrations;
```

## API Endpoints

### Citizenship
- `POST /api/citizenship/check` - Check if registered
- `POST /api/citizenship/register` - Register new borrower

### Stripe
- `POST /api/stripe/connect/onboard` - Stripe Connect link
- `POST /api/stripe/payment/intent` - Create payment
- `POST /api/stripe/webhook` - Stripe webhooks

## Test Cards

In Stripe test mode:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`

Any future date (e.g., 12/26) and any 3-digit CVC.

## Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This outputs your webhook signing secret
```

## Troubleshooting

### Database Connection Error
```
✗ Check NEXT_PUBLIC_SUPABASE_URL in .env.local
✗ Check NEXT_PUBLIC_SUPABASE_ANON_KEY
✗ Verify database migrations ran
```

### Stripe Error
```
✗ Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✗ Check STRIPE_SECRET_KEY
✗ Check STRIPE_WEBHOOK_SECRET for webhooks
```

### Payment Intent Fails
```
✗ Verify Stripe Connect account is active
✗ Check amount is in cents/paise
✗ Ensure credit_entry exists in database
```

## Key Files

- `app/api/` - API endpoints
- `components/` - React components
- `lib/` - Utility functions
- `scripts/` - Database migrations
- `docs/` - Full documentation

## Documentation

- **Full Setup:** See `docs/DATABASE_SETUP.md` and `docs/STRIPE_SETUP.md`
- **Testing:** See `docs/TESTING_GUIDE.md`
- **Architecture:** See `docs/structure.md`
- **Everything:** See `docs/IMPLEMENTATION_SUMMARY.md`

## Next Steps

1. Run database migrations
2. Test citizenship verification
3. Test Stripe Connect onboarding
4. Test payment processing
5. Check `docs/TESTING_GUIDE.md` for full test suite

## Need Help?

1. Check `docs/README.md` for common issues
2. Read relevant guide in `docs/`
3. Check Stripe Dashboard for payment issues
4. Check Supabase Dashboard for database issues

---

**Ready to test?** Start with: `npm run dev`
