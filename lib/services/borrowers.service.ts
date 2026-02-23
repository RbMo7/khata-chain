/**
 * Borrowers Service
 * Handles all borrower-related database operations
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type Borrower = Database['public']['Tables']['borrowers']['Row']
type BorrowerInsert = Database['public']['Tables']['borrowers']['Insert']
type BorrowerUpdate = Database['public']['Tables']['borrowers']['Update']

/**
 * Get borrower by public key
 */
export async function getBorrowerByPubkey(pubkey: string): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .select('*')
      .eq('borrower_pubkey', pubkey)
      .single()

    if (error) {
      console.error('Get borrower error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get borrower error:', error)
    return null
  }
}

/**
 * Get borrower by ID
 */
export async function getBorrowerById(id: string): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get borrower by ID error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get borrower by ID error:', error)
    return null
  }
}

/**
 * Get borrower by email
 */
export async function getBorrowerByEmail(email: string): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Get borrower by email error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get borrower by email error:', error)
    return null
  }
}

/**
 * Create a new borrower
 */
export async function createBorrower(borrower: BorrowerInsert): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .insert(borrower)
      .select()
      .single()

    if (error) {
      console.error('Create borrower error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create borrower error:', error)
    return null
  }
}

/**
 * Update borrower information
 */
export async function updateBorrower(
  pubkey: string,
  updates: BorrowerUpdate
): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('borrower_pubkey', pubkey)
      .select()
      .single()

    if (error) {
      console.error('Update borrower error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update borrower error:', error)
    return null
  }
}

/**
 * Update citizenship verification status
 */
export async function updateCitizenshipVerification(
  pubkey: string,
  citizenshipHash: string
): Promise<Borrower | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrowers')
      .update({
        citizenship_number_hash: citizenshipHash,
        citizenship_verified_at: new Date().toISOString(),
        original_citizenship_hash_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq('borrower_pubkey', pubkey)
      .select()
      .single()

    if (error) {
      console.error('Update citizenship error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update citizenship error:', error)
    return null
  }
}

/**
 * Search borrowers by name or email.
 * Includes reputation_score from the borrower_reputation table.
 */
export async function searchBorrowers(query: string, limit: number = 10): Promise<(Borrower & { reputation_score?: number })[]> {
  try {
    let queryBuilder = supabaseAdmin
      .from('borrowers')
      .select('*, borrower_reputation(reputation_score)')
      .limit(limit)
      .order('created_at', { ascending: false })
    
    // If query is provided, filter by name/email
    if (query && query.trim()) {
      queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,display_name.ilike.%${query}%`)
    }
    
    const { data, error } = await queryBuilder

    if (error) {
      console.error('Search borrowers error:', error)
      return []
    }

    // Flatten reputation_score from the nested join
    return (data || []).map((b: any) => ({
      ...b,
      reputation_score: b.borrower_reputation?.[0]?.reputation_score ?? null,
      borrower_reputation: undefined,
    }))
  } catch (error) {
    console.error('Search borrowers error:', error)
    return []
  }
}

/**
 * Get borrower statistics
 */
export async function getBorrowerStats(pubkey: string) {
  try {
    // Get total credits count
    const { count: totalCredits } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_pubkey', pubkey)

    // Get active credits count
    const { count: activeCredits } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_pubkey', pubkey)
      .eq('status', 'active')

    // Get total amount owed
    const { data: creditData } = await supabaseAdmin
      .from('credit_entries')
      .select('credit_amount, stripe_repayment_amount')
      .eq('borrower_pubkey', pubkey)
      .eq('status', 'active')

    const totalOwed = creditData?.reduce(
      (sum, entry) => sum + (entry.credit_amount - entry.stripe_repayment_amount),
      0
    ) || 0

    // Get completed payments count
    const { count: completedPayments } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_pubkey', pubkey)
      .eq('status', 'completed')

    // Get reputation and rewards
    const { data: reputation } = await supabaseAdmin
      .from('borrower_reputation')
      .select('total_rewards_earned_sol')
      .eq('borrower_pubkey', pubkey)
      .single()

    return {
      totalCredits: totalCredits || 0,
      activeCreditsCount: activeCredits || 0,
      totalOwed,
      completedPaymentsCount: completedPayments || 0,
      totalRewardsEarned: reputation?.total_rewards_earned_sol || 0,
    }
  } catch (error) {
    console.error('Get borrower stats error:', error)
    return {
      totalCredits: 0,
      activeCredits: 0,
      totalOwed: 0,
      completedPayments: 0,
    }
  }
}

/**
 * Delete borrower (soft delete by updating status)
 */
export async function deleteBorrower(pubkey: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('borrowers')
      .delete()
      .eq('borrower_pubkey', pubkey)

    if (error) {
      console.error('Delete borrower error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete borrower error:', error)
    return false
  }
}
