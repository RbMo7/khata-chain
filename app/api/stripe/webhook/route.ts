import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/stripe-utils'
import {
  createWebhookEvent,
  webhookEventExists,
  updatePaymentStatus,
  getPaymentByIntentId,
  recordStripeRepayment,
  updateStripeAccountStatus,
} from '@/lib/services'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 })
  }

  try {
    // Get raw body for signature verification
    const body = await request.text()

    // Verify webhook signature
    const verification = verifyWebhookSignature(body, signature)
    if (!verification.valid) {
      console.error('[Stripe Webhook] Invalid signature:', verification.error)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = verification.event

    // Check if we've already processed this event
    const alreadyProcessed = await webhookEventExists(event.id)
    if (alreadyProcessed) {
      console.log(`[Stripe Webhook] Event ${event.id} already processed, skipping`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Log webhook event
    await createWebhookEvent(event.id, event.type, event.data)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object)
        break

      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object)
        break

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error('[Stripe Webhook] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  const paymentIntentId = paymentIntent.id
  const amount = paymentIntent.amount

  try {
    console.log(`[Webhook] Processing payment success: ${paymentIntentId}`)

    // Get payment record
    const payment = await getPaymentByIntentId(paymentIntentId)

    if (!payment) {
      console.error('[Webhook] Payment record not found:', paymentIntentId)
      return
    }

    // Update payment status
    await updatePaymentStatus(paymentIntentId, 'succeeded')

    // Record repayment on credit entry
    await recordStripeRepayment(
      payment.credit_entry_id,
      amount,
      paymentIntentId
    )

    console.log(`[Webhook] Payment succeeded: ${paymentIntentId}, amount: ₹${amount / 100}`)
  } catch (error) {
    console.error('[Webhook] Error handling payment success:', error)
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const paymentIntentId = paymentIntent.id
  const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed'

  try {
    console.log(`[Webhook] Processing payment failure: ${paymentIntentId}`)

    await updatePaymentStatus(paymentIntentId, 'failed', errorMessage)

    console.log(`[Webhook] Payment failed: ${paymentIntentId}, reason: ${errorMessage}`)
  } catch (error) {
    console.error('[Webhook] Error handling payment failure:', error)
  }
}

async function handlePaymentCanceled(paymentIntent: any) {
  const paymentIntentId = paymentIntent.id

  try {
    console.log(`[Webhook] Processing payment cancellation: ${paymentIntentId}`)

    await updatePaymentStatus(paymentIntentId, 'failed', 'Payment was canceled')

    console.log(`[Webhook] Payment canceled: ${paymentIntentId}`)
  } catch (error) {
    console.error('[Webhook] Error handling payment cancellation:', error)
  }
}

async function handleChargeRefunded(charge: any) {
  const paymentIntentId = charge.payment_intent

  try {
    console.log(`[Webhook] Processing refund: ${paymentIntentId}`)

    await updatePaymentStatus(paymentIntentId, 'refunded')

    console.log(`[Webhook] Charge refunded: ${paymentIntentId}`)
  } catch (error) {
    console.error('[Webhook] Error handling refund:', error)
  }
}

async function handleAccountUpdated(account: any) {
  const stripeAccountId = account.id
  const chargesEnabled = account.charges_enabled
  const payoutsEnabled = account.payouts_enabled
  const detailsSubmitted = account.details_submitted

  try {
    console.log(`[Webhook] Processing account update: ${stripeAccountId}`)

    let onboardingStatus: string
    if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
      onboardingStatus = 'active'
    } else if (detailsSubmitted) {
      onboardingStatus = 'pending'
    } else {
      onboardingStatus = 'incomplete'
    }

    // Update store owner Stripe account status
    // Note: We need the store owner pubkey to update
    // For now, we'll just log this. In production, you might want to
    // store a mapping of Stripe account ID to store owner pubkey
    console.log(`[Webhook] Account ${stripeAccountId} status: ${onboardingStatus}`)
  } catch (error) {
    console.error('[Webhook] Error handling account update:', error)
  }

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return;
    }

    // Update credit_entries to mark repayment
    const { error: creditError } = await supabase
      .from('credit_entries')
      .update({
        stripe_repayment_amount: amount,
        repayment_method: 'stripe',
        stripe_payment_intent_id: paymentIntentId,
        is_repaid: true,
        repayment_date: new Date().toISOString(),
        repayment_status: 'completed',
      })
      .eq('id', payment.credit_entry_id);

    if (creditError) {
      console.error('Error updating credit entry:', creditError);
      return;
    }

    console.log(`Payment succeeded for credit entry: ${payment.credit_entry_id}`);
  } catch (err) {
    console.error('Error handling payment success:', err);
  }
}

async function handlePaymentFailed(paymentIntent: any, supabase: any) {
  const paymentIntentId = paymentIntent.id;
  const lastError = paymentIntent.last_payment_error;

  try {
    const { error } = await supabase
      .from('stripe_payments')
      .update({
        status: 'failed',
        failed_reason: lastError?.message || 'Payment failed',
        webhook_received_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);

    if (error) {
      console.error('Error updating failed payment:', error);
      return;
    }

    console.log(`Payment failed for intent: ${paymentIntentId}`);
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
}

async function handleChargeRefunded(charge: any, supabase: any) {
  const chargeId = charge.id;
  const refundId = charge.refunds?.data[0]?.id;

  try {
    // Find payment by charge/payment intent
    const { data: payment } = await supabase
      .from('stripe_payments')
      .select('id, credit_entry_id')
      .eq('payment_intent_id', charge.payment_intent)
      .single();

    if (!payment) {
      console.log(`No payment found for charge: ${chargeId}`);
      return;
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('stripe_payments')
      .update({
        status: 'refunded',
        refund_id: refundId,
        webhook_received_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating refunded payment:', updateError);
      return;
    }

    // Update credit entry status
    const { error: creditError } = await supabase
      .from('credit_entries')
      .update({
        is_repaid: false,
        repayment_status: 'refunded',
        stripe_repayment_amount: 0,
      })
      .eq('id', payment.credit_entry_id);

    if (creditError) {
      console.error('Error updating refunded credit entry:', creditError);
      return;
    }

    console.log(`Charge refunded: ${chargeId}, credit entry: ${payment.credit_entry_id}`);
  } catch (err) {
    console.error('Error handling refund:', err);
  }
}

async function handleAccountUpdated(account: any, supabase: any) {
  try {
    const stripeAccountId = account.id;
    const chargesEnabled = account.charges_enabled;
    const payoutsEnabled = account.payouts_enabled;

    const status =
      chargesEnabled && payoutsEnabled
        ? 'active'
        : account.requirements?.current_deadline
        ? 'pending'
        : 'inactive';

    const { error } = await supabase
      .from('store_owner_stripe_accounts')
      .update({
        onboarding_status: status,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
        requirements_pending: account.requirements?.currently_due || [],
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', stripeAccountId);

    if (error) {
      console.error('Error updating account status:', error);
      return;
    }

    console.log(`Stripe account updated: ${stripeAccountId}, status: ${status}`);
  } catch (err) {
    console.error('Error handling account update:', err);
  }
}
