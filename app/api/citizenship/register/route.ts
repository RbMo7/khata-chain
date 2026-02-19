import { NextRequest } from 'next/server'
import {
  validateCitizenshipNumber,
  hashCitizenshipNumber,
} from '@/lib/citizenship-utils'
import {
  checkCitizenshipAvailability,
  registerCitizenship,
  logVerificationAttempt,
  updateCitizenshipVerification,
} from '@/lib/services'
import { successResponse, errorResponse, validateRequiredFields } from '@/lib/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { citizenship_number, borrower_pubkey, wallet_address } = body

    // Validate required fields
    const validation = validateRequiredFields(body, [
      'citizenship_number',
      'borrower_pubkey',
      'wallet_address',
    ])

    if (!validation.valid) {
      return errorResponse(validation.error!, 400)
    }

    // Validate citizenship number format
    const formatValidation = validateCitizenshipNumber(citizenship_number)
    if (!formatValidation.valid) {
      return errorResponse(formatValidation.error || 'Invalid citizenship number', 400)
    }

    // Hash the citizenship number
    const citizenshipHash = hashCitizenshipNumber(citizenship_number)

    // Check availability
    const { available } = await checkCitizenshipAvailability(citizenshipHash)

    if (!available) {
      // Log rejection
      await logVerificationAttempt(
        citizenshipHash,
        wallet_address,
        'rejected_duplicate',
        'Citizenship number already registered',
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      )

      return errorResponse(
        'This citizenship number is already registered. Each person can only have one KhataChain account.',
        400
      )
    }

    // Register the citizenship
    const registration = await registerCitizenship(
      citizenshipHash,
      borrower_pubkey,
      wallet_address
    )

    if (!registration) {
      // Log failure
      await logVerificationAttempt(
        citizenshipHash,
        wallet_address,
        'rejected_invalid',
        'Failed to register citizenship',
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      )

      return errorResponse('Failed to register citizenship', 500)
    }

    // Update borrower's citizenship verification status
    await updateCitizenshipVerification(borrower_pubkey, citizenshipHash)

    // Log successful registration
    await logVerificationAttempt(
      citizenshipHash,
      wallet_address,
      'allowed',
      'Citizenship registered successfully',
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined
    )

    return successResponse({
      success: true,
      message: 'Citizenship registered successfully',
      registrationId: registration.id,
      citizenshipHash,
    })
  } catch (error) {
    console.error('[Citizenship Register] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to register citizenship',
      500
    )
  }
}
