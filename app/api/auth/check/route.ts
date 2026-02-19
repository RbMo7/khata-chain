import { NextRequest, NextResponse } from 'next/server'
import { authenticateWallet } from '@/lib/services'
import { successResponse, errorResponse } from '@/lib/middleware/auth.middleware'

/**
 * POST /api/auth/check
 * 
 * Check if a wallet address is already registered
 * 
 * Body: { walletAddress: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return errorResponse('walletAddress is required', 400)
    }

    // Check if user exists
    const user = await authenticateWallet(walletAddress)

    if (user) {
      // User exists - return their data
      return successResponse({
        exists: true,
        user,
      })
    } else {
      // User doesn't exist
      return successResponse({
        exists: false,
      })
    }
  } catch (error) {
    console.error('[Auth Check] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to check wallet',
      500
    )
  }
}
