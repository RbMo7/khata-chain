import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById, updateCreditStatus } from '@/lib/services'

/**
 * POST /api/credits/[id]/reject
 * Reject a pending credit request (Borrowers only)
 * 
 * Body: {
 *   reason?: string
 * }
 */
async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = (req as any).user
    const creditId = params.id
    const body = await req.json().catch(() => ({}))
    const { reason } = body

    // Get credit entry
    const credit = await getCreditEntryById(creditId)
    if (!credit) {
      return errorResponse('Credit entry not found', 404)
    }

    // Verify borrower owns this credit
    if (credit.borrower_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: This credit does not belong to you', 403)
    }

    // Verify credit is pending approval
    if (credit.status !== 'pending_approval') {
      return errorResponse(`Cannot reject credit with status: ${credit.status}`, 400)
    }

    // Update credit status to rejected
    const updatedCredit = await updateCreditStatus(creditId, 'rejected', {
      rejected_at: new Date().toISOString(),
      rejection_reason: reason || 'Declined by borrower',
    })

    if (!updatedCredit) {
      return errorResponse('Failed to reject credit', 500)
    }

    return successResponse({
      credit: updatedCredit,
      message: 'Credit rejected successfully',
    })
  } catch (error) {
    console.error('[Reject Credit] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to reject credit',
      500
    )
  }
}

export const POST = withAuth(handler, 'borrower')
