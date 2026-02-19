# Stripe Integration Setup Guide

## Overview

KhataChain uses Stripe Connect to enable store owners (lenders) to receive payments from borrowers. The system supports two repayment methods:
- **On-chain (Solana tokens)** - Direct wallet-to-wallet transfers
- **Stripe (Fiat)** - Credit card, UPI, netbanking, wallets

## Prerequisites

1. Stripe account with Connect enabled
2. Test mode keys for development
3. Webhook endpoint configured

## Stripe Keys Setup

### 1. Get Your Stripe Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers > API Keys**
3. Copy the following keys:
   - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 2. Add to Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
```

## Webhook Configuration

### 1. Generate Webhook Signing Secret

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated` (for Stripe Connect)
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

### 2. Add Webhook Secret to Environment

```env
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

### 3. Local Webhook Testing

For local development, use Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # macOS
# or download from https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhook events to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will output your webhook signing secret for .env.local
```

## Stripe Connect Onboarding

### Store Owner Flow

1. Store owner clicks "Connect with Stripe"
2. Gets redirected to Stripe Connect onboarding
3. Provides business details, bank account, etc.
4. Stripe reviews (usually instant in test mode)
5. Account activated, can now receive payments

### API Endpoint

**POST** `/api/stripe/connect/onboard`

Request:
```json
{
  "store_owner_pubkey": "Eys21cSKe...",
  "email": "owner@store.com",
  "business_name": "My Store"
}
```

Response:
```json
{
  "success": true,
  "onboarding_link": "https://connect.stripe.com/...",
  "stripe_account_id": "acct_1234567890"
}
```

## Payment Flow

### 1. Create Payment Intent

**POST** `/api/stripe/payment/intent`

Request:
```json
{
  "credit_entry_id": "uuid-of-credit",
  "amount": 50000,
  "currency": "INR",
  "borrower_pubkey": "Eys21cSKe...",
  "store_owner_pubkey": "Store123..."
}
```

Response:
```json
{
  "client_secret": "pi_1234_secret_5678",
  "payment_intent_id": "pi_1234567890",
  "amount": 50000,
  "currency": "INR"
}
```

### 2. Collect Payment

Use Stripe Elements or Payment Element:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// Create payment element
const { paymentElement } = await stripe.elements({
  clientSecret: client_secret
});
```

### 3. Confirm Payment

```typescript
const { error, paymentIntent } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: "https://yourdomain.com/payment-success"
  }
});
```

### 4. Webhook Confirmation

Stripe sends webhook event when payment succeeds:

```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "status": "succeeded",
      "amount_received": 50000,
      "metadata": {
        "credit_entry_id": "uuid",
        "borrower_pubkey": "Eys21cSKe..."
      }
    }
  }
}
```

The webhook handler:
1. Verifies webhook signature
2. Updates payment status in database
3. Marks credit_entry repayment as completed
4. Records payout to store owner

## Testing

### Test Cards

In Stripe test mode, use these cards:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Decline (insufficient funds):** `4000 0000 0000 9995`

Any future expiry date and any 3-digit CVC.

### Test Flow

1. Borrower goes to `/borrower/repay`
2. Selects Stripe as payment method
3. Enters test card details
4. System creates payment intent
5. Stripe processes payment
6. Webhook updates database
7. Lender sees payment in Stripe dashboard

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook URL to production domain
- [ ] Enable RLS policies in Supabase
- [ ] Set up email notifications
- [ ] Configure dispute handling procedures
- [ ] Test end-to-end payment flow
- [ ] Set up monitoring/alerts for failed payments
- [ ] Document refund procedures
- [ ] Set up payout schedule with store owners

## Troubleshooting

### Webhook Not Triggering

1. Check webhook signing secret is correct
2. Verify endpoint URL is accessible
3. Check Stripe Dashboard > Webhooks > Event log
4. Ensure server is running (local testing)

### Payment Intent Fails

1. Check amount is in correct currency units (cents)
2. Verify store owner account is active
3. Check bank account details in Stripe Connect

### High Failure Rate

1. Insufficient funds message → Borrower needs more balance
2. Card declined → Try different payment method
3. 3D Secure required → Implement 3D Secure handling

## Security Notes

- Never log or expose `STRIPE_SECRET_KEY`
- Always verify webhook signatures
- Use HTTPS in production
- Implement idempotency keys for payment intents
- Store credit card tokens in Stripe, never locally
