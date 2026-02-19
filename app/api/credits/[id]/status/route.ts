import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById, updateCreditStatus } from '@/lib/services'

/**
 * PATCH /api/credits/[id]/status
 * Update credit status (Store owners only)
 * Body: { status: 'active' | 'overdue' | 'paid' | 'defaulted' | 'disputed' }
 */
async function handler(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = (req as any).user
    const { id: creditId } = await context.params
    const body = await req.json()
    const { status } = body

    if (!status) {
      return errorResponse('Status is required', 400)
    }

    const validStatuses = ['active', 'overdue', 'paid', 'defaulted', 'disputed']
    if (!validStatuses.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        400
      )
    }

    // Get credit to verify ownership
    const credit = await getCreditEntryById(creditId)

    if (!credit) {
      return errorResponse('Credit not found', 404)
    }

    // Verify user is the store owner
    if (credit.store_owner_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: Only the store owner can update credit status', 403)
    }

    // Update status
    const updated = await updateCreditStatus(creditId, status)

    if (!updated) {
      return errorResponse('Failed to update credit status', 500)
    }

    return successResponse({
      credit: updated,
      message: `Credit status updated to ${status}`,
    })
  } catch (error) {
    console.error('[Update Credit Status] Error:', error)
    return errorResponse('Failed to update credit status', 500)
  }
}

export const PATCH = withAuth(handler, 'store-owner')
