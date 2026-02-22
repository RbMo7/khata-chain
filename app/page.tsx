'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowRight, Shield, Zap, ExternalLink, CheckCircle2, Loader2, Search, Activity } from 'lucide-react'

// ── Replace this with your test borrower wallet after first repayment ──────
const DEMO_WALLET = 'J1NZymvqDBeDaanrDJ2zNLajEoSNsXc2EbRraNEwjp9k'

const TIER_COLORS: Record<string, string> = {
  Excellent:   'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  Good:        'bg-blue-500/10 text-blue-500 border-blue-500/30',
  Fair:        'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  Poor:        'bg-orange-500/10 text-orange-500 border-orange-500/30',
  'No History':'bg-muted text-muted-foreground border-border',
}

type RecentCredit = {
  id: string
  amountNPR: number
  currency: string
  status: string
  statusLabel: string
  borrowerShort: string
  createdAt: string
  onChain: { signature: string; explorerUrl: string } | null
  repaidOnChain: { signature: string; explorerUrl: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-500',
  active:    'bg-blue-500/10 text-blue-500',
  pending:   'bg-yellow-500/10 text-yellow-600',
  overdue:   'bg-red-500/10 text-red-500',
  rejected:  'bg-muted text-muted-foreground',
}

type VerifyData = {
  walletAddress: string
  score: number
  tier: { label: string; color: string; description: string }
  stats: {
    totalCredits: number
    onTimePayments: number
    earlyPayments: number
    latePaymentsMinor: number
    latePaymentsMajor: number
    latePaymentsSevere: number
  }
  onChainProof: {
    hash: string
    txSignature: string | null
    explorerUrl: string | null
    anchoredAt: string | null
    platformSigner: string
    verified: boolean
  } | null
}

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, connectWallet } = useAuth()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Live Proof state ──────────────────────────────────────────────────────
  const [proofInput, setProofInput] = useState(DEMO_WALLET)
  const [proofData, setProofData] = useState<VerifyData | null>(null)
  const [proofLoading, setProofLoading] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)

  const fetchProof = useCallback(async (wallet: string) => {
    const w = wallet.trim()
    if (!w || w.length < 32) return
    setProofLoading(true)
    setProofError(null)
    try {
      const res = await fetch(`/api/verify/${w}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Borrower not found')
      }
      setProofData(await res.json())
    } catch (e: any) {
      setProofError(e.message)
      setProofData(null)
    } finally {
      setProofLoading(false)
    }
  }, [])

  useEffect(() => { fetchProof(DEMO_WALLET) }, [fetchProof])

  // ── Recent credits live feed ──────────────────────────────────────────────
  const [recentCredits, setRecentCredits] = useState<RecentCredit[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/public/recent-credits')
        if (res.ok) setRecentCredits(await res.json())
      } catch {}
    }
    load()
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [])

  const handleGetStarted = () => {
    setError(null)
    if (isAuthenticated) {
      // User is already authenticated, go to their dashboard
      if (user?.userType === 'borrower') {
        router.push('/borrower/dashboard')
      } else if (user?.userType === 'store-owner') {
        router.push('/store-owner/dashboard')
      } else {
        // User connected but hasn't selected role
        router.push('/select-role')
      }
    } else {
      // Show wallet connection modal
      setShowWalletModal(true)
    }
  }

  const handleAuthComplete = async (address: string, walletType: string, userType: 'borrower' | 'store-owner', name?: string, email?: string) => {
    try {
      setError(null)
      await connectWallet(address, walletType, userType, name, email)
      
      // Redirect based on user type
      if (userType === 'borrower') {
        router.push('/borrower/dashboard')
      } else {
        router.push('/store-owner/dashboard')
      }
    } catch (err: any) {
      console.error('Authentication failed:', err)
      throw err // Re-throw so AuthModal can show the error
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        onComplete={handleAuthComplete}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left — headline + buttons */}
            <div className="flex flex-col items-start text-left">
              <Badge className="mb-4" variant="secondary">
                Powered by Solana ◎ On-Chain Credit Bureau
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Decentralized Credit for Informal Economies
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                KhataChain brings transparency, trust, and financial inclusion through blockchain-powered credit tracking and fiat settlement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" onClick={handleGetStarted}>
                  {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#live-proof">See Live Proof ↓</a>
                </Button>
              </div>
            </div>

            {/* Right — Live Activity Feed */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Activity className="h-4 w-4 text-primary animate-pulse" />
                <span className="font-medium">Live On-Chain Activity</span>
                {recentCredits.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {recentCredits.length} recent
                  </span>
                )}
              </div>

              {recentCredits.length > 0 ? (
                <div className="space-y-2">
                  {recentCredits.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 backdrop-blur px-4 py-3 text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] ?? STATUS_STYLES.rejected}`}>
                          {c.statusLabel}
                        </span>
                        <span className="font-semibold">{c.currency} {c.amountNPR.toLocaleString()}</span>
                        <span className="text-muted-foreground truncate hidden sm:inline">→ {c.borrowerShort}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(c.repaidOnChain ?? c.onChain) ? (
                          <a
                            href={(c.repaidOnChain ?? c.onChain)!.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            On-chain
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Anchoring…</span>
                        )}
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Skeleton placeholders while empty / loading */}
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 animate-pulse">
                      <div className="h-5 w-16 rounded-full bg-muted" />
                      <div className="h-4 w-24 rounded bg-muted" />
                      <div className="h-4 w-20 rounded bg-muted hidden sm:block" />
                    </div>
                  ))}
                  <p className="text-xs text-center text-muted-foreground pt-1">No activity yet — be the first!</p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Identity-Bound Credit</h3>
              <p className="text-sm text-muted-foreground">
                One citizen number, one account. SHA-256 hashing prevents duplicate registrations — no bank account needed.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="font-semibold">Tamper-Proof Reputation</h3>
              <p className="text-sm text-muted-foreground">
                Every score update is anchored on Solana as a SHA-256 Memo transaction. Anyone can verify — no trust required.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="font-semibold">Zero Gas for Users</h3>
              <p className="text-sm text-muted-foreground">
                Platform sponsors all Solana transaction fees. Borrowers and store owners interact on-chain without holding SOL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { n: '1', title: 'Connect & Verify', desc: 'Link your Solana wallet and verify your citizenship number once.' },
            { n: '2', title: 'Issue or Take Credit', desc: 'Store owners create credit entries on-chain. Borrowers accept with a wallet signature.' },
            { n: '3', title: 'Repay & Build', desc: 'Repay in SOL. Reputation score updates automatically and is anchored on Solana.' },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-4 items-start">
              <span className="shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{n}</span>
              <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live On-Chain Proof */}
      <section id="live-proof" className="border-t border-border bg-muted/20">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="text-center mb-8">
            <Badge className="mb-3" variant="secondary">Live Demo</Badge>
            <h2 className="text-2xl font-bold mb-2">Verify Any Borrower, Right Now</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Every reputation score is anchored as a SHA-256 hash on Solana. Paste any wallet to see live on-chain proof.
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Solana wallet address…"
                value={proofInput}
                onChange={(e) => setProofInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchProof(proofInput)}
                className="font-mono text-sm"
              />
              <Button onClick={() => fetchProof(proofInput)} disabled={proofLoading}>
                {proofLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {proofError && <p className="text-center text-sm text-destructive">{proofError}</p>}

            {proofData && (
              <>
                <Card className="border-border">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Reputation Score</p>
                        <div className="flex items-center gap-3">
                          <span className="text-4xl font-bold">{proofData.score}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[proofData.tier.label] ?? TIER_COLORS['No History']}`}>
                            {proofData.tier.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{proofData.tier.description}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xl font-bold">{proofData.stats.totalCredits}</p>
                          <p className="text-xs text-muted-foreground">Credits</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-emerald-500">{proofData.stats.onTimePayments + proofData.stats.earlyPayments}</p>
                          <p className="text-xs text-muted-foreground">On-time</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-red-500">{proofData.stats.latePaymentsMinor + proofData.stats.latePaymentsMajor + proofData.stats.latePaymentsSevere}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {proofData.onChainProof ? (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Anchored on Solana — Tamper-Proof
                      </div>
                      <p className="font-mono text-xs break-all bg-background/70 rounded px-2 py-1.5">
                        {proofData.onChainProof.hash}
                      </p>
                      {proofData.onChainProof.explorerUrl && (
                        <a href={proofData.onChainProof.explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:underline">
                          View on Solana Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border bg-muted/30">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground text-center">No on-chain proof yet — anchored after first repayment.</p>
                    </CardContent>
                  </Card>
                )}

                <div className="text-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/verify?wallet=${proofData.walletAddress}`}>
                      Full Credit Report <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="text-2xl font-bold mb-3">Start Building Credit Today</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
          No bank account. No credit history required. Just a wallet and a phone.
        </p>
        <Button size="lg" onClick={handleGetStarted}>
          {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 KhataChain — On-chain credit for informal economies.</p>
          <div className="flex gap-6">
            <Link href="/borrower/dashboard" className="hover:text-foreground">Borrowers</Link>
            <Link href="/store-owner/dashboard" className="hover:text-foreground">Store Owners</Link>
            <Link href="/verify" className="hover:text-foreground">Verify</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
