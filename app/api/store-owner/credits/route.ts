import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getStoreOwnerCredits, getStoreOwnerRecentCredits } from '@/lib/services'

/**
 * GET /api/store-owner/credits
 * Get store owner's credits (credits they issued)
 * Query params: 
 *   - status (optional) - 'active' | 'overdue' | 'paid' | 'all'
 *   - recent (optional) - 'true' to get recent credits with borrower details
 *   - limit (optional) - number of results (default: 50)
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as any || 'all'
    const recent = searchParams.get('recent') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    if (recent) {
      const credits = await getStoreOwnerRecentCredits(user.walletAddress, limit)
      return successResponse({
        credits,
        total: credits.length,
        type: 'recent',
      })
    }

    const credits = await getStoreOwnerCredits(user.walletAddress, status, limit)

    return successResponse({
      credits,
      total: credits.length,
      status: status === 'all' ? 'all statuses' : status,
    })
  } catch (error) {
    console.error('[Store Owner Credits] Error:', error)
    return errorResponse('Failed to fetch credits', 500)
  }
}

export const GET = withAuth(handler, 'store-owner')
