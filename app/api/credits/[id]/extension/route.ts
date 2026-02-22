import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById } from '@/lib/services'
import {
  getExtensionRequest,
  createExtensionRequest,
  acceptExtensionRequest,
  declineExtensionRequest,
} from '@/lib/services/extension-requests.service'

// ---------------------------------------------------------------------------
// GET /api/credits/[id]/extension
// Returns the extension request for a credit (any authenticated party).
// ---------------------------------------------------------------------------
async function getHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = (req as any).user
    const { id: creditId } = await params

    const credit = await getCreditEntryById(creditId)
    if (!credit) return errorResponse('Credit not found', 404)

    // Only borrower or store owner of this credit may view
    if (
      credit.borrower_pubkey !== user.walletAddress &&
      credit.store_owner_pubkey !== user.walletAddress
    ) {
      return errorResponse('Unauthorized', 403)
    }

    const ext = await getExtensionRequest(creditId)
    return successResponse({ extension: ext })
  } catch (err) {
    console.error('[Extension GET] error:', err)
    return errorResponse('Failed to fetch extension request', 500)
  }
}

// ---------------------------------------------------------------------------
// POST /api/credits/[id]/extension
// Borrower requests a due-date extension.
// Body: { days: number, message?: string }
// ---------------------------------------------------------------------------
async function postHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = (req as any).user
    const { id: creditId } = await params
    const body = await req.json()

    const { days, message } = body as { days?: number; message?: string }

    if (!days || typeof days !== 'number' || days < 1 || days > 365) {
      return errorResponse('days must be a number between 1 and 365', 400)
    }

    // Verify credit exists and belongs to this borrower
    const credit = await getCreditEntryById(creditId)
    if (!credit) return errorResponse('Credit not found', 404)

    if (credit.borrower_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: This credit does not belong to you', 403)
    }

    // Only overdue or active credits can request extension
    if (!['overdue', 'active'].includes(credit.status)) {
      return errorResponse(
        `Cannot request extension for a "${credit.status}" credit`,
        400
      )
    }

    // Check no extension already exists
    const existing = await getExtensionRequest(creditId)
    if (existing) {
      return errorResponse(
        'An extension has already been requested for this credit (only one allowed)',
        409
      )
    }

    const ext = await createExtensionRequest({
      creditEntryId: creditId,
      borrowerPubkey: user.walletAddress,
      storeOwnerPubkey: credit.store_owner_pubkey,
      requestedDays: days,
      message,
    })

    return successResponse({ extension: ext }, 201)
  } catch (err: any) {
    console.error('[Extension POST] error:', err)
    return errorResponse(err.message || 'Failed to create extension request', 500)
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/credits/[id]/extension
// Store owner responds to an extension request.
// Body: { action: 'accept' | 'decline', adjustedDays?: number, message?: string }
// ---------------------------------------------------------------------------
async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = (req as any).user
    const { id: creditId } = await params
    const body = await req.json()

    const { action, adjustedDays, message } = body as {
      action?: 'accept' | 'decline'
      adjustedDays?: number
      message?: string
    }

    if (!action || !['accept', 'decline'].includes(action)) {
      return errorResponse('action must be "accept" or "decline"', 400)
    }

    // Verify credit belongs to this store owner
    const credit = await getCreditEntryById(creditId)
    if (!credit) return errorResponse('Credit not found', 404)

    if (credit.store_owner_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: You are not the lender for this credit', 403)
    }

    // Fetch extension request
    const ext = await getExtensionRequest(creditId)
    if (!ext) return errorResponse('No extension request found for this credit', 404)
    if (ext.status !== 'pending') {
      return errorResponse('This extension request has already been responded to', 409)
    }

    let result

    if (action === 'accept') {
      // Use adjustedDays if provided, otherwise use the borrower's requested_days
      const finalDays = adjustedDays && adjustedDays > 0 ? adjustedDays : ext.requested_days

      if (adjustedDays !== undefined && (adjustedDays < 1 || adjustedDays > 365)) {
        return errorResponse('adjustedDays must be between 1 and 365', 400)
      }

      result = await acceptExtensionRequest(ext.id, finalDays, message)
    } else {
      result = await declineExtensionRequest(ext.id, message)
    }

    return successResponse({
      extension: result,
      message:
        action === 'accept'
          ? `Extension accepted – due date extended`
          : 'Extension request declined',
    })
  } catch (err: any) {
    console.error('[Extension PATCH] error:', err)
    return errorResponse(err.message || 'Failed to process extension request', 500)
  }
}

export const GET = withAuth(getHandler)
export const POST = withAuth(postHandler, 'borrower')
export const PATCH = withAuth(patchHandler, 'store-owner')
