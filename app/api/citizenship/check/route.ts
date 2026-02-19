import { NextRequest } from 'next/server'
import {
  validateCitizenshipNumber,
  hashCitizenshipNumber,
} from '@/lib/citizenship-utils'
import { checkCitizenshipAvailability, logVerificationAttempt } from '@/lib/services'
import { successResponse, errorResponse } from '@/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  try {
    const { citizenship_number, wallet_address } = await request.json()

    // Validate input
    if (!citizenship_number) {
      return errorResponse('Citizenship number is required', 400)
    }

    // Validate format
    const validation = validateCitizenshipNumber(citizenship_number)
    if (!validation.valid) {
      return errorResponse(validation.error || 'Invalid citizenship number', 400)
    }

    // Hash the citizenship number
    const citizenshipHash = hashCitizenshipNumber(citizenship_number)

    // Check if citizenship already exists
    const { available, existingRegistration } = await checkCitizenshipAvailability(citizenshipHash)

    // Log verification attempt
    if (wallet_address) {
      const attemptStatus = available ? 'allowed' : 'rejected_duplicate'
      const attemptNotes = available 
        ? 'Citizenship number is available' 
        : 'Citizenship number already registered'
      
      await logVerificationAttempt(
        citizenshipHash,
        wallet_address,
        attemptStatus,
        attemptNotes,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      )
    }

    if (!available && existingRegistration) {
      return successResponse({
        available: false,
        message: 'This citizenship number is already registered. Each person can only have one KhataChain account.',
        existingWallet: existingRegistration.first_wallet_address,
        status: existingRegistration.status,
      })
    }

    return successResponse({
      available: true,
      message: 'This citizenship number is available for registration',
      citizenshipHash,
    })
  } catch (error) {
    console.error('[Citizenship Check] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to check citizenship',
      500
    )
  }
}

