/**
 * KhataChain — Solana on-chain anchoring via SPL Memo Program
 *
 * Phase 1: We inscribe a compact JSON memo into every credit creation and
 * repayment.  The transaction is signed by the party initiating the action
 * (store-owner for credit creation, borrower for repayment), giving us:
 *   - Immutable on-chain timestamp
 *   - Proof of authorisation (signer == party)
 *   - Human-readable in Solana Explorer
 *   - ~5000 lamports per tx (~$0.001 at current SOL prices)
 *
 * Phase 2 (planned): Replace Memo txs with Anchor PDA instructions so the
 * full credit state lives on-chain and can be verified by any thirdparty
 * app without trusting our Supabase database.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

/** SPL Memo Program v2 — mainnet/testnet/devnet same address */
const MEMO_PROGRAM_ID = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
)

type SendTransactionFn = (
  tx: Transaction,
  connection: Connection
) => Promise<string>

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getConnection(): Connection {
  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.testnet.solana.com'
  return new Connection(rpc, 'confirmed')
}

function buildMemoInstruction(memo: string, signerPubkey: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    // Listing the signer as a key proves they authorised writing this memo
    keys: [{ pubkey: signerPubkey, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, 'utf8'),
  })
}

async function sendAndConfirm(
  tx: Transaction,
  signerPubkeyStr: string,
  sendTransaction: SendTransactionFn
): Promise<string> {
  const connection = getConnection()
  const feePayer = new PublicKey(signerPubkeyStr)

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = feePayer

  const signature = await sendTransaction(tx, connection)

  // Wait for confirmation (up to 60s)
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  )

  return signature
}

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export interface CreditAnchorParams {
  creditId: string
  amount: number
  currency?: string
  dueDate: string            // ISO date string e.g. "2026-03-22"
  borrowerPubkey: string
  storeOwnerPubkey: string
  /** Wallet address of the transaction signer (store-owner when creating) */
  signerPubkey: string
  sendTransaction: SendTransactionFn
}

/**
 * Anchor a new credit agreement on-chain.
 * Called by the store-owner UI after the credit is created in Supabase.
 * Returns the transaction signature to be saved in credit_entries.tx_signature.
 */
export async function anchorCreditOnChain(
  params: CreditAnchorParams
): Promise<string> {
  const {
    creditId,
    amount,
    currency = 'NPR',
    dueDate,
    borrowerPubkey,
    storeOwnerPubkey,
    signerPubkey,
    sendTransaction,
  } = params

  const memo = JSON.stringify({
    app: 'khatachain',
    v: 1,
    type: 'credit_created',
    id: creditId.slice(0, 8),
    amount,
    currency,
    due: dueDate,
    borrower: borrowerPubkey.slice(0, 8),
    lender: storeOwnerPubkey.slice(0, 8),
    ts: Math.floor(Date.now() / 1000),
  })

  const tx = new Transaction().add(
    buildMemoInstruction(memo, new PublicKey(signerPubkey))
  )

  return sendAndConfirm(tx, signerPubkey, sendTransaction)
}

export interface RepaymentAnchorParams {
  creditId: string
  amountPaid: number
  currency?: string
  remainingBalance: number
  borrowerPubkey: string
  sendTransaction: SendTransactionFn
}

/**
 * Anchor a repayment event on-chain.
 * Called by the borrower UI after the repayment is recorded in Supabase.
 * Returns the transaction signature to be saved in credit_entries.repayment_tx_signature.
 */
export async function anchorRepaymentOnChain(
  params: RepaymentAnchorParams
): Promise<string> {
  const {
    creditId,
    amountPaid,
    currency = 'NPR',
    remainingBalance,
    borrowerPubkey,
    sendTransaction,
  } = params

  const memo = JSON.stringify({
    app: 'khatachain',
    v: 1,
    type: 'repayment',
    id: creditId.slice(0, 8),
    paid: amountPaid,
    currency,
    remaining: remainingBalance,
    borrower: borrowerPubkey.slice(0, 8),
    ts: Math.floor(Date.now() / 1000),
  })

  const tx = new Transaction().add(
    buildMemoInstruction(memo, new PublicKey(borrowerPubkey))
  )

  return sendAndConfirm(tx, borrowerPubkey, sendTransaction)
}

/**
 * Fetch and decode memo data from an existing transaction.
 * Useful for displaying proof on credit detail pages.
 */
