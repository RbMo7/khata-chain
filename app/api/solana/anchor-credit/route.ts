/**
 * POST /api/solana/anchor-credit
 *
 * Anchors a credit creation event on-chain using the platform keypair.
 * No user wallet signature required — the platform signs and pays gas.
 *
 * Called after a borrower approves a credit (status → active).
 * Body: { creditId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendPlatformMemo } from '@/lib/solana/anchor-server'

async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const walletAddress: string = user.walletAddress

    const body = await req.json()
    const { creditId } = body as { creditId: string }

    if (!creditId) {
      return errorResponse('creditId is required', 400)
    }

    // Fetch credit to verify caller is a party to it and to get memo fields
    const { data: credit, error: fetchErr } = await supabaseAdmin
      .from('credit_entries')
      .select('id, borrower_pubkey, store_owner_pubkey, credit_amount, currency, due_date, tx_signature')
      .eq('id', creditId)
      .maybeSingle()

    if (fetchErr || !credit) {
      return errorResponse('Credit not found', 404)
    }

    // Must be the borrower or store owner for this credit
    if (credit.borrower_pubkey !== walletAddress && credit.store_owner_pubkey !== walletAddress) {
      return errorResponse('Unauthorized', 403)
    }

    // Build a compact memo matching the credit_created format
    const memo = JSON.stringify({
      app: 'khatachain',
      v: 1,
      type: 'credit_created',
      id: creditId.slice(0, 8),
      amount: credit.credit_amount,
      currency: credit.currency ?? 'NPR',
      due: credit.due_date,
      borrower: credit.borrower_pubkey.slice(0, 8),
      lender: credit.store_owner_pubkey.slice(0, 8),
      ts: Math.floor(Date.now() / 1000),
    })

    // Platform signs and broadcasts — no user wallet interaction
    const txSignature = await sendPlatformMemo(memo)

    // Persist the tx signature
    await supabaseAdmin
      .from('credit_entries')
      .update({ tx_signature: txSignature })
      .eq('id', creditId)

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
    const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`

    return successResponse({
      txSignature,
      explorerUrl,
    })
  } catch (err: any) {
    console.error('[anchor-credit] Failed:', err?.message)
    return NextResponse.json(
      { error: 'Failed to anchor credit on-chain', detail: err?.message },
      { status: 500 }
    )
  }
}

export const POST = withAuth(handler)
