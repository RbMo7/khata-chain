import { NextRequest } from 'next/server'
import { withAuth, successResponse } from '@/lib/middleware/auth.middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * GET /api/borrower/extensions
 * Returns all extension requests for the logged-in borrower.
 * Used by the dashboard to show per-credit extension status.
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const borrowerPubkey = user.walletAddress

    const { data, error } = await supabaseAdmin
      .from('extension_requests')
      .select('id, credit_entry_id, requested_days, adjusted_days, status, message, response_message, created_at, responded_at')
      .eq('borrower_pubkey', borrowerPubkey)
      .order('created_at', { ascending: false })

    if (error) {
      // Likely the extension_requests table doesn't exist yet — degrade gracefully
      console.error('[Borrower Extensions] DB error (run 03-extension-schema.sql if table is missing):', error)
      return successResponse({ extensions: {}, list: [] })
    }

    // Keyed by credit_entry_id for easy lookup
    const byCredit: Record<string, any> = {}
    for (const ext of data || []) {
      byCredit[ext.credit_entry_id] = ext
    }

    return successResponse({ extensions: byCredit, list: data || [] })
  } catch (err) {
    console.error('[Borrower Extensions] error (run 03-extension-schema.sql if table is missing):', err)
    return successResponse({ extensions: {}, list: [] })
  }
}

export const GET = withAuth(handler, 'borrower')
