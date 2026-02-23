'use client'

/**
 * useOnChainAnchor
 *
 * Sends Memo transactions via the user's injected wallet provider
 * (window.solana for Phantom, window.solflare for Solflare, etc.)
 *
 * WHY NOT useWallet() from the wallet adapter?
 * The app authenticates users via its own flow (window.solana.connect())
 * which does NOT update the wallet adapter's connection state. So
 * useWallet().connected is always false unless the user explicitly clicked
 * the adapter's connect button. Using the injected provider directly is
 * simpler and always works — the wallet is already connected.
 */

import { useCallback } from 'react'
import { Connection, Transaction } from '@solana/web3.js'
import { useAuth } from '@/contexts/AuthContext'
import { anchorRepaymentOnChain, sendSolPayment, fetchSolPrice } from '@/lib/solana/credit-chain'
import { post } from '@/lib/api-client'

export interface AnchorResult {
  txSignature: string
  explorerUrl: string
}

// Maps wallet display names to the window property key
const WALLET_WINDOW_KEYS: Record<string, string> = {
  Phantom:  'solana',
  Solflare: 'solflare',
  Backpack: 'backpack',
  Glow:     'glow',
}

function getInjectedProvider(walletType: string): any | null {
  if (typeof window === 'undefined') return null
  const key = WALLET_WINDOW_KEYS[walletType] ?? walletType.toLowerCase()
  return (window as any)[key] ?? null
}

/**
 * Build a SendTransactionFn that signs with the user's wallet, then relays to
 * the server (which co-signs as fee payer and broadcasts).
 *
 * Used for Memo-only txs (credit anchor, repayment anchor) so the user pays $0 gas.
 */
function buildRelayFn(provider: any) {
  return async (tx: Transaction, _connection: Connection): Promise<string> => {
    // User signs — Phantom / Solflare popup appears
    const signed: Transaction = await provider.signTransaction(tx)

    // Send the partially-signed tx to the relay API.
    // The relay validates it's Memo-only, co-signs as fee payer, broadcasts + confirms.
    const raw = signed.serialize({ requireAllSignatures: false })
    const res = await fetch('/api/solana/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx: Buffer.from(raw).toString('base64') }),
    })
    const json = await res.json()
    if (!res.ok || !json.txSignature) {
      throw new Error(json?.error ?? json?.detail ?? 'Relay failed')
    }
    return json.txSignature
  }
}

/**
 * Build a SendTransactionFn that signs and broadcasts directly.
 * Used for SOL payment transactions where the borrower is the fee payer.
 */
function buildSendFn(provider: any) {
  return async (tx: Transaction, connection: Connection): Promise<string> => {
    // Ask wallet to sign — triggers the Phantom / Solflare popup
    const signed: Transaction = await provider.signTransaction(tx)
    // Broadcast the signed raw transaction
    const signature = await connection.sendRawTransaction(signed.serialize())
    return signature
  }
}

export function useOnChainAnchor() {
  const { user } = useAuth()

  const anchorCredit = useCallback(
    async (
      creditId: string,
      _amount?: number,
      _dueDate?: string,
      _borrowerPubkey?: string,
      _storeOwnerPubkey?: string,
      _currency?: string
    ): Promise<AnchorResult | null> => {
      // Credit anchoring is handled entirely server-side using the platform keypair.
      // No user wallet signature or popup required — only repayments use the borrower's wallet.
      try {
        const res = await post<{ data: AnchorResult }>('/api/solana/anchor-credit', { creditId })
        console.log('[On-chain] Credit anchored:', res.data?.explorerUrl)
        return res.data
      } catch (err) {
        // Non-blocking — approval already succeeded in DB, anchor is best-effort
        console.error('[anchorCredit] On-chain anchoring failed:', err)
        return null
      }
    },
    []
  )

  const anchorRepayment = useCallback(
    async (
      creditId: string,
      amountPaid: number,
      remainingBalance: number,
      borrowerPubkey: string,
      currency = 'NPR'
    ): Promise<AnchorResult | null> => {
      const provider = getInjectedProvider(user?.walletType ?? 'Phantom')

      if (!provider || !borrowerPubkey) {
        console.warn('[anchorRepayment] No injected wallet found — skipping on-chain anchoring')
        return null
      }

      try {
        const txSignature = await anchorRepaymentOnChain({
          creditId,
          amountPaid,
          currency,
          remainingBalance,
          borrowerPubkey,
          sendTransaction: buildRelayFn(provider), // platform pays gas
        })

        const res = await post<{ data: AnchorResult }>('/api/solana/record-tx', {
          creditId,
          txSignature,
          type: 'repayment',
        })

        console.log('[On-chain] Repayment anchored:', res.data?.explorerUrl)
        return res.data
      } catch (err) {
        console.error('[anchorRepayment] On-chain anchoring failed:', err)
        return null
      }
    },
    [user]
  )

  return {
    anchorCredit,
    anchorRepayment,
    payWithSol: useCallback(
      async (
        creditId: string,
        amountNpr: number,
        storeOwnerPubkey: string,
        overrideAmountSol?: number
      ): Promise<(AnchorResult & { amountSol: number }) | null> => {
        const provider   = getInjectedProvider(user?.walletType ?? 'Phantom')
        const senderPubkey = user?.walletAddress

        if (!provider || !senderPubkey) {
          console.warn('[payWithSol] No injected wallet found')
          return null
        }

        try {
          // Determine SOL amount
          let amountSol = overrideAmountSol
          if (!amountSol) {
            const priceData = await fetchSolPrice()
            // amountNpr is in paisa (1 NPR = 100 paisa) — divide by 100 first
            const amountRupees = amountNpr / 100
            amountSol = parseFloat((amountRupees / priceData.solPriceNPR).toFixed(6))
          }

          const memo = JSON.stringify({
            type: 'repayment',
            id: creditId.slice(0, 8),
            amountNPR: (amountNpr / 100).toFixed(2), // convert paisa to readable NPR
          })

          const txSignature = await sendSolPayment({
            recipientPubkey: storeOwnerPubkey,
            senderPubkey,
            amountSol,
            memo,
            sendTransaction: buildSendFn(provider),
          })

          const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'testnet'
          const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=${network}`

          // Persist in DB via record-tx
          await post<{ data: AnchorResult }>('/api/solana/record-tx', {
            creditId,
            txSignature,
            type: 'repayment',
          })

          console.log('[payWithSol] SOL payment sent:', explorerUrl)
          return { txSignature, explorerUrl, amountSol }
        } catch (err) {
          console.error('[payWithSol] Payment failed:', err)
          return null
        }
      },
      [user]
    ),
  }
}
