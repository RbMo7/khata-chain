'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ShoppingBag, 
  User, 
  Check,
  ArrowRight,
  Info
} from 'lucide-react'

export default function SelectRole() {
  const router = useRouter()
  const { setUserType, user } = useAuth()
  const [selected, setSelected] = useState<'borrower' | 'store-owner' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!selected || !user) return

    setLoading(true)
    setError(null)
    
    try {
      // Set the user type in context (calls API to authenticate)
      await setUserType(selected)
      
      // For borrowers, redirect to citizenship verification if not verified
      if (selected === 'borrower' && !user.citizenshipVerified) {
        router.push('/borrower/verify')
      } else if (selected === 'borrower') {
        router.push('/borrower/dashboard')
      } else {
        // Store owners go directly to dashboard
        router.push('/store-owner/dashboard')
      }
    } catch (error: any) {
      console.error('Failed to set user type:', error)
      setError(error?.message || 'Failed to complete registration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to KhataChain</h1>
          <p className="text-muted-foreground text-lg">
            Choose your role to get started
          </p>
        </div>

        {/* Connected Wallet Info */}
        {user && (
          <Alert className="bg-chart-2/10 border-chart-2/20">
            <Check className="h-4 w-4 text-chart-2" />
            <AlertDescription>
              <strong className="font-semibold">Wallet Connected:</strong>{' '}
              {user.walletAddress.slice(0, 4)}...{user.walletAddress.slice(-4)} ({user.walletType})
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Borrower Card */}
          <Card 
            className={`cursor-pointer transition-all ${
              selected === 'borrower' 
                ? 'border-primary border-2 shadow-lg scale-105' 
                : 'hover:border-primary/50 hover:shadow-md'
            }`}
            onClick={() => setSelected('borrower')}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-chart-1/10 rounded-lg">
                  <User className="h-8 w-8 text-chart-1" />
                </div>
                {selected === 'borrower' && (
                  <div className="p-1 bg-primary rounded-full">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardTitle>I'm a Borrower</CardTitle>
              <CardDescription>
                I want to buy now and pay later at local stores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Get instant credit for purchases</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Pay conveniently in installments</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Build reputation with on-time payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Track all credits in one place</span>
                </li>
              </ul>
              
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Requires one-time citizenship verification to prevent duplicate accounts
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Store Owner Card */}
          <Card 
            className={`cursor-pointer transition-all ${
              selected === 'store-owner' 
                ? 'border-primary border-2 shadow-lg scale-105' 
                : 'hover:border-primary/50 hover:shadow-md'
            }`}
            onClick={() => setSelected('store-owner')}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className="p-3 bg-chart-3/10 rounded-lg">
                  <ShoppingBag className="h-8 w-8 text-chart-3" />
                </div>
                {selected === 'store-owner' && (
                  <div className="p-1 bg-primary rounded-full">
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
              <CardTitle>I'm a Store Owner</CardTitle>
              <CardDescription>
                I want to offer credit to my customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Extend credit to trusted customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Track all credits and repayments</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Accept fiat payments via Stripe</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                  <span>Manage your khata digitally</span>
                </li>
              </ul>
              
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You can add Stripe Connect later to accept fiat repayments
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button 
            size="lg" 
            disabled={!selected || loading}
            onClick={handleContinue}
            className="min-w-[200px]"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Loading...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can always switch roles later from your profile settings
        </p>
      </div>
    </div>
  )
}
