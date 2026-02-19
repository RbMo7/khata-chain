/**
 * Stripe Service
 * Handles Stripe-related database operations
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type StripePayment = Database['public']['Tables']['stripe_payments']['Row']
type StripeAccount = Database['public']['Tables']['store_owner_stripe_accounts']['Row']
type StripePayout = Database['public']['Tables']['stripe_payouts']['Row']
type StripeWebhookEvent = Database['public']['Tables']['stripe_webhook_events']['Row']

/**
 * Get or create Stripe account for store owner
 */
export async function getStoreOwnerStripeAccount(
  storeOwnerPubkey: string
): Promise<StripeAccount | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owner_stripe_accounts')
      .select('*')
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Get Stripe account error:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Get Stripe account error:', error)
    return null
  }
}

/**
 * Create Stripe account record
 */
export async function createStripeAccount(
  storeOwnerPubkey: string,
  stripeAccountId: string,
  onboardingLink?: string,
  expiresAt?: string
): Promise<StripeAccount | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owner_stripe_accounts')
      .insert({
        store_owner_pubkey: storeOwnerPubkey,
        stripe_account_id: stripeAccountId,
        onboarding_status: 'pending',
        onboarding_link: onboardingLink,
        onboarding_link_expires_at: expiresAt,
      })
      .select()
      .single()

    if (error) {
      console.error('Create Stripe account error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create Stripe account error:', error)
    return null
  }
}

/**
 * Update Stripe account status
 */
export async function updateStripeAccountStatus(
  storeOwnerPubkey: string,
  updates: Partial<StripeAccount>
): Promise<StripeAccount | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owner_stripe_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .select()
      .single()

    if (error) {
      console.error('Update Stripe account error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update Stripe account error:', error)
    return null
  }
}

/**
 * Create a payment record
 */
export async function createStripePayment(payment: {
  credit_entry_id: string
  borrower_pubkey: string
  store_owner_pubkey: string
  store_owner_stripe_id: string
  amount: number
  currency: string
  payment_intent_id: string
  payment_method_id?: string
  payment_method_type?: string
}): Promise<StripePayment | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payments')
      .insert({
        ...payment,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Create payment error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create payment error:', error)
    return null
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentIntentId: string,
  status: StripePayment['status'],
  metadata?: {
    payment_method_id?: string
    payment_method_type?: string
    failed_reason?: string
  }
): Promise<StripePayment | null> {
  try {
    const updateData: any = { status }

    if (status === 'succeeded') {
      updateData.completed_at = new Date().toISOString()
    }

    if (metadata) {
      Object.assign(updateData, metadata)
    }

    const { data, error } = await supabaseAdmin
      .from('stripe_payments')
      .update(updateData)
      .eq('payment_intent_id', paymentIntentId)
      .select()
      .single()

    if (error) {
      console.error('Update payment status error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update payment status error:', error)
    return null
  }
}

/**
 * Get payment by intent ID
 */
export async function getPaymentByIntentId(intentId: string): Promise<StripePayment | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payments')
      .select('*')
      .eq('payment_intent_id', intentId)
      .single()

    if (error) {
      console.error('Get payment error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get payment error:', error)
    return null
  }
}

/**
 * Get all payments for a credit entry
 */
export async function getCreditPayments(creditEntryId: string): Promise<StripePayment[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payments')
      .select('*')
      .eq('credit_entry_id', creditEntryId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get credit payments error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get credit payments error:', error)
    return []
  }
}

/**
 * Get all payments for a store owner
 */
export async function getStoreOwnerPayments(
  storeOwnerPubkey: string,
  status?: StripePayment['status']
): Promise<StripePayment[]> {
  try {
    let query = supabaseAdmin
      .from('stripe_payments')
      .select('*, credit_entries(description), borrowers(full_name, email)')
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get store owner payments error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get store owner payments error:', error)
    return []
  }
}

/**
 * Create webhook event record
 */
export async function createWebhookEvent(
  eventId: string,
  eventType: string,
  eventData: any
): Promise<StripeWebhookEvent | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: eventId,
        event_type: eventType,
        event_data: eventData,
        processed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Create webhook event error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create webhook event error:', error)
    return null
  }
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookProcessed(
  eventId: string,
  errorMessage?: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('stripe_event_id', eventId)

    if (error) {
      console.error('Mark webhook processed error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Mark webhook processed error:', error)
    return false
  }
}

/**
 * Check if webhook event already exists
 */
export async function webhookEventExists(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('id')
      .eq('stripe_event_id', eventId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Check webhook exists error:', error)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Check webhook exists error:', error)
    return false
  }
}

/**
 * Create payout record
 */
export async function createPayout(payout: {
  store_owner_pubkey: string
  store_owner_stripe_id: string
  stripe_payout_id: string
  amount: number
  currency: string
  status: StripePayout['status']
  arrival_date?: string
  automatic?: boolean
  method?: string
}): Promise<StripePayout | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payouts')
      .insert(payout)
      .select()
      .single()

    if (error) {
      console.error('Create payout error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create payout error:', error)
    return null
  }
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  payoutId: string,
  status: StripePayout['status'],
  failureReason?: string
): Promise<StripePayout | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payouts')
      .update({
        status,
        failure_reason: failureReason,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payout_id', payoutId)
      .select()
      .single()

    if (error) {
      console.error('Update payout status error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update payout status error:', error)
    return null
  }
}

/**
 * Get store owner payment statistics
 */
export async function getPaymentStats(storeOwnerPubkey: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_payments')
      .select('amount, status')
      .eq('store_owner_pubkey', storeOwnerPubkey)

    if (error) {
      console.error('Get payment stats error:', error)
      return null
    }

    const stats = {
      totalPayments: data.length,
      totalAmount: data.reduce((sum, p) => sum + p.amount, 0),
      succeededAmount: data
        .filter((p) => p.status === 'succeeded')
        .reduce((sum, p) => sum + p.amount, 0),
      succeededCount: data.filter((p) => p.status === 'succeeded').length,
      failedCount: data.filter((p) => p.status === 'failed').length,
      pendingCount: data.filter((p) => p.status === 'pending').length,
    }

    return stats
  } catch (error) {
    console.error('Get payment stats error:', error)
    return null
  }
}
