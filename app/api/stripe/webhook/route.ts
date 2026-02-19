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
}
