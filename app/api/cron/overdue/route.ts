import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { processOverduePenalties } from '@/lib/services/reputation.service'
import { markOverdueCredits } from '@/lib/services/credit-entries.service'

/**
 * GET /api/cron/overdue
 *
 * Processes daily reputation penalties for all borrowers with overdue credits.
 *
 * How to run automatically:
 *   Add to vercel.json:
 *   {
 *     "crons": [{ "path": "/api/cron/overdue", "schedule": "0 0 * * *" }]
 *   }
 *
 * Protected by CRON_SECRET env variable (set in Vercel).
 * Can also be called ad-hoc (e.g. for testing).
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (skip in dev)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // 1. Flip active-but-past-due credits to 'overdue' status
    const flipped = await markOverdueCredits()
    console.log(`[Cron Overdue] Flipped ${flipped} credit(s) to overdue`)

    // 2. Get all currently overdue credit entries grouped by borrower
    const { data: overdueCredits, error } = await supabaseAdmin
      .from('credit_entries')
      .select('id, borrower_pubkey, due_date')
      .eq('status', 'overdue')
      .not('due_date', 'is', null)

    if (error) {
      console.error('[Cron Overdue] DB error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    if (!overdueCredits || overdueCredits.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No overdue credits found' })
    }

    // Group by borrower
    const byBorrower = new Map<string, Array<{ id: string; due_date: string }>>()
    for (const c of overdueCredits) {
      if (!byBorrower.has(c.borrower_pubkey)) byBorrower.set(c.borrower_pubkey, [])
      byBorrower.get(c.borrower_pubkey)!.push({ id: c.id, due_date: c.due_date! })
    }

    let processedBorrowers = 0
    let processedCredits = 0

    for (const [borrowerPubkey, credits] of byBorrower.entries()) {
      try {
        await processOverduePenalties(borrowerPubkey, credits)
        processedBorrowers++
        processedCredits += credits.length
      } catch (err) {
        console.error(`[Cron Overdue] Error processing ${borrowerPubkey}:`, err)
      }
    }

    return NextResponse.json({
      processed: processedCredits,
      borrowers: processedBorrowers,
      message: `Processed ${processedCredits} overdue credit(s) across ${processedBorrowers} borrower(s)`,
    })
  } catch (err) {
    console.error('[Cron Overdue] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
