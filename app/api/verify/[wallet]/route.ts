/**
 * GET /api/verify/[wallet]
 *
 * Fully public — no auth required.
 * Returns a borrower's reputation proof: score, tier, stats, all repayment
 * Explorer links, and the on-chain hash commitment so anyone can verify.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getReputationTier } from '@/lib/services/reputation.service'
import { getBadgeTier } from '@/lib/services/loyalty.service'
import { getPlatformPublicKey } from '@/lib/solana/anchor-server'

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'

function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params

  if (!wallet || wallet.length < 32) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  // ── Reputation row ────────────────────────────────────────────────────────
  const { data: rep } = await supabaseAdmin
    .from('borrower_reputation')
    .select(
      'reputation_score, total_credits, on_time_payments, early_payments, ' +
      'late_payments_minor, late_payments_major, late_payments_severe, ' +
      'citizenship_bonus_applied, reputation_hash, reputation_hash_tx, ' +
      'reputation_anchored_at, updated_at, total_rewards_earned_sol'
    )
    .eq('borrower_pubkey', wallet)
    .single()

  if (!rep) {
    return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
  }

  const tier = getReputationTier(rep.reputation_score)
  const badgeTier = getBadgeTier(rep.reputation_score)

  // ── Completed credits with on-chain proof ────────────────────────────────
  const { data: credits } = await supabaseAdmin
    .from('credit_entries')
    .select(
      'id, credit_amount, currency, due_date, status, ' +
      'repayment_tx_signature, tx_signature, created_at, updated_at'
    )
    .eq('borrower_pubkey', wallet)
    .in('status', ['completed', 'active', 'overdue'])
    .order('created_at', { ascending: false })

  function mapCredit(c: any) {
    return {
      id: c.id,
      amountNPR: c.credit_amount / 100,
      currency: c.currency,
      dueDate: c.due_date,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      daysOverdue: c.due_date && c.status === 'overdue'
        ? Math.max(0, Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86_400_000))
        : null,
      creditCreationTx: c.tx_signature
        ? { signature: c.tx_signature, explorerUrl: explorerTx(c.tx_signature) }
        : null,
      repaymentTx: c.repayment_tx_signature
        ? { signature: c.repayment_tx_signature, explorerUrl: explorerTx(c.repayment_tx_signature) }
        : null,
    }
  }

  const all = credits ?? []
  const completedCredits = all.filter((c) => c.status === 'completed').map(mapCredit)
  const overdueCredits   = all.filter((c) => c.status === 'overdue').map(mapCredit)
  const activeCredits    = all.filter((c) => c.status === 'active').map(mapCredit)

  // ── On-chain proof block ──────────────────────────────────────────────────
  const onChainProof = rep.reputation_hash
    ? {
        hash: rep.reputation_hash,
        txSignature: rep.reputation_hash_tx,
        explorerUrl: rep.reputation_hash_tx ? explorerTx(rep.reputation_hash_tx) : null,
        anchoredAt: rep.reputation_anchored_at,
        platformSigner: getPlatformPublicKey(),
        platformSignerExplorer: `https://explorer.solana.com/address/${getPlatformPublicKey()}?cluster=${NETWORK}`,
        verified: true,
      }
    : null

  return NextResponse.json(
    {
      walletAddress: wallet,
      score: rep.reputation_score,
      tier: { label: tier.label, color: tier.color, description: tier.description },
      badge_tier: badgeTier,
      total_rewards_earned_sol: rep.total_rewards_earned_sol || 0,
      stats: {
        totalCredits: rep.total_credits ?? 0,
        onTimePayments: rep.on_time_payments ?? 0,
        earlyPayments: rep.early_payments ?? 0,
        latePaymentsMinor: rep.late_payments_minor ?? 0,
        latePaymentsMajor: rep.late_payments_major ?? 0,
        latePaymentsSevere: rep.late_payments_severe ?? 0,
        citizenshipVerified: rep.citizenship_bonus_applied ?? false,
      },
      completedCredits,
      overdueCredits,
      activeCredits,
      onChainProof,
      scoreUpdatedAt: rep.updated_at,
      network: NETWORK,
    },
    {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
    }
  )
}
