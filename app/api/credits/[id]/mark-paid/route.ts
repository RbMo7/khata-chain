import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById, updateCreditStatus } from '@/lib/services'
import { onCreditRepaid } from '@/lib/services/reputation.service'

/**
 * POST /api/credits/[id]/mark-paid
 * Mark a credit as paid via cash (Store owners only)
 * 
 * Used when the borrower pays the store owner in cash.
 * Updates credit status to 'completed' and triggers reputation update for the borrower.
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

    // Fetch credit
    const credit = await getCreditEntryById(creditId)
    if (!credit) {
      return errorResponse('Credit not found', 404)
    }

    // Only the store owner who issued this credit can mark it as paid
    if (credit.store_owner_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: Only the store owner can mark this credit as paid', 403)
    }

    // Only active or overdue credits can be marked as paid
    if (!['active', 'overdue'].includes(credit.status)) {
      return errorResponse(
        `Cannot mark a "${credit.status}" credit as paid. Only active or overdue credits can be marked as paid.`,
        400
      )
    }

    const paidAt = new Date().toISOString()

    // Update status to completed and repayment_status to completed
    const updated = await updateCreditStatus(creditId, 'completed', {
      repayment_status: 'completed',
    })

    if (!updated) {
      return errorResponse('Failed to mark credit as paid', 500)
    }

    // Update borrower reputation based on payment timing
    try {
      await onCreditRepaid(
        credit.borrower_pubkey,
        creditId,
        credit.due_date,
        paidAt
      )
    } catch (repErr) {
      console.error('[Mark Paid Cash] Reputation update failed (non-fatal):', repErr)
    }

    return successResponse({
      credit: updated,
      message: 'Credit marked as paid (cash) successfully',
    })
  } catch (error) {
    console.error('[Mark Paid Cash] Error:', error)
    return errorResponse('Failed to mark credit as paid', 500)
  }
}

export const POST = withAuth(handler)
