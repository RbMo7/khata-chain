import { NextRequest } from 'next/server'
import { withAuth, successResponse } from '@/lib/middleware/auth.middleware'
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
    // Likely the extension_requests table doesn't exist yet — degrade gracefully
    console.error('[Store Owner Extensions] error (run 03-extension-schema.sql if table is missing):', err)
    return successResponse({ extensions: [], count: 0 })
  }
}

export const GET = withAuth(handler, 'store-owner')
