'use client'

import { useState } from 'react'
import { Search, ExternalLink, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, AlertCircle, Copy, Check, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoyaltyBadge, BadgeTier } from '@/components/LoyaltyBadge'

// ── Types ────────────────────────────────────────────────────────────────────

interface TierInfo { label: string; color: string; description: string }

interface RepaymentTx {
  signature: string
  explorerUrl: string
}

interface CreditRecord {
  id: string
  amountNPR: number
  currency: string
  dueDate: string | null
  status: string
  createdAt: string
  updatedAt: string
  daysOverdue: number | null
  creditCreationTx: RepaymentTx | null
  repaymentTx: RepaymentTx | null
}

interface OnChainProof {
  hash: string
  txSignature: string | null
  explorerUrl: string | null
  anchoredAt: string | null
  platformSigner: string
  platformSignerExplorer: string
  verified: boolean
}

interface VerifyResult {
  walletAddress: string
  score: number
  tier: TierInfo
  badge_tier: BadgeTier
  total_rewards_earned_sol: number
  stats: {
    totalCredits: number
    onTimePayments: number
    earlyPayments: number
    latePaymentsMinor: number
    latePaymentsMajor: number
    latePaymentsSevere: number
    citizenshipVerified: boolean
  }
  completedCredits: CreditRecord[]
  overdueCredits: CreditRecord[]
  activeCredits: CreditRecord[]
  onChainProof: OnChainProof | null
  scoreUpdatedAt: string
  network: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tierBg(label: string) {
  if (label === 'Excellent') return 'bg-emerald-50 border-emerald-200'
  if (label === 'Good') return 'bg-blue-50 border-blue-200'
  if (label === 'Fair') return 'bg-amber-50 border-amber-200'
  return 'bg-slate-50 border-slate-200'
}

function tierTextColor(label: string) {
  if (label === 'Excellent') return 'text-emerald-700'
  if (label === 'Good') return 'text-blue-700'
  if (label === 'Fair') return 'text-amber-700'
  return 'text-slate-600'
}

function tierBadgeVariant(label: string): 'default' | 'secondary' | 'outline' {
  return 'outline'
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NP').format(n)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })
}

function shortSig(sig: string) {
  return sig.slice(0, 8) + '…' + sig.slice(-8)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function VerifierPage() {
  const [wallet, setWallet] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleVerify(e?: React.FormEvent) {
    e?.preventDefault()
    const addr = wallet.trim()
    if (!addr) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/verify/${addr}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Not found')
      setResult(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/verify?wallet=${result?.walletAddress}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Pre-fill from ?wallet= query param on mount
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search)
    const w = sp.get('wallet')
    if (w && !wallet && !result) {
      setWallet(w)
      // auto-search
      setTimeout(() => handleVerify(), 0)
    }
  }

  const lateTotal = result
    ? result.stats.latePaymentsMinor + result.stats.latePaymentsMajor + result.stats.latePaymentsSevere
    : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-1">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">KhataChain Verifier</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Enter any borrower wallet address to view their on-chain credit reputation. No login required.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Search */}
        <form onSubmit={handleVerify} className="flex gap-2">
          <Input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Solana wallet address (e.g. 7xKXtg2…)"
            className="font-mono text-sm"
          />
          <Button type="submit" disabled={loading || !wallet.trim()}>
            {loading ? (
              <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> Checking…</span>
            ) : (
              <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Verify</span>
            )}
          </Button>
        </form>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error === 'Borrower not found'
              ? 'No reputation record found for this wallet address.'
              : error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">

            {/* Score card */}
            <Card className={`border-2 ${tierBg(result.tier.label)}`}>
              <CardContent className="pt-6 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <LoyaltyBadge tier={result.badge_tier} size="lg" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-5xl font-black ${tierTextColor(result.tier.label)}`}>
                          {result.score}
                        </span>
                        <span className="text-muted-foreground text-sm mt-2">/ 1000</span>
                      </div>
                      <Badge variant="outline" className={`${tierTextColor(result.tier.label)} border-current font-semibold`}>
                        {result.tier.label}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">{result.tier.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground mb-1">Wallet</p>
                    <p className="font-mono text-xs text-muted-foreground break-all max-w-[160px]">
                      {result.walletAddress.slice(0, 8)}…{result.walletAddress.slice(-8)}
                    </p>
                    {result.stats.citizenshipVerified && (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs mt-2 justify-end">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        ID Verified
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loyalty Rewards */}
            <Card className="border-amber-200 bg-amber-50/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-600" />
                  Loyalty Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total SOL Earned</span>
                  <span className="font-bold text-lg text-amber-700">
                    {result.total_rewards_earned_sol.toFixed(4)} SOL
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Borrowers earn SOL rewards for consistent on-time repayments. This borrower has reached 
                  the <span className="font-semibold text-foreground">{result.badge_tier}</span> tier.
                </p>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">On-time payments</span>
                  <span className="ml-auto font-semibold">{result.stats.onTimePayments + result.stats.earlyPayments}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-muted-foreground">Late payments</span>
                  <span className="ml-auto font-semibold">{lateTotal}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-muted-foreground">Total credits</span>
                  <span className="ml-auto font-semibold">{result.stats.totalCredits}</span>
                </div>
              </CardContent>
            </Card>

            {/* On-chain proof */}
            {result.onChainProof ? (
              <Card className="border-emerald-200 bg-emerald-50/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-4 w-4" />
                    On-Chain Proof — Verified
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0 w-28">Score hash</span>
                    <span className="font-mono text-xs break-all">{result.onChainProof.hash}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">Anchored at</span>
                    <span>{fmtDate(result.onChainProof.anchoredAt)}</span>
                  </div>
                  {result.onChainProof.explorerUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28">Proof tx</span>
                      <a
                        href={result.onChainProof.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-700 underline font-mono text-xs"
                      >
                        {shortSig(result.onChainProof.txSignature!)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-28">Signed by</span>
                    <a
                      href={result.onChainProof.platformSignerExplorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-700 underline font-mono text-xs"
                    >
                      {result.onChainProof.platformSigner.slice(0, 8)}…{result.onChainProof.platformSigner.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    This SHA-256 hash of the borrower&apos;s score was inscribed on Solana by the KhataChain platform wallet.
                    Anyone can verify the Memo on Explorer — if the hash matches the score above, the record is untampered.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-amber-200 bg-amber-50/40">
                <CardContent className="pt-5 flex items-start gap-2 text-sm text-amber-700">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  Score not yet anchored on-chain. It will be committed automatically after the next payment event.
                </CardContent>
              </Card>
            )}

            {/* Full credit history */}
            {(result.overdueCredits.length > 0 || result.completedCredits.length > 0 || result.activeCredits.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Credit History ({result.completedCredits.length + result.overdueCredits.length + result.activeCredits.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">

                  {/* Overdue — shown first for transparency */}
                  {result.overdueCredits.map((c) => (
                    <div key={c.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Rs. {fmt(c.amountNPR)} NPR</span>
                            <span className="text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                              Overdue {c.daysOverdue != null ? `${c.daysOverdue}d` : ''}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">Due {fmtDate(c.dueDate)}</div>
                          {c.creditCreationTx && (
                            <a href={c.creditCreationTx.explorerUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline font-mono">
                              Credit tx: {shortSig(c.creditCreationTx.signature)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}

                  {/* Active */}
                  {result.activeCredits.map((c) => (
                    <div key={c.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Rs. {fmt(c.amountNPR)} NPR</span>
                            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Active</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Due {fmtDate(c.dueDate)}</div>
                          {c.creditCreationTx && (
                            <a href={c.creditCreationTx.explorerUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline font-mono">
                              Credit tx: {shortSig(c.creditCreationTx.signature)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}

                  {/* Completed */}
                  {result.completedCredits.map((c) => (
                    <div key={c.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Rs. {fmt(c.amountNPR)} NPR</span>
                            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Paid</span>
                          </div>
                          <div className="text-xs text-muted-foreground">Paid {fmtDate(c.updatedAt)}</div>
                          {c.repaymentTx ? (
                            <a href={c.repaymentTx.explorerUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 underline font-mono">
                              Repayment tx: {shortSig(c.repaymentTx.signature)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : c.creditCreationTx ? (
                            <a href={c.creditCreationTx.explorerUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground underline font-mono">
                              Credit tx: {shortSig(c.creditCreationTx.signature)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                      </div>
                    </div>
                  ))}

                </CardContent>
              </Card>
            )}

            {/* Share */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">Share this report</p>
              <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
            </div>

          </div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <ShieldCheck className="h-12 w-12 mx-auto opacity-20" />
            <p className="text-sm">Enter a Solana wallet address to check their KhataChain credit reputation.</p>
            <p className="text-xs opacity-70">Used by lenders, merchants, and employers to verify borrowers without sharing personal data.</p>
          </div>
        )}

      </div>
    </div>
  )
}
