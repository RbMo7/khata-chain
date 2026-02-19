import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/stripe-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    );
  }

  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature
    const verification = verifyWebhookSignature(body, signature);
    if (!verification.valid) {
      console.error('Invalid webhook signature:', verification.error);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = verification.event;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Log webhook event
    await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      event_data: event.data,
      created_at: new Date().toISOString(),
    });

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, supabase);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, supabase);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: any, supabase: any) {
  const paymentIntentId = paymentIntent.id;
  const amount = paymentIntent.amount;

  try {
    // Update stripe_payments record
    const { data: payment, error: fetchError } = await supabase
      .from('stripe_payments')
      .select('credit_entry_id, borrower_pubkey, store_owner_pubkey')
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (fetchError) {
      console.error('Error fetching payment record:', fetchError);
      return;
    }

    const { error: updateError } = await supabase
      .from('stripe_payments')
      .update({
        status: 'succeeded',
        completed_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
      })
      .eq('payment_intent_id', paymentIntentId);

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
