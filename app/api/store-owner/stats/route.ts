import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getStoreOwnerStats, markOverdueCredits } from '@/lib/services'

/**
 * GET /api/store-owner/stats
 * Get store owner's statistics
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    // Flip any active credits past their due date to 'overdue' before counting
    await markOverdueCredits()

    const stats = await getStoreOwnerStats(user.walletAddress)

    return successResponse(stats)
  } catch (error) {
    console.error('[Store Owner Stats] Error:', error)
    return errorResponse('Failed to fetch statistics', 500)
  }
}

export const GET = withAuth(handler, 'store-owner')
