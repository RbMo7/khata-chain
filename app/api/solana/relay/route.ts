/**
 * POST /api/solana/relay
 *
 * Gas relay — the platform pays the transaction fee so users pay $0 gas.
 *
 * Flow:
 *   1. Browser builds a Memo tx with feePayer = platform pubkey
 *   2. User signs it in Phantom (proves they authorised the event)
 *   3. Browser sends the partially-signed tx (base64) here
 *   4. Server validates: only Memo instructions allowed
 *   5. Platform co-signs as fee payer → broadcasts → confirms
 *   6. Returns { txSignature }
 *
 * Security boundaries:
 *   - Only SPL Memo instructions accepted (no SOL transfers, no arbitrary programs)
 *   - fee payer in the tx must be the platform pubkey (prevents spoofing)
 *   - User's signature must already be present and cover their signer key
 */

import { NextRequest, NextResponse } from 'next/server'
import { Connection, Transaction, PublicKey } from '@solana/web3.js'
import { getPlatformKeypair } from '@/lib/solana/anchor-server'

const MEMO_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
// Phantom injects ComputeBudget instructions automatically for priority fees — harmless, allow them
const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111'
const ALLOWED_PROGRAMS = new Set([MEMO_PROGRAM_ID, COMPUTE_BUDGET_PROGRAM_ID])

function getConnection() {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com',
    'confirmed'
  )
}

export async function POST(req: NextRequest) {
  let txBase64: string
  try {
    const body = await req.json()
    txBase64 = body?.tx
    if (!txBase64) throw new Error('missing tx')
  } catch {
    return NextResponse.json({ error: 'Body must be { tx: base64 }' }, { status: 400 })
  }

  let tx: Transaction
  try {
    tx = Transaction.from(Buffer.from(txBase64, 'base64'))
  } catch {
    return NextResponse.json({ error: 'Invalid transaction encoding' }, { status: 400 })
  }

  const platform = getPlatformKeypair()

  // ── Security: only Memo + ComputeBudget instructions accepted ───────────────
  for (const ix of tx.instructions) {
    if (!ALLOWED_PROGRAMS.has(ix.programId.toBase58())) {
      return NextResponse.json(
        { error: `Relay only accepts Memo instructions. Got: ${ix.programId.toBase58()}` },
        { status: 400 }
      )
    }
  }

  // ── Security: fee payer must be the platform wallet ───────────────────────
  if (tx.feePayer?.toBase58() !== platform.publicKey.toBase58()) {
    return NextResponse.json(
      { error: 'Transaction fee payer must be the platform wallet' },
      { status: 400 }
    )
  }

  if (!tx.recentBlockhash) {
    return NextResponse.json({ error: 'Transaction is missing recentBlockhash' }, { status: 400 })
  }

  try {
    // Platform co-signs as fee payer
    tx.partialSign(platform)

    const connection = getConnection()
    const rawTx = tx.serialize()

    const signature = await connection.sendRawTransaction(rawTx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    // Wait for confirmation
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )

    return NextResponse.json({ txSignature: signature })
  } catch (err: any) {
    console.error('[relay] Broadcast failed:', err?.message)
    return NextResponse.json(
      { error: 'Broadcast failed', detail: err?.message },
      { status: 500 }
    )
  }
}
