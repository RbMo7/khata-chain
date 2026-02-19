import { NextRequest } from 'next/server'
import { createPaymentIntent } from '@/lib/stripe-utils'
import { 
  getStoreOwnerStripeAccount, 
  createStripePayment,
  getCreditEntryById,
} from '@/lib/services'
import { successResponse, errorResponse, validateRequiredFields, withAuth } from '@/lib/middleware/auth.middleware'

async function handler(request: NextRequest) {
  try {
    const user = (request as any).user
    const body = await request.json()
    const {
      credit_entry_id,
      amount,
      currency = 'INR',
      description,
    } = body

    // Validate required fields
    const validation = validateRequiredFields(body, [
      'credit_entry_id',
      'amount',
    ])

    if (!validation.valid) {
      return errorResponse(validation.error!, 400)
    }

    // Validate amount (must be positive integer in smallest currency unit)
    if (amount <= 0 || !Number.isInteger(amount)) {
      return errorResponse('Amount must be a positive integer in paise (INR)', 400)
    }

    // Get credit entry to verify and get store owner
    const credit = await getCreditEntryById(credit_entry_id)

    if (!credit) {
      return errorResponse('Credit entry not found', 404)
    }

    // Verify borrower is the one making payment
    if (credit.borrower_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: You can only pay your own credits', 403)
    }

    // Verify payment amount doesn't exceed outstanding amount
    if (amount > credit.outstanding_amount) {
      return errorResponse(
        `Amount exceeds outstanding balance of ₹${credit.outstanding_amount / 100}`,
        400
      )
    }

    // Get store owner's Stripe account
    const stripeAccount = await getStoreOwnerStripeAccount(credit.store_owner_pubkey)

    if (!stripeAccount) {
      return errorResponse('Store owner does not have a Stripe account connected', 400)
    }

    if (stripeAccount.onboarding_status !== 'active') {
      return errorResponse(
        `Store owner Stripe account is not fully set up. Status: ${stripeAccount.onboarding_status}`,
        400
      )
    }

    // Create payment intent via Stripe
    const result = await createPaymentIntent(
      amount,
      currency,
      stripeAccount.stripe_account_id,
      user.walletAddress,
      credit_entry_id,
      description || `KhataChain Repayment - ${credit_entry_id.slice(0, 8)}`
    )

    if (!result.success || !result.paymentIntent) {
      return errorResponse(result.error || 'Failed to create payment intent', 400)
    }

    // Save payment record to database
    const payment = await createStripePayment({
      credit_entry_id,
      borrower_pubkey: user.walletAddress,
      store_owner_pubkey: credit.store_owner_pubkey,
      store_owner_stripe_id: stripeAccount.stripe_account_id,
      amount,
      currency: currency.toUpperCase(),
      payment_intent_id: result.paymentIntentId!,
      status: 'pending',
    })

    if (!payment) {
      console.error('[Payment Intent] Failed to create payment record in database')
      return errorResponse('Failed to create payment record', 500)
    }

    return successResponse({
      success: true,
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      paymentId: payment.id,
    })
  } catch (error) {
    console.error('[Payment Intent] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create payment intent',
      500
    )
  }
}

export const POST = withAuth(handler, 'borrower')
