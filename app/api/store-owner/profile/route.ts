import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getStoreOwnerByPubkey, updateStoreOwner } from '@/lib/services'

/**
 * GET /api/store-owner/profile
 * Get store owner's profile
 */
async function getProfile(req: NextRequest) {
  try {
    const user = (req as any).user

    const storeOwner = await getStoreOwnerByPubkey(user.walletAddress)

    if (!storeOwner) {
      return errorResponse('Store owner profile not found', 404)
    }

    return successResponse(storeOwner)
  } catch (error) {
    console.error('[Store Owner Profile GET] Error:', error)
    return errorResponse('Failed to fetch profile', 500)
  }
}

/**
 * PUT /api/store-owner/profile
 * Update store owner's profile
 */
async function updateProfile(req: NextRequest) {
  try {
    const user = (req as any).user
    const body = await req.json()

    // Remove fields that shouldn't be updated directly
    const { store_owner_pubkey, id, created_at, ...updates } = body

    const updatedStoreOwner = await updateStoreOwner(user.walletAddress, updates)

    if (!updatedStoreOwner) {
      return errorResponse('Failed to update profile', 500)
    }

    return successResponse(updatedStoreOwner)
  } catch (error) {
    console.error('[Store Owner Profile PUT] Error:', error)
    return errorResponse('Failed to update profile', 500)
  }
}

export const GET = withAuth(getProfile, 'store-owner')
export const PUT = withAuth(updateProfile, 'store-owner')
