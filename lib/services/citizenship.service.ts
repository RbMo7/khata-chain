/**
 * Citizenship Service
 * Handles citizenship verification and registration
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type CitizenshipRegistration = Database['public']['Tables']['citizenship_registrations']['Row']
type CitizenshipLog = Database['public']['Tables']['citizenship_verification_logs']['Row']

/**
 * Check if a citizenship hash is already registered
 */
export async function checkCitizenshipAvailability(
  citizenshipHash: string
): Promise<{ available: boolean; existingRegistration?: CitizenshipRegistration }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('citizenship_registrations')
      .select('*')
      .eq('citizenship_number_hash', citizenshipHash)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - which is what we want
      console.error('Check citizenship error:', error)
      return { available: false }
    }

    return {
      available: !data,
      existingRegistration: data || undefined,
    }
  } catch (error) {
    console.error('Check citizenship error:', error)
    return { available: false }
  }
}

/**
 * Register a new citizenship hash
 */
export async function registerCitizenship(
  citizenshipHash: string,
  borrowerPubkey: string,
  walletAddress: string
): Promise<CitizenshipRegistration | null> {
  try {
    // First check if it's already registered
    const { available } = await checkCitizenshipAvailability(citizenshipHash)

    if (!available) {
      console.error('Citizenship already registered')
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('citizenship_registrations')
      .insert({
        citizenship_number_hash: citizenshipHash,
        borrower_pubkey: borrowerPubkey,
        first_wallet_address: walletAddress,
        status: 'active',
        verified_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Register citizenship error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Register citizenship error:', error)
    return null
  }
}

/**
 * Log a citizenship verification attempt
 */
export async function logVerificationAttempt(
  citizenshipHash: string,
  walletAddress: string,
  result: 'allowed' | 'rejected_duplicate' | 'rejected_invalid',
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<CitizenshipLog | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('citizenship_verification_logs')
      .insert({
        citizenship_hash: citizenshipHash,
        wallet_address: walletAddress,
        verification_result: result,
        reason,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error('Log verification error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Log verification error:', error)
    return null
  }
}

/**
 * Get citizenship registration by borrower pubkey
 */
export async function getCitizenshipByBorrower(
  borrowerPubkey: string
): Promise<CitizenshipRegistration | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('citizenship_registrations')
      .select('*')
      .eq('borrower_pubkey', borrowerPubkey)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Get citizenship error:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Get citizenship error:', error)
    return null
  }
}

/**
 * Get all verification attempts for a citizenship hash
 */
export async function getVerificationHistory(
  citizenshipHash: string
): Promise<CitizenshipLog[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('citizenship_verification_logs')
      .select('*')
      .eq('citizenship_hash', citizenshipHash)
      .order('verification_attempt_at', { ascending: false })

    if (error) {
      console.error('Get verification history error:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Get verification history error:', error)
    return []
  }
}

/**
 * Suspend a citizenship registration
 */
export async function suspendCitizenship(
  borrowerPubkey: string,
  reason: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('citizenship_registrations')
      .update({ status: 'suspended' })
      .eq('borrower_pubkey', borrowerPubkey)

    if (error) {
      console.error('Suspend citizenship error:', error)
      return false
    }

    // Log the suspension
    const registration = await getCitizenshipByBorrower(borrowerPubkey)
    if (registration) {
      await logVerificationAttempt(
        registration.citizenship_number_hash,
        registration.first_wallet_address,
        'rejected_invalid',
        `Suspended: ${reason}`
      )
    }

    return true
  } catch (error) {
    console.error('Suspend citizenship error:', error)
    return false
  }
}

/**
 * Reactivate a suspended citizenship registration
 */
export async function reactivateCitizenship(borrowerPubkey: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('citizenship_registrations')
      .update({
        status: 'active',
        verified_at: new Date().toISOString(),
      })
      .eq('borrower_pubkey', borrowerPubkey)

    if (error) {
      console.error('Reactivate citizenship error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Reactivate citizenship error:', error)
    return false
  }
}

/**
 * Get citizenship statistics
 */
export async function getCitizenshipStats() {
  try {
    // Total registrations
    const { count: totalRegistrations } = await supabaseAdmin
      .from('citizenship_registrations')
      .select('*', { count: 'exact', head: true })

    // Active registrations
    const { count: activeRegistrations } = await supabaseAdmin
      .from('citizenship_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    // Suspended registrations
    const { count: suspendedRegistrations } = await supabaseAdmin
      .from('citizenship_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'suspended')

    // Total verification attempts
    const { count: totalAttempts } = await supabaseAdmin
      .from('citizenship_verification_logs')
      .select('*', { count: 'exact', head: true })

    // Rejected duplicates
    const { count: rejectedDuplicates } = await supabaseAdmin
      .from('citizenship_verification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('verification_result', 'rejected_duplicate')

    return {
      totalRegistrations: totalRegistrations || 0,
      activeRegistrations: activeRegistrations || 0,
      suspendedRegistrations: suspendedRegistrations || 0,
      totalAttempts: totalAttempts || 0,
      rejectedDuplicates: rejectedDuplicates || 0,
    }
  } catch (error) {
    console.error('Get citizenship stats error:', error)
    return {
      totalRegistrations: 0,
      activeRegistrations: 0,
      suspendedRegistrations: 0,
      totalAttempts: 0,
      rejectedDuplicates: 0,
    }
  }
}

/**
 * Delete citizenship registration (admin only)
 */
export async function deleteCitizenshipRegistration(
  borrowerPubkey: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('citizenship_registrations')
      .delete()
      .eq('borrower_pubkey', borrowerPubkey)

    if (error) {
      console.error('Delete citizenship error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete citizenship error:', error)
    return false
  }
}
