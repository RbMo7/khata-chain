import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse, validateRequiredFields } from '@/lib/middleware/auth.middleware'
import { createCreditEntry, getBorrowerByPubkey } from '@/lib/services'

/**
 * POST /api/credits/create
 * Create a new credit entry (Store owners only)
 * 
 * Body: {
 *   borrowerPubkey: string,
 *   creditAmount: number (in paise),
 *   currency: string (default: 'INR'),
 *   description: string,
 *   dueDate: string (ISO date),
 *   interestRate?: number,
 *   gracePeriodDays?: number
 * }
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const body = await req.json()

    // Validate required fields
    const validation = validateRequiredFields(body, [
      'borrowerPubkey',
      'creditAmount',
      'description',
      'dueDate',
    ])

    if (!validation.valid) {
      return errorResponse(validation.error!, 400)
    }

    const {
      borrowerPubkey,
      creditAmount,
      currency = 'INR',
      description,
      dueDate,
      interestRate,
      gracePeriodDays,
    } = body

    // Validate credit amount
    if (creditAmount <= 0) {
      return errorResponse('Credit amount must be greater than 0', 400)
    }

    // Verify borrower exists
    const borrower = await getBorrowerByPubkey(borrowerPubkey)
    if (!borrower) {
      return errorResponse('Borrower not found', 404)
    }

    // Validate due date is in future
    const dueDateObj = new Date(dueDate)
    if (dueDateObj <= new Date()) {
      return errorResponse('Due date must be in the future', 400)
    }

    // Create credit entry
    const credit = await createCreditEntry({
      borrower_pubkey: borrowerPubkey,
      store_owner_pubkey: user.walletAddress,
      credit_amount: Math.round(creditAmount), // Ensure integer
      currency,
      description,
      due_date: dueDateObj.toISOString(),
    })

    if (!credit) {
      return errorResponse('Failed to create credit entry', 500)
    }

    return successResponse({
      credit,
      message: 'Credit entry created successfully',
    }, 201)
  } catch (error) {
    console.error('[Create Credit] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to create credit',
      500
    )
  }
}

export const POST = withAuth(handler, 'store-owner')
