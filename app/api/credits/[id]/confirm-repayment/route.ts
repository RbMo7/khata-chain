import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById, updateCreditStatus } from '@/lib/services'
import { onCreditRepaid } from '@/lib/services/reputation.service'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/credits/[id]/confirm-repayment
 *
 * Borrower confirms they have repaid a credit (cash / in-person).
 * Marks the credit as completed and optionally stores a Solana tx signature
 * as on-chain proof of acknowledgment.
 *
 * Body (optional): { txSignature: string }
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = (req as any).user
    const { id: creditId } = await params

    if (!creditId) {
      return errorResponse('Credit ID is required', 400)
    }

    const body = await req.json().catch(() => ({}))
    const { txSignature } = body as { txSignature?: string }

    // Fetch credit
    const credit = await getCreditEntryById(creditId)
    if (!credit) {
      return errorResponse('Credit not found', 404)
    }

    // Only the borrower who owns this credit can confirm repayment
    if (credit.borrower_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: Only the borrower can confirm repayment', 403)
    }

    // Only active or overdue credits can be repaid
    if (!['active', 'overdue'].includes(credit.status)) {
      return errorResponse(
        `Cannot confirm repayment for a "${credit.status}" credit.`,
        400
      )
    }

    const paidAt = new Date().toISOString()

    // Mark credit as completed
    const updated = await updateCreditStatus(creditId, 'completed', {
      repayment_status: 'completed',
      repayment_method: 'on_chain',
    })

    if (!updated) {
      return errorResponse('Failed to update credit status', 500)
    }

    // Save Solana tx signature if provided
    if (txSignature && /^[1-9A-HJ-NP-Za-km-z]{40,100}$/.test(txSignature)) {
      await supabaseAdmin
        .from('credit_entries')
        .update({ repayment_tx_signature: txSignature })
        .eq('id', creditId)
    }

    // Update borrower reputation
    try {
      await onCreditRepaid(
        credit.borrower_pubkey,
        creditId,
        credit.due_date,
        paidAt
      )
    } catch (repErr) {
      console.error('[Confirm Repayment] Reputation update failed (non-fatal):', repErr)
    }

    return successResponse({
      credit: updated,
      message: 'Repayment confirmed successfully',
    })
  } catch (error) {
    console.error('[Confirm Repayment] Error:', error)
    return errorResponse('Failed to confirm repayment', 500)
  }
}

export const POST = withAuth(handler)
