/**
 * Extension Requests Service
 * Manages due-date extension requests between borrowers and store owners.
 *
 * Rules:
 *   - A credit can only have ONE extension request (enforced by DB UNIQUE constraint)
 *   - Only overdue (or active) credits may be extended
 *   - Only the borrower who owns the credit may request
 *   - Only the store owner who issued the credit may respond
 */

import { supabaseAdmin } from '../supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtensionRequest {
  id: string
  credit_entry_id: string
  borrower_pubkey: string
  store_owner_pubkey: string
  requested_days: number
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  adjusted_days: number | null
  response_message: string | null
  created_at: string
  responded_at: string | null
  // Joined fields from related tables
  borrower?: { full_name: string | null; display_name: string | null; email: string }
  credit_entry?: {
    credit_amount: number
    description: string | null
    due_date: string
    status: string
    borrower_pubkey: string
    store_owner_pubkey: string
  }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Get the extension request for a given credit (if any).
 */
export async function getExtensionRequest(
  creditEntryId: string
): Promise<ExtensionRequest | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('extension_requests')
      .select('*, borrower:borrowers(full_name, display_name, email)')
      .eq('credit_entry_id', creditEntryId)
      .maybeSingle()

    if (error) {
      console.error('getExtensionRequest error:', error)
      return null
    }

    return data as ExtensionRequest | null
  } catch (err) {
    console.error('getExtensionRequest error:', err)
    return null
  }
}

/**
 * Get all pending extension requests for a store owner.
 */
export async function getPendingExtensionRequestsForStoreOwner(
  storeOwnerPubkey: string
): Promise<ExtensionRequest[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('extension_requests')
      .select(
        `*,
         borrower:borrowers(full_name, display_name, email),
         credit_entry:credit_entries(credit_amount, description, due_date, status)`
      )
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getPendingExtensionRequestsForStoreOwner error:', error)
      return []
    }

    return (data as ExtensionRequest[]) || []
  } catch (err) {
    console.error('getPendingExtensionRequestsForStoreOwner error:', err)
    return []
  }
}

/**
 * Get all extension requests for a store owner (all statuses).
 */
export async function getAllExtensionRequestsForStoreOwner(
  storeOwnerPubkey: string
): Promise<ExtensionRequest[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('extension_requests')
      .select(
        `*,
         borrower:borrowers(full_name, display_name, email),
         credit_entry:credit_entries(credit_amount, description, due_date, status)`
      )
      .eq('store_owner_pubkey', storeOwnerPubkey)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getAllExtensionRequestsForStoreOwner error:', error)
      return []
    }

    return (data as ExtensionRequest[]) || []
  } catch (err) {
    console.error('getAllExtensionRequestsForStoreOwner error:', err)
    return []
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create an extension request.
 * Throws with a user-facing error message if creation fails (e.g. duplicate).
 */
export async function createExtensionRequest(params: {
  creditEntryId: string
  borrowerPubkey: string
  storeOwnerPubkey: string
  requestedDays: number
  message?: string
}): Promise<ExtensionRequest> {
  const { data, error } = await supabaseAdmin
    .from('extension_requests')
    .insert({
      credit_entry_id: params.creditEntryId,
      borrower_pubkey: params.borrowerPubkey,
      store_owner_pubkey: params.storeOwnerPubkey,
      requested_days: params.requestedDays,
      message: params.message || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Unique-constraint violation – already requested
      throw new Error('An extension has already been requested for this credit.')
    }
    console.error('createExtensionRequest error:', error)
    throw new Error('Failed to create extension request.')
  }

  return data as ExtensionRequest
}

/**
 * Accept an extension request.
 * - Updates extension_request status to 'accepted'
 * - Advances credit's due_date by `finalDays`
 * - If credit was 'overdue', resets it to 'active'
 */
export async function acceptExtensionRequest(
  extensionRequestId: string,
  finalDays: number,
  responseMessage?: string
): Promise<ExtensionRequest | null> {
  // 1. Fetch the request
  const { data: ext, error: fetchErr } = await supabaseAdmin
    .from('extension_requests')
    .select('*, credit_entry:credit_entries(due_date, status)')
    .eq('id', extensionRequestId)
    .single()

  if (fetchErr || !ext) {
    console.error('acceptExtensionRequest – fetch error:', fetchErr)
    throw new Error('Extension request not found.')
  }

  if (ext.status !== 'pending') {
    throw new Error('This extension request has already been responded to.')
  }

  const creditEntry = (ext as any).credit_entry
  const currentDueDate = new Date(creditEntry.due_date)
  const newDueDate = new Date(currentDueDate.getTime() + finalDays * 24 * 60 * 60 * 1000)

  // 2. Update extension_request
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('extension_requests')
    .update({
      status: 'accepted',
      adjusted_days: finalDays !== ext.requested_days ? finalDays : null,
      response_message: responseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', extensionRequestId)
    .select()
    .single()

  if (updateErr) {
    console.error('acceptExtensionRequest – update error:', updateErr)
    throw new Error('Failed to update extension request.')
  }

  // 3. Advance due_date (and reset to 'active' if overdue)
  const creditUpdates: Record<string, any> = {
    due_date: newDueDate.toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (creditEntry.status === 'overdue') {
    creditUpdates.status = 'active'
  }

  const { error: creditErr } = await supabaseAdmin
    .from('credit_entries')
    .update(creditUpdates)
    .eq('id', ext.credit_entry_id)

  if (creditErr) {
    console.error('acceptExtensionRequest – credit update error:', creditErr)
    // Non-fatal – extension row is already updated
  }

  return updated as ExtensionRequest
}

/**
 * Decline an extension request.
 */
export async function declineExtensionRequest(
  extensionRequestId: string,
  responseMessage?: string
): Promise<ExtensionRequest | null> {
  const { data: current } = await supabaseAdmin
    .from('extension_requests')
    .select('status')
    .eq('id', extensionRequestId)
    .single()

  if (!current) throw new Error('Extension request not found.')
  if (current.status !== 'pending') throw new Error('This extension request has already been responded to.')

  const { data, error } = await supabaseAdmin
    .from('extension_requests')
    .update({
      status: 'declined',
      response_message: responseMessage || null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', extensionRequestId)
    .select()
    .single()

  if (error) {
    console.error('declineExtensionRequest error:', error)
    throw new Error('Failed to decline extension request.')
  }

  return data as ExtensionRequest
}
