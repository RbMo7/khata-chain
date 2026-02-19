import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-15.acacia',
});

/**
 * Initialize Stripe Connect onboarding for a store owner
 */
export async function initializeStripeConnect(
  storeOwnerPubkey: string,
  storeOwnerEmail: string,
  storeName: string,
  phoneNumber?: string
): Promise<{
  success: boolean;
  stripeAccountId?: string;
  onboardingUrl?: string;
  error?: string;
}> {
  try {
    // Create a Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'IN', // Default to India
      email: storeOwnerEmail,
      business_profile: {
        name: storeName,
        support_phone: phoneNumber,
        support_email: storeOwnerEmail,
        mcc: '5411', // Supermarkets, supermarkets - general
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        cardholder_financing: { requested: false },
      },
    });

    // Create an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/store-owner/stripe-setup?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/store-owner/stripe-setup?success=true`,
    });

    return {
      success: true,
      stripeAccountId: account.id,
      onboardingUrl: accountLink.url || undefined,
    };
  } catch (err: any) {
    console.error('Stripe Connect initialization error:', err);
    return {
      success: false,
      error: err.message || 'Failed to initialize Stripe Connect',
    };
  }
}

/**
 * Get Stripe account status
 */
export async function getStripeAccountStatus(
  stripeAccountId: string
): Promise<{
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirements?: string[];
}> {
  try {
    const account = await stripe.accounts.retrieve(stripeAccountId);

    return {
      status: account.charges_enabled && account.payouts_enabled
        ? 'active'
        : account.requirements?.current_deadline
        ? 'pending'
        : 'rejected',
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      requirements: account.requirements?.currently_due || [],
    };
  } catch (err: any) {
    console.error('Error fetching Stripe account status:', err);
    throw err;
  }
}

/**
 * Create a payment intent for a borrower to repay a credit entry
 */
export async function createPaymentIntent(
  amount: number, // in smallest currency unit (paise for INR)
  currency: string,
  storeOwnerStripeId: string,
  borrowerWalletAddress: string,
  creditEntryId: string,
  description: string
): Promise<{
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}> {
  try {
    // Validate amount
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: currency.toLowerCase(),
        payment_method_types: ['card', 'india_upi'],
        description,
        metadata: {
          creditEntryId,
          borrowerWallet: borrowerWalletAddress,
        },
        statement_descriptor: `KHATACHAIN-${creditEntryId.slice(0, 12)}`,
      },
      {
        stripeAccount: storeOwnerStripeId,
      }
    );

    return {
      success: true,
      clientSecret: paymentIntent.client_secret || undefined,
      paymentIntentId: paymentIntent.id,
    };
  } catch (err: any) {
    console.error('Payment intent creation error:', err);
    return {
      success: false,
      error: err.message || 'Failed to create payment intent',
    };
  }
}

/**
 * Confirm a payment after client-side Stripe processing
 */
export async function confirmPaymentIntent(
  paymentIntentId: string,
  storeOwnerStripeId: string
): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId,
      {},
      {
        stripeAccount: storeOwnerStripeId,
      }
    );

    if (paymentIntent.status === 'succeeded') {
      return { success: true, status: 'succeeded' };
    } else if (paymentIntent.status === 'processing') {
      return { success: true, status: 'processing' };
    } else {
      return {
        success: false,
        status: paymentIntent.status,
        error: `Payment status: ${paymentIntent.status}`,
      };
    }
  } catch (err: any) {
    console.error('Payment confirmation error:', err);
    return {
      success: false,
      error: err.message || 'Failed to confirm payment',
    };
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentIntentId: string,
  storeOwnerStripeId: string,
  amount?: number,
  reason?: string
): Promise<{
  success: boolean;
  refundId?: string;
  error?: string;
}> {
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        amount,
        reason: reason as Stripe.RefundCreateParams.Reason,
        metadata: {
          refundedAt: new Date().toISOString(),
        },
      },
      {
        stripeAccount: storeOwnerStripeId,
      }
    );

    return { success: true, refundId: refund.id };
  } catch (err: any) {
    console.error('Refund error:', err);
    return {
      success: false,
      error: err.message || 'Failed to refund payment',
    };
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): {
  valid: boolean;
  event?: any;
  error?: string;
} {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return { valid: false, error: 'Webhook secret not configured' };
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return { valid: true, event };
  } catch (err: any) {
    console.error('Webhook signature verification error:', err);
    return {
      valid: false,
      error: err.message || 'Invalid webhook signature',
    };
  }
}

/**
 * Get customer's Stripe account details (for store owner dashboard)
 */
export async function getAccountBalance(
  stripeAccountId: string
): Promise<{
  available: number;
  pending: number;
  currency: string;
  error?: string;
}> {
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccountId,
    });

    const available = balance.available[0]?.amount || 0;
    const pending = balance.pending[0]?.amount || 0;
    const currency = balance.available[0]?.currency || 'inr';

    return {
      available,
      pending,
      currency: currency.toUpperCase(),
    };
  } catch (err: any) {
    console.error('Error fetching balance:', err);
    return {
      available: 0,
      pending: 0,
      currency: 'INR',
      error: err.message,
    };
  }
}

/**
 * List recent transactions for a store owner
 */
export async function listRecentCharges(
  stripeAccountId: string,
  limit: number = 10
): Promise<any[]> {
  try {
    const charges = await stripe.charges.list(
      { limit },
      {
        stripeAccount: stripeAccountId,
      }
    );

    return charges.data;
  } catch (err: any) {
    console.error('Error listing charges:', err);
    return [];
  }
}

/**
 * Update Stripe account metadata (e.g., store name, support info)
 */
export async function updateStripeAccountMetadata(
  stripeAccountId: string,
  metadata: Record<string, string>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await stripe.accounts.update(stripeAccountId, { metadata });
    return { success: true };
  } catch (err: any) {
    console.error('Error updating Stripe account:', err);
    return {
      success: false,
      error: err.message,
    };
  }
}
