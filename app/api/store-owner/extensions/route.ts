import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getPendingExtensionRequestsForStoreOwner } from '@/lib/services/extension-requests.service'

/**
 * GET /api/store-owner/extensions
 * Returns pending extension requests for the logged-in store owner.
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const storeOwnerPubkey = user.walletAddress

    const extensions = await getPendingExtensionRequestsForStoreOwner(storeOwnerPubkey)

    return successResponse({ extensions, count: extensions.length })
  } catch (err) {
    console.error('[Store Owner Extensions] error:', err)
    return errorResponse('Failed to fetch extension requests', 500)
  }
}

export const GET = withAuth(handler, 'store-owner')
