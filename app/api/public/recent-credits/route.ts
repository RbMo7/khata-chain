/**
 * GET /api/public/recent-credits
 *
 * Fully public — no auth. Returns the last 12 credit entries across the
 * platform, anonymised (borrower pubkey truncated, no store-owner details).
 * Used on the landing page "Live Activity" feed.
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

const NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'

function explorerTx(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=${NETWORK}`
}

function shortWallet(pubkey: string) {
  return `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`
}

const STATUS_LABEL: Record<string, string> = {
  pending:   'Credit Created',
  active:    'Credit Active',
  completed: 'Repaid',
  overdue:   'Overdue',
  rejected:  'Rejected',
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('credit_entries')
    .select(
      'id, credit_amount, currency, status, tx_signature, repayment_tx_signature, created_at, borrower_pubkey'
    )
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  const rows = (data ?? []).map((c) => ({
    id: c.id,
    amountNPR: c.credit_amount / 100,
    currency: c.currency ?? 'NPR',
    status: c.status,
    statusLabel: STATUS_LABEL[c.status] ?? c.status,
    borrowerShort: shortWallet(c.borrower_pubkey),
    createdAt: c.created_at,
    onChain: c.tx_signature
      ? {
          signature: c.tx_signature,
          explorerUrl: explorerTx(c.tx_signature),
        }
      : null,
    repaidOnChain: c.repayment_tx_signature
      ? {
          signature: c.repayment_tx_signature,
          explorerUrl: explorerTx(c.repayment_tx_signature),
        }
      : null,
  }))

  return NextResponse.json(rows, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=15' },
  })
}
