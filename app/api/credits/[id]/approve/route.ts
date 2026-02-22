import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { getCreditEntryById, updateCreditStatus, getBorrowerByPubkey } from '@/lib/services'
import { createCreditNFT } from '@/lib/solana/credit-nft'
import { onCreditAccepted } from '@/lib/services/reputation.service'

/**
 * POST /api/credits/[id]/approve
 * Approve a pending credit request (Borrowers only)
 * 
 * When borrower approves:
 * 1. Updates status to 'active'
 * 2. Creates Solana NFT representing the credit agreement
 * 3. Stores NFT mint address in database
 * 4. Sets approved_at timestamp
 */
async function handler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = (req as any).user
    const { id: creditId } = await params

    // Get credit entry
    const credit = await getCreditEntryById(creditId)
    if (!credit) {
      return errorResponse('Credit entry not found', 404)
    }

    // Verify borrower owns this credit
    if (credit.borrower_pubkey !== user.walletAddress) {
      return errorResponse('Unauthorized: This credit does not belong to you', 403)
    }

    // Verify borrower has completed NID verification
    const borrower = await getBorrowerByPubkey(user.walletAddress)
    if (!borrower?.citizenship_verified_at) {
      return errorResponse(
        'You must complete NID verification before accepting credit. Visit your profile to verify.',
        403
      )
    }

    // Verify credit is pending approval
    if (credit.status !== 'pending_approval') {
      return errorResponse(`Cannot approve credit with status: ${credit.status}`, 400)
    }

    // Create Solana smart contract (NFT minting)
    let nftMintAddress: string | undefined
    try {
      nftMintAddress = await createCreditNFT({
        borrowerPubkey: credit.borrower_pubkey,
        storeOwnerPubkey: credit.store_owner_pubkey,
        amount: credit.credit_amount,
        dueDate: credit.due_date,
        creditId: credit.id,
        description: credit.description
      })
      console.log(`[Approve Credit] Created NFT: ${nftMintAddress}`)
    } catch (nftError) {
      console.error('[Approve Credit] NFT creation failed:', nftError)
      // Continue without NFT for now - it can be created later
      // In production, you may want to fail the approval if NFT creation is critical
    }

    // Update credit status to active
    const updatedCredit = await updateCreditStatus(creditId, 'active', {
      approved_at: new Date().toISOString(),
      nft_mint_address: nftMintAddress
    })

    if (!updatedCredit) {
      return errorResponse('Failed to approve credit', 500)
    }

    // Update reputation – credit accepted by borrower
    try {
      await onCreditAccepted(user.walletAddress, creditId)
    } catch (repErr) {
      console.error('[Approve Credit] Reputation update failed (non-fatal):', repErr)
    }

    return successResponse({
      credit: updatedCredit,
      message: 'Credit approved successfully',
      nftMintAddress: nftMintAddress,
    })
  } catch (error) {
    console.error('[Approve Credit] Error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to approve credit',
      500
    )
  }
}

export const POST = withAuth(handler, 'borrower')