export async function fetchMemoFromTx(
  txSignature: string
): Promise<string | null> {
  try {
    const connection = getConnection()
    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })

    if (!tx) return null

    const message = tx.transaction.message

    // VersionedMessage (MessageV0) uses compiledInstructions with Uint8Array data.
    const ixs =
      'compiledInstructions' in message
        ? message.compiledInstructions
        : (message as any).instructions ?? []

    for (const ix of ixs) {
      try {
        const raw: Uint8Array | undefined =
          ix.data instanceof Uint8Array
            ? ix.data
            : typeof ix.data === 'string'
            ? Uint8Array.from(Buffer.from(ix.data, 'base64'))
            : undefined

        if (!raw) continue

        const text = Buffer.from(raw).toString('utf8')
        if (text.startsWith('{') || text.startsWith('KHATACHAIN')) return text
      } catch {
        // not decodable, skip
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get the Solana Explorer URL for a transaction signature.
 */
export function explorerUrl(txSignature: string): string {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
  return `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`
}

/**
 * Get the Solana Explorer URL for a wallet address.
 */
export function addressExplorerUrl(pubkey: string): string {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
  return `https://explorer.solana.com/address/${pubkey}?cluster=${network}`
}

// ─────────────────────────────────────────────────────────────────────────────
// SOL transfer payment
// ─────────────────────────────────────────────────────────────────────────────

export interface SolPaymentParams {
  /** Store owner's wallet address — receives the SOL */
  recipientPubkey: string
  /** Borrower's wallet address — pays the SOL */
  senderPubkey: string
  /** Amount in SOL (e.g. 0.05) */
  amountSol: number
  /** Optional memo describing the payment (credit ID etc.) */
  memo?: string
  sendTransaction: SendTransactionFn
}

/**
 * Transfer SOL from the borrower's wallet to the store owner's wallet.
 * Also embeds an optional Memo instruction so the tx is human-readable
 * on Solana Explorer.
 *
 * Returns the confirmed transaction signature.
 */
export async function sendSolPayment(params: SolPaymentParams): Promise<string> {
  const { recipientPubkey, senderPubkey, amountSol, memo, sendTransaction } = params

  const sender    = new PublicKey(senderPubkey)
  const recipient = new PublicKey(recipientPubkey)
  const lamports  = Math.round(amountSol * LAMPORTS_PER_SOL)

  const tx = new Transaction()

  // Real SOL transfer
  tx.add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey:   recipient,
      lamports,
    })
  )

  // Memo for human-readable on-chain record
  if (memo) {
    tx.add(buildMemoInstruction(memo, sender))
  }

  return sendAndConfirm(tx, senderPubkey, sendTransaction)
}

// ──────────────────────────────────────────────────────────────────────────────
// Price helpers — all run client-side (browser fetch) to bypass any server-side
// network restrictions.  We race every source in parallel and take the first
// response that yields a valid positive number.
// ──────────────────────────────────────────────────────────────────────────────

function abortAfter(ms: number): AbortSignal {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.abort(), ms)
  return ctrl.signal
}

async function _cgSolUSD(): Promise<number> {
  const r = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    { signal: abortAfter(6000) }
  )
  if (!r.ok) throw new Error('cg')
  const j = await r.json()
  const p = Number(j?.solana?.usd)
  if (!(p > 0)) throw new Error('cg-bad')
  return p
}

async function _capSolUSD(): Promise<number> {
  const r = await fetch(
    'https://api.coincap.io/v2/assets/solana',
    { signal: abortAfter(6000) }
  )
  if (!r.ok) throw new Error('cap')
  const j = await r.json()
  const p = parseFloat(j?.data?.priceUsd)
  if (!(p > 0)) throw new Error('cap-bad')
  return p
}

async function _okxSolUSD(): Promise<number> {
  const r = await fetch(
    'https://www.okx.com/api/v5/market/ticker?instId=SOL-USDT',
    { signal: abortAfter(6000) }
  )
  if (!r.ok) throw new Error('okx')
  const j = await r.json()
  const p = parseFloat(j?.data?.[0]?.last)
  if (!(p > 0)) throw new Error('okx-bad')
  return p
}

async function _mexcSolUSD(): Promise<number> {
  const r = await fetch(
    'https://api.mexc.com/api/v3/ticker/price?symbol=SOLUSDT',
    { signal: abortAfter(6000) }
  )
  if (!r.ok) throw new Error('mexc')
  const j = await r.json()
  const p = parseFloat(j?.price)
  if (!(p > 0)) throw new Error('mexc-bad')
  return p
}

async function _serverRoute(): Promise<{
  solUSD: number
  nprPerUsd: number
  solPriceNPR: number
  fallback?: boolean
}> {
  const r = await fetch('/api/sol-price', { signal: abortAfter(9000) })
  if (!r.ok) throw new Error('server')
  const j = await r.json()
  if (!(j?.solUSD > 0) || j?.fallback) throw new Error('server-fallback')
  return j
}

async function _nprPerUsd(): Promise<number> {
  try {
    const r = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: abortAfter(5000) }
    )
    if (r.ok) {
      const j = await r.json()
      const rate = Number(j?.rates?.NPR)
      if (rate > 0) return rate
    }
  } catch { /* fall through */ }
  return 135.5 // central-bank mid-rate fallback
}

/**
 * Fetch current SOL price info.
 * Races all sources in parallel (browser-native + server route) and takes the
 * first winner.  Always returns a value — uses a hardcoded fallback when every
 * source fails so the repay page is never blocked.
 */
export async function fetchSolPrice(): Promise<{
  solUSD: number
  nprPerUsd: number
  solPriceNPR: number
  fallback?: boolean
}> {
  const FALLBACK_SOL_USD = 190     // update periodically; last-resort only
  const FALLBACK_NPR_USD = 135.5

  // Race all SOL/USD sources; first positive value wins
  const solUSDPromise: Promise<number> = Promise.any([
    _cgSolUSD(),
    _capSolUSD(),
    _okxSolUSD(),
    _mexcSolUSD(),
    // Server route as well — works on Vercel even if not locally
    _serverRoute().then(d => d.solUSD),
  ]).catch(() => 0)

  // NPR/FX runs in parallel
  const [solUSD, nprPerUsd] = await Promise.all([solUSDPromise, _nprPerUsd()])

  const resolved = solUSD > 0 ? solUSD : FALLBACK_SOL_USD
  const isFallback = !(solUSD > 0)

  return {
    solUSD: resolved,
    nprPerUsd,
    solPriceNPR: resolved * nprPerUsd,
    fallback: isFallback,
  }
}

/** @deprecated use fetchSolPrice() instead */
export async function fetchSolPriceNPR(): Promise<number> {
  const data = await fetchSolPrice()
  return data.solPriceNPR
}
