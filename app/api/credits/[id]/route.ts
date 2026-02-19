import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryWithDetails } from '@/lib/services'

/**
 * GET /api/credits/[id]
 * Get credit entry with full details (borrower + store owner info)
 */
async function handler(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const user = (req as any).user
    const creditId = context.params.id

    if (!creditId) {
      return errorResponse('Credit ID is required', 400)
    }

    const credit = await getCreditEntryWithDetails(creditId)

    if (!credit) {
      return errorResponse('Credit not found', 404)
    }

    // Verify user has access to this credit
    const isAuthorized =
      credit.borrower_pubkey === user.walletAddress ||
      credit.store_owner_pubkey === user.walletAddress

    if (!isAuthorized) {
      return errorResponse('Unauthorized to view this credit', 403)
    }

    return successResponse(credit)
  } catch (error) {
    console.error('[Get Credit] Error:', error)
    return errorResponse('Failed to fetch credit', 500)
  }
}

export const GET = withAuth(handler)
