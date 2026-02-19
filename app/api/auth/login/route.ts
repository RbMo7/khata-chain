import { NextRequest, NextResponse } from 'next/server'
import { authenticateWallet, getOrCreateUser } from '@/lib/services'
import { successResponse, errorResponse } from '@/lib/middleware/auth.middleware'

/**
 * POST /api/auth/login
 * 
 * Authenticate user by wallet address
 * Creates user if doesn't exist
 * 
 * Body: { 
 *   walletAddress: string, 
 *   userType: 'borrower' | 'store-owner',
 *   email?: string 
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, userType, email } = body

    // Validate required fields
    if (!walletAddress) {
      return errorResponse('walletAddress is required', 400)
    }

    if (!userType || (userType !== 'borrower' && userType !== 'store-owner')) {
      return errorResponse('userType must be "borrower" or "store-owner"', 400)
    }

    // Try to authenticate existing user
    let user = await authenticateWallet(walletAddress)

    // If user doesn't exist, create them
    if (!user) {
      user = await getOrCreateUser(
        walletAddress,
        userType,
        email || `${walletAddress.slice(0, 8)}@khatachain.com`
      )
    }

    if (!user) {
      return errorResponse('Failed to authenticate or create user', 500)
    }

    return successResponse({
      user,
      isNewUser: !user.id,
      message: user.id ? 'User authenticated successfully' : 'User created successfully',
    })
  } catch (error) {
    console.error('[Auth Login] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Login failed',
      500
    )
  }
}
