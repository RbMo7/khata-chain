/**
 * POST /api/solana/anchor-reputation
 *
 * Internal route — anchors a borrower's reputation hash on-chain using the
 * platform keypair.  Protected by CRON_SECRET so it can also be called by
 * Vercel cron jobs or manual backfill scripts.
 *
 * Body: { walletAddress: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { anchorReputationOnChain } from '@/lib/solana/anchor-server'

export async function POST(req: NextRequest) {
  // Allow calls from the same server (reputation service) without a secret,
  // but external callers must supply CRON_SECRET in the Authorization header.
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const isExternal = authHeader !== null
  if (isExternal && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let walletAddress: string
  try {
    const body = await req.json()
    walletAddress = body?.walletAddress
    if (!walletAddress) throw new Error('missing walletAddress')
  } catch {
    return NextResponse.json({ error: 'walletAddress is required' }, { status: 400 })
  }

  // Fetch current reputation row
  const { data: rep, error: fetchErr } = await supabaseAdmin
    .from('borrower_reputation')
    .select('reputation_score, total_credits, on_time_payments, late_payments_minor, late_payments_major, late_payments_severe')
    .eq('borrower_pubkey', walletAddress)
    .single()

  if (fetchErr || !rep) {
    return NextResponse.json({ error: 'Reputation record not found' }, { status: 404 })
  }

  const latePayments =
    (rep.late_payments_minor ?? 0) +
    (rep.late_payments_major ?? 0) +
    (rep.late_payments_severe ?? 0)

  try {
    const { hash, txSignature } = await anchorReputationOnChain({
      walletAddress,
      score: rep.reputation_score,
      totalCredits: rep.total_credits ?? 0,
      onTimePayments: rep.on_time_payments ?? 0,
      latePayments,
    })

    // Save hash + tx signature back to borrower_reputation
    await supabaseAdmin
      .from('borrower_reputation')
      .update({
        reputation_hash: hash,
        reputation_hash_tx: txSignature,
        reputation_anchored_at: new Date().toISOString(),
      })
      .eq('borrower_pubkey', walletAddress)

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
    return NextResponse.json({
      success: true,
      hash,
      txSignature,
      explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`,
    })
  } catch (err: any) {
    console.error('[anchor-reputation] Failed:', err?.message)
    return NextResponse.json(
      { error: 'Failed to anchor on-chain', detail: err?.message },
      { status: 500 }
    )
  }
}
