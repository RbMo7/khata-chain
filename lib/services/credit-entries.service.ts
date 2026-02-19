/**
 * Credit Entries Service
 * Handles all credit entry-related database operations
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type CreditEntry = Database['public']['Tables']['credit_entries']['Row']
type CreditEntryInsert = Database['public']['Tables']['credit_entries']['Insert']
type CreditEntryUpdate = Database['public']['Tables']['credit_entries']['Update']

/**
 * Get credit entry by ID
 */
export async function getCreditEntryById(id: string): Promise<CreditEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get credit entry error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get credit entry error:', error)
    return null
  }
}

/**
 * Get all credit entries for a borrower
 */
export async function getBorrowerCredits(
  borrowerPubkey: string,
  status?: CreditEntry['status']
): Promise<CreditEntry[]> {
  try {
    let query = supabaseAdmin
      .from('credit_entries')
      .select('*, store_owners(store_name, email)')
      .eq('borrower_pubkey', borrowerPubkey)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get borrower credits error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get borrower credits error:', error)
    return []
  }
}

/**
 * Get all credit entries for a store owner
 */
export async function getStoreOwnerCredits(
  storeOwnerPubkey: string,
  status?: CreditEntry['status']
): Promise<CreditEntry[]> {
  try {
    let query = supabaseAdmin
      .from('credit_entries')
      .select('*, borrowers(full_name, email, display_name)')
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get store owner credits error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get store owner credits error:', error)
    return []
  }
}

/**
 * Create a new credit entry
 */
export async function createCreditEntry(credit: CreditEntryInsert): Promise<CreditEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .insert(credit)
      .select()
      .single()

    if (error) {
      console.error('Create credit entry error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Create credit entry error:', error)
    return null
  }
}

/**
 * Update credit entry
 */
export async function updateCreditEntry(
  id: string,
  updates: CreditEntryUpdate
): Promise<CreditEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update credit entry error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update credit entry error:', error)
    return null
  }
}

/**
 * Update credit status (active, completed, overdue, cancelled)
 */
export async function updateCreditStatus(
  id: string,
  status: CreditEntry['status']
): Promise<CreditEntry | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update credit status error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Update credit status error:', error)
    return null
  }
}

/**
 * Record Stripe repayment
 */
export async function recordStripeRepayment(
  creditEntryId: string,
  amount: number,
  paymentIntentId: string
): Promise<CreditEntry | null> {
  try {
    // Get current credit entry
    const creditEntry = await getCreditEntryById(creditEntryId)
    if (!creditEntry) {
      console.error('Credit entry not found')
      return null
    }

    // Calculate new repayment amount
    const newRepaymentAmount = creditEntry.stripe_repayment_amount + amount

    // Determine new status
    let newStatus = creditEntry.status
    let newRepaymentStatus: CreditEntry['repayment_status'] = 'partial'

    if (newRepaymentAmount >= creditEntry.credit_amount) {
      newStatus = 'completed'
      newRepaymentStatus = 'completed'
    }

    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .update({
        stripe_repayment_amount: newRepaymentAmount,
        stripe_payment_intent_id: paymentIntentId,
        status: newStatus,
        repayment_status: newRepaymentStatus,
        repayment_method: creditEntry.repayment_method === 'on_chain' ? 'hybrid' : 'stripe',
      })
      .eq('id', creditEntryId)
      .select()
      .single()

    if (error) {
      console.error('Record repayment error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Record repayment error:', error)
    return null
  }
}

/**
 * Get overdue credits
 * Credits past their due date and still active
 */
export async function getOverdueCredits(): Promise<CreditEntry[]> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .select('*, borrowers(full_name, email), store_owners(store_name)')
      .eq('status', 'active')
      .lt('due_date', now)

    if (error) {
      console.error('Get overdue credits error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get overdue credits error:', error)
    return []
  }
}

/**
 * Mark overdue credits
 * Run this periodically to update status
 */
export async function markOverdueCredits(): Promise<number> {
  try {
    const now = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .update({ status: 'overdue' })
      .eq('status', 'active')
      .lt('due_date', now)
      .select()

    if (error) {
      console.error('Mark overdue credits error:', error)
      return 0
    }

    return data?.length || 0
  } catch (error) {
    console.error('Mark overdue credits error:', error)
    return 0
  }
}

/**
 * Get credit entry with full details (including borrower and store owner info)
 */
export async function getCreditEntryWithDetails(id: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('credit_entries')
      .select(`
        *,
        borrowers (
          full_name,
          email,
          display_name,
          phone_number,
          citizenship_verified_at
        ),
        store_owners (
          store_name,
          email,
          phone_number,
          store_address,
          city,
          state
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get credit details error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Get credit details error:', error)
    return null
  }
}

/**
 * Cancel credit entry
 */
export async function cancelCreditEntry(id: string, reason?: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('credit_entries')
      .update({
        status: 'cancelled',
        description: reason
          ? `Cancelled: ${reason}`
          : 'Cancelled by user',
      })
      .eq('id', id)

    if (error) {
      console.error('Cancel credit error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Cancel credit error:', error)
    return false
  }
}

/**
 * Delete credit entry (hard delete)
 */
export async function deleteCreditEntry(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('credit_entries')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete credit error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete credit error:', error)
    return false
  }
}

/**
 * Get credit statistics for a specific period
 */
export async function getCreditStats(
  startDate: string,
  endDate: string,
  storeOwnerPubkey?: string
) {
  try {
    let query = supabaseAdmin
      .from('credit_entries')
      .select('credit_amount, stripe_repayment_amount, status')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (storeOwnerPubkey) {
      query = query.eq('store_owner_pubkey', storeOwnerPubkey)
    }

    const { data, error } = await query

    if (error) {
      console.error('Get credit stats error:', error)
      return null
    }

    const stats = {
      totalCredits: data.length,
      totalAmount: data.reduce((sum, entry) => sum + entry.credit_amount, 0),
      totalRepaid: data.reduce((sum, entry) => sum + entry.stripe_repayment_amount, 0),
      activeCount: data.filter((e) => e.status === 'active').length,
      completedCount: data.filter((e) => e.status === 'completed').length,
      overdueCount: data.filter((e) => e.status === 'overdue').length,
      cancelledCount: data.filter((e) => e.status === 'cancelled').length,
    }

    return stats
  } catch (error) {
    console.error('Get credit stats error:', error)
    return null
  }
}
