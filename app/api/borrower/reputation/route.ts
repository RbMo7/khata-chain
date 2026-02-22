import { NextRequest } from 'next/server'
import { withAuth, successResponse, errorResponse } from '@/lib/middleware/auth.middleware'
import {
  getReputation,
  getReputationEvents,
  initReputationIfNeeded,
  getReputationTier,
  isLowScore,
  calculateProjectedScores,
} from '@/lib/services/reputation.service'
import { getBorrowerCredits, markOverdueCredits } from '@/lib/services/credit-entries.service'

/**
 * GET /api/borrower/reputation
 * Authenticated – full reputation data for the logged-in borrower,
 * including event history and projected scores per active credit.
 */
async function handler(req: NextRequest) {
  try {
    const user = (req as any).user
    const borrowerPubkey = user.walletAddress

    // Ensure row exists
    let reputation = await getReputation(borrowerPubkey)
    if (!reputation) {
      reputation = await initReputationIfNeeded(borrowerPubkey)
    }

    if (!reputation) {
      return errorResponse('Reputation record not found', 404)
    }

    // Flip active-but-past-due credits to 'overdue' first
    await markOverdueCredits()

    // Fetch recent events
    const events = await getReputationEvents(borrowerPubkey, 30)

    // Fetch active credits to generate per-credit projections
    const activeCredits = await getBorrowerCredits(borrowerPubkey, 'active')

    const projections = activeCredits.map((credit) => ({
      credit_id: credit.id,
      credit_amount: credit.credit_amount,
      description: credit.description,
      due_date: credit.due_date,
      scenarios: calculateProjectedScores(
        reputation!.reputation_score,
        credit.due_date as string
      ),
    }))

    const tier = getReputationTier(reputation.reputation_score)

    return successResponse({
      reputation: {
        ...reputation,
        tier: tier.label,
        is_low_score: isLowScore(reputation.reputation_score),
      },
      events,
      projections,
    })
  } catch (error) {
    console.error('[Borrower Reputation] Error:', error)
    return errorResponse('Failed to fetch reputation data', 500)
  }
}

export const GET = withAuth(handler, 'borrower')
