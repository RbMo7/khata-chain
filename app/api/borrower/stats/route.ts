import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getBorrowerStats } from '@/lib/services'

/**
 * GET /api/borrower/stats
 * Get borrower's statistics
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    const stats = await getBorrowerStats(user.walletAddress)

    return successResponse(stats)
  } catch (error) {
    console.error('[Borrower Stats] Error:', error)
    return errorResponse('Failed to fetch statistics', 500)
  }
}

export const GET = withAuth(handler, 'borrower')
