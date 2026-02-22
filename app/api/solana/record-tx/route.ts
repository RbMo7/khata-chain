import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/solana/record-tx
 *
 * Called from the client after an on-chain transaction is confirmed.
 * Body: { creditId, txSignature, type: 'credit_created' | 'repayment' }
 *
 * Validates:
 *  - creditId belongs to the authenticated user (borrower or store-owner)
 *  - txSignature is a valid base58 string (88 chars)
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const walletAddress: string = user.walletAddress

    const body = await req.json()
    const { creditId, txSignature, type } = body as {
      creditId: string
      txSignature: string
      type: 'credit_created' | 'repayment'
    }

    // Basic validation
    if (!creditId || !txSignature || !type) {
      return errorResponse('creditId, txSignature, and type are required', 400)
    }

    if (!['credit_created', 'repayment'].includes(type)) {
      return errorResponse('type must be credit_created or repayment', 400)
    }

    // Validate tx signature format (base58, 87-88 chars)
    if (!/^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(txSignature)) {
      return errorResponse('Invalid transaction signature format', 400)
    }

    // Fetch the credit to verify ownership
    const { data: credit, error: fetchErr } = await supabaseAdmin
      .from('credit_entries')
      .select('id, borrower_pubkey, store_owner_pubkey')
      .eq('id', creditId)
      .maybeSingle()

    if (fetchErr || !credit) {
      return errorResponse('Credit not found', 404)
    }

    // Authorisation check
    const isStoreOwner = credit.store_owner_pubkey === walletAddress
    const isBorrower = credit.borrower_pubkey === walletAddress

    if (type === 'credit_created' && !isStoreOwner) {
      return errorResponse('Only the store owner can record a credit_created signature', 403)
    }
    if (type === 'repayment' && !isBorrower) {
      return errorResponse('Only the borrower can record a repayment signature', 403)
    }

    // Write to DB
    const column = type === 'credit_created' ? 'tx_signature' : 'repayment_tx_signature'
    const { error: updateErr } = await supabaseAdmin
      .from('credit_entries')
      .update({ [column]: txSignature })
      .eq('id', creditId)

    if (updateErr) {
      console.error('[Solana record-tx] DB update error:', updateErr)
      return errorResponse('Failed to save transaction signature', 500)
    }

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
    return successResponse({
      txSignature,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`,
    })
  } catch (err) {
    console.error('[Solana record-tx] error:', err)
    return errorResponse('Failed to record transaction', 500)
  }
}

// Accessible to both borrowers and store-owners — auth check inside handler
export const POST = withAuth(handler)
