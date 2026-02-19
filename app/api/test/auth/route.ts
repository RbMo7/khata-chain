import { NextRequest, NextResponse } from 'next/server'
import { 
  getOrCreateUser, 
  authenticateWallet,
  getBorrowerByPubkey,
  getStoreOwnerByPubkey 
} from '@/lib/services'

/**
 * Auth Service Test Endpoint
 * 
 * Test creating and authenticating users
 * 
 * POST /api/test/auth
 * Body: { "walletAddress": "...", "userType": "borrower" | "store-owner" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { walletAddress, userType } = body

    if (!walletAddress || !userType) {
      return NextResponse.json(
        { error: 'walletAddress and userType are required' },
        { status: 400 }
      )
    }

    if (userType !== 'borrower' && userType !== 'store-owner') {
      return NextResponse.json(
        { error: 'userType must be "borrower" or "store-owner"' },
        { status: 400 }
      )
    }

    // Step 1: Get or create user
    console.log(`[Test Auth] Creating/fetching user for ${walletAddress}`)
    const user = await getOrCreateUser(
      walletAddress,
      userType,
      `${walletAddress.slice(0, 8)}@test.com`
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create/fetch user' },
        { status: 500 }
      )
    }

    // Step 2: Authenticate user
    console.log(`[Test Auth] Authenticating ${walletAddress}`)
    const authUser = await authenticateWallet(walletAddress)

    if (!authUser) {
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 500 }
      )
    }

    // Step 3: Get full user details
    let fullUserData
    if (userType === 'borrower') {
      fullUserData = await getBorrowerByPubkey(walletAddress)
    } else {
      fullUserData = await getStoreOwnerByPubkey(walletAddress)
    }

    return NextResponse.json({
      success: true,
      message: `User ${user.id ? 'authenticated' : 'created'} successfully! ✅`,
      user: authUser,
      details: fullUserData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Test Auth] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        hint: 'Check server logs for details',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/test/auth?wallet=<address>
 * Check if a wallet exists and get their info
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'wallet query parameter is required' },
        { status: 400 }
      )
    }

    const user = await authenticateWallet(walletAddress)

    if (!user) {
      return NextResponse.json({
        exists: false,
        message: 'User not found',
        walletAddress,
      })
    }

    // Get full details based on user type
    let details
    if (user.userType === 'borrower') {
      details = await getBorrowerByPubkey(walletAddress)
    } else {
      details = await getStoreOwnerByPubkey(walletAddress)
    }

    return NextResponse.json({
      exists: true,
      user,
      details,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Test Auth GET] Error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
