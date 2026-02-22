/**
 * Server-side Solana anchor utility.
 *
 * Signs and sends Memo transactions using the platform keypair (loaded from
 * PLATFORM_KEYPAIR_SECRET env var).  Runs in Node.js only — never imported
 * by client components.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import crypto from 'crypto'

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

// ── Platform keypair ─────────────────────────────────────────────────────────

export function getPlatformKeypair(): Keypair {
  const raw = process.env.PLATFORM_KEYPAIR_SECRET
  if (!raw) throw new Error('PLATFORM_KEYPAIR_SECRET is not set in env')
  const bytes = JSON.parse(raw) as number[]
  return Keypair.fromSecretKey(Uint8Array.from(bytes))
}

function getConnection(): Connection {
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com'
  return new Connection(rpc, 'confirmed')
}

// ── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Send a Memo transaction signed by the platform keypair.
 * Returns the tx signature.
 */
export async function sendPlatformMemo(memo: string): Promise<string> {
  const keypair = getPlatformKeypair()
  const connection = getConnection()

  const ix = new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: keypair.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, 'utf8'),
  })

  const tx = new Transaction().add(ix)
  const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
    commitment: 'confirmed',
  })
  return signature
}

// ── Reputation anchoring ─────────────────────────────────────────────────────

export interface ReputationAnchorPayload {
  walletAddress: string
  score: number
  totalCredits: number
  onTimePayments: number
  latePayments: number
}

/**
 * Computes a SHA256 hash of the borrower's current reputation state,
 * inscribes it as a Memo on Solana, and returns both the hash and tx signature.
 */
export async function anchorReputationOnChain(
  payload: ReputationAnchorPayload
): Promise<{ hash: string; txSignature: string }> {
  const timestamp = new Date().toISOString()

  // Canonical string — deterministic ordering so the hash is reproducible
  const canonical = JSON.stringify({
    wallet: payload.walletAddress,
    score: payload.score,
    total: payload.totalCredits,
    onTime: payload.onTimePayments,
    late: payload.latePayments,
    ts: timestamp,
  })

  const hash = crypto.createHash('sha256').update(canonical).digest('hex')

  const memo = JSON.stringify({
    app: 'khatachain',
    type: 'reputation_hash',
    wallet: payload.walletAddress.slice(0, 8) + '…',
    score: payload.score,
    hash,
    ts: timestamp,
  })

  const txSignature = await sendPlatformMemo(memo)

  return { hash, txSignature }
}

/**
 * Returns the platform wallet public key (shown on the verifier page so
 * anyone can check the signer on Explorer).
 */
export function getPlatformPublicKey(): string {
  return getPlatformKeypair().publicKey.toBase58()
}
