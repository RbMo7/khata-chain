/**
 * Store Owners Service
 * Handles all store owner-related database operations
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type StoreOwner = Database['public']['Tables']['store_owners']['Row']
type StoreOwnerInsert = Database['public']['Tables']['store_owners']['Insert']
type StoreOwnerUpdate = Database['public']['Tables']['store_owners']['Update']

/**
 * Get store owner by public key
 */
export async function getStoreOwnerByPubkey(pubkey: string): Promise<StoreOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .select('*')
      .eq('store_owner_pubkey', pubkey)
      .single()

    if (error) {
      console.error('Get store owner error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get store owner error:', error)
    return null
  }
}

/**
 * Get store owner by ID
 */
export async function getStoreOwnerById(id: string): Promise<StoreOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get store owner by ID error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get store owner by ID error:', error)
    return null
  }
}

/**
 * Get store owner by email
 */
export async function getStoreOwnerByEmail(email: string): Promise<StoreOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Get store owner by email error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get store owner by email error:', error)
    return null
  }
}

/**
 * Create a new store owner
 */
export async function createStoreOwner(storeOwner: StoreOwnerInsert): Promise<StoreOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .insert(storeOwner)
      .select()
      .single()

    if (error) {
      console.error('Create store owner error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create store owner error:', error)
    return null
  }
}

/**
 * Update store owner information
 */
export async function updateStoreOwner(
  pubkey: string,
  updates: StoreOwnerUpdate
): Promise<StoreOwner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('store_owner_pubkey', pubkey)
      .select()
      .single()

    if (error) {
      console.error('Update store owner error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update store owner error:', error)
    return null
  }
}

/**
 * Search store owners by name or email
 */
export async function searchStoreOwners(query: string): Promise<StoreOwner[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('store_owners')
      .select('*')
      .or(`store_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Search store owners error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Search store owners error:', error)
    return []
  }
}

/**
 * Get store owner statistics
 */
export async function getStoreOwnerStats(pubkey: string) {
  try {
    // Get total credits issued count
    const { count: totalCreditsIssued } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('store_owner_pubkey', pubkey)

    // Get active credits count
    const { count: activeCredits } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('store_owner_pubkey', pubkey)
      .eq('status', 'active')

    // Get total amount lent
    const { data: creditData } = await supabaseAdmin
      .from('credit_entries')
      .select('credit_amount')
      .eq('store_owner_pubkey', pubkey)

    const totalLent = creditData?.reduce((sum, entry) => sum + entry.credit_amount, 0) || 0

    // Get total amount collected
    const { data: collectedData } = await supabaseAdmin
      .from('credit_entries')
      .select('stripe_repayment_amount')
      .eq('store_owner_pubkey', pubkey)

    const totalCollected =
      collectedData?.reduce((sum, entry) => sum + entry.stripe_repayment_amount, 0) || 0

    // Get outstanding amount
    const { data: outstandingData } = await supabaseAdmin
      .from('credit_entries')
      .select('credit_amount, stripe_repayment_amount')
      .eq('store_owner_pubkey', pubkey)
      .eq('status', 'active')

    const totalOutstanding =
      outstandingData?.reduce(
        (sum, entry) => sum + (entry.credit_amount - entry.stripe_repayment_amount),
        0
      ) || 0

    // Get overdue credits count
    const { count: overdueCredits } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('store_owner_pubkey', pubkey)
      .eq('status', 'overdue')

    // Get Stripe account status
    const { data: stripeAccount } = await supabaseAdmin
      .from('store_owner_stripe_accounts')
      .select('onboarding_status, charges_enabled, payouts_enabled')
      .eq('store_owner_pubkey', pubkey)
      .single()

    return {
      totalCreditsIssued: totalCreditsIssued || 0,
      activeCredits: activeCredits || 0,
      overdueCredits: overdueCredits || 0,
      totalLent,
      totalCollected,
      totalOutstanding,
      stripeConnected: !!stripeAccount,
      stripeStatus: stripeAccount?.onboarding_status || 'pending',
      chargesEnabled: stripeAccount?.charges_enabled || false,
      payoutsEnabled: stripeAccount?.payouts_enabled || false,
    }
  } catch (error) {
    console.error('Get store owner stats error:', error)
    return {
      totalCreditsIssued: 0,
      activeCredits: 0,
      overdueCredits: 0,
      totalLent: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      stripeConnected: false,
      stripeStatus: 'pending' as const,
      chargesEnabled: false,
      payoutsEnabled: false,
    }
  }
}

/**
 * Get store owner's recent credit entries
 */
export async function getStoreOwnerRecentCredits(pubkey: string, limit = 10) {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .select('*, borrowers(full_name, email, display_name)')
      .eq('store_owner_pubkey', pubkey)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Get recent credits error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get recent credits error:', error)
    return []
  }
}

/**
 * Delete store owner
 */
export async function deleteStoreOwner(pubkey: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('store_owners')
      .delete()
      .eq('store_owner_pubkey', pubkey)

    if (error) {
      console.error('Delete store owner error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete store owner error:', error)
    return false
  }
}
