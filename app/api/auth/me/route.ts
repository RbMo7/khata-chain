import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { authenticateWallet } from '@/lib/services'

/**
 * GET /api/auth/me
 * 
 * Get current authenticated user's profile
 * Requires: Authorization header with wallet address
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user // Attached by withAuth middleware

    // Refresh user data from database
    const freshUser = await authenticateWallet(user.walletAddress)

    if (!freshUser) {
      return errorResponse('User not found', 404)
    }

    return successResponse(freshUser)
  } catch (error) {
    console.error('[Auth Me] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch user',
      500
    )
  }
}

export const GET = withAuth(handler)
