import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getBorrowerByPubkey, updateBorrower } from '@/lib/services'

/**
 * GET /api/borrower/profile
 * Get borrower's profile
 */
async function getProfile(req: NextRequest) {
  try {
    const user = (req as any).user

    const borrower = await getBorrowerByPubkey(user.walletAddress)

    if (!borrower) {
      return errorResponse('Borrower profile not found', 404)
    }

    return successResponse(borrower)
  } catch (error) {
    console.error('[Borrower Profile GET] Error:', error)
    return errorResponse('Failed to fetch profile', 500)
  }
}

/**
 * PUT /api/borrower/profile
 * Update borrower's profile
 */
async function updateProfile(req: NextRequest) {
  try {
    const user = (req as any).user
    const body = await req.json()

    // Remove fields that shouldn't be updated directly
    const { borrower_pubkey, id, created_at, ...updates } = body

    const updatedBorrower = await updateBorrower(user.walletAddress, updates)

    if (!updatedBorrower) {
      return errorResponse('Failed to update profile', 500)
    }

    return successResponse(updatedBorrower)
  } catch (error) {
    console.error('[Borrower Profile PUT] Error:', error)
    return errorResponse('Failed to update profile', 500)
  }
}

export const GET = withAuth(getProfile, 'borrower')
export const PUT = withAuth(updateProfile, 'borrower')
