import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getBorrowerCredits } from '@/lib/services'

/**
 * GET /api/borrower/credits
 * Get borrower's credits
 * Query params: status (optional) - 'active' | 'overdue' | 'paid' | 'all'
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as any || 'all'

    const credits = await getBorrowerCredits(user.walletAddress, status)

    return successResponse({
      credits,
      total: credits.length,
      status: status === 'all' ? 'all statuses' : status,
    })
  } catch (error) {
    console.error('[Borrower Credits] Error:', error)
    return errorResponse('Failed to fetch credits', 500)
  }
}

export const GET = withAuth(handler, 'borrower')
