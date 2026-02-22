import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getBorrowerStats, markOverdueCredits } from '@/lib/services'

/**
 * GET /api/borrower/stats
 * Get borrower's statistics
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user

    // Flip any active credits past their due date to 'overdue'
    await markOverdueCredits()

    const stats = await getBorrowerStats(user.walletAddress)

    return successResponse(stats)
  } catch (error) {
    console.error('[Borrower Stats] Error:', error)
    return errorResponse('Failed to fetch statistics', 500)
  }
}

export const GET = withAuth(handler, 'borrower')
