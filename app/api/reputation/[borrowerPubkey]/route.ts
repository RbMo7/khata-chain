import { NextRequest, NextResponse } from 'next/server'
import {
  getReputation,
  initReputationIfNeeded,
  getReputationTier,
  isLowScore,
  isCriticalScore,
} from '@/lib/services/reputation.service'

/**
 * GET /api/reputation/[borrowerPubkey]
 * Public endpoint – used by store owners when viewing a borrower's score
 * before issuing credit. Returns score + tier + warning flags.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ borrowerPubkey: string }> }
) {
  try {
    const { borrowerPubkey } = await params

    if (!borrowerPubkey) {
      return NextResponse.json({ error: 'borrowerPubkey is required' }, { status: 400 })
    }

    // Auto-init if missing (first time a store owner looks up a new borrower)
    let reputation = await getReputation(borrowerPubkey)
    if (!reputation) {
      reputation = await initReputationIfNeeded(borrowerPubkey)
    }

    if (!reputation) {
      return NextResponse.json({ error: 'Borrower not found' }, { status: 404 })
    }

    const tier = getReputationTier(reputation.reputation_score)
    const low = isLowScore(reputation.reputation_score)
    const critical = isCriticalScore(reputation.reputation_score)

    return NextResponse.json({
      success: true,
      data: {
        borrower_pubkey: reputation.borrower_pubkey,
        reputation_score: reputation.reputation_score,
        tier: tier.label,
        warning: low
          ? critical
            ? 'Critical – this borrower has very poor credit history. Exercise extreme caution.'
            : 'Low score – this borrower has a below-average credit history. Review carefully before extending credit.'
          : null,
        is_low_score: low,
        is_critical_score: critical,
        stats: {
          total_credits: reputation.total_credits,
          on_time_payments: reputation.on_time_payments,
          early_payments: reputation.early_payments,
          late_payments_minor: reputation.late_payments_minor,
          late_payments_major: reputation.late_payments_major,
          late_payments_severe: reputation.late_payments_severe,
          overdue_credits: reputation.overdue_credits,
          avg_payment_offset_days: reputation.avg_payment_offset_days,
        },
      },
    })
  } catch (error) {
    console.error('[Reputation public] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch reputation' }, { status: 500 })
  }
}
