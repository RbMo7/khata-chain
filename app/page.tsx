'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { AuthModal } from '@/components/AuthModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Shield, Wallet, ChartBar, Zap, Globe, Lock } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { user, isAuthenticated, connectWallet } = useAuth()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4" variant="secondary">
              Powered by Solana & Stripe
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Decentralized Credit for Informal Economies
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              KhataChain brings transparency, trust, and financial inclusion through blockchain-powered credit tracking and fiat settlement.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="w-full sm:w-auto" onClick={handleGetStarted}>
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                <a href="#features">
                  Learn More
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose KhataChain?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for the modern informal economy with security, transparency, and flexibility at its core.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Citizenship Verification</CardTitle>
              <CardDescription>
                One person, one account. Privacy-preserving SHA-256 hashing prevents duplicate registrations across wallets.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-1/10 flex items-center justify-center mb-2">
                <Wallet className="h-6 w-6 text-chart-1" />
              </div>
              <CardTitle>Hybrid Payments</CardTitle>
              <CardDescription>
                Repay with Solana tokens OR fiat (UPI, cards, netbanking) via Stripe. Maximum flexibility for borrowers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-2">
                <ChartBar className="h-6 w-6 text-chart-2" />
              </div>
              <CardTitle>Reputation NFTs</CardTitle>
              <CardDescription>
                Soulbound NFTs track your credit history on-chain. Build trust and unlock better terms over time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-2">
                <Zap className="h-6 w-6 text-chart-3" />
              </div>
              <CardTitle>Instant Settlement</CardTitle>
              <CardDescription>
                Store owners receive payments instantly via Stripe Connect. No waiting periods or complex processes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-4/10 flex items-center justify-center mb-2">
                <Globe className="h-6 w-6 text-chart-4" />
              </div>
              <CardTitle>Global & Local</CardTitle>
              <CardDescription>
                Solana's global infrastructure meets local payment methods. Accept payments from anywhere, settle locally.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-5/10 flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-chart-5" />
              </div>
              <CardTitle>Secure & Compliant</CardTitle>
              <CardDescription>
                Bank-grade security with PCI compliance. Your data is encrypted, and card details never touch our servers.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg">
              Simple, transparent, and secure credit management in three steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Register</h3>
              <p className="text-muted-foreground">
                Connect your wallet and verify your citizenship number. One-time setup, lifetime access.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Build Credit</h3>
              <p className="text-muted-foreground">
                Store owners create credit entries. Every transaction is recorded on-chain as an NFT.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Repay & Grow</h3>
              <p className="text-muted-foreground">
                Repay with crypto or fiat. Build your reputation and unlock better credit terms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl md:text-4xl mb-4">
              Ready to Get Started?
            </CardTitle>
            <CardDescription className="text-lg">
              Join thousands of borrowers and store owners building financial trust on the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="w-full sm:w-auto" onClick={handleGetStarted}>
              {isAuthenticated ? 'Go to Dashboard' : 'Get Started Now'}
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">KhataChain</h3>
              <p className="text-sm text-muted-foreground">
                Decentralized credit management for the informal economy.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/borrower/dashboard" className="hover:text-foreground">For Borrowers</Link></li>
                <li><Link href="/store-owner/dashboard" className="hover:text-foreground">For Store Owners</Link></li>
                <li><Link href="#" className="hover:text-foreground">Features</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Documentation</Link></li>
                <li><Link href="#" className="hover:text-foreground">API Reference</Link></li>
                <li><Link href="#" className="hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-foreground">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2026 KhataChain. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
