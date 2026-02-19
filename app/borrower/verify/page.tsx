'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CitizenshipVerification } from '@/components/CitizenshipVerification'
import { 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Info
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function BorrowerVerify() {
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'verify' | 'success'>('info')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVerificationComplete = () => {
    setStep('success')
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
      router.push('/borrower/dashboard')
    }, 3000)
  }

  if (step === 'success') {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto">
          <Card className="border-chart-2/50 bg-chart-2/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-chart-2/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-chart-2" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Verification Complete!</h2>
                  <p className="text-muted-foreground mt-2">
                    Your citizenship has been verified successfully
                  </p>
                </div>
                <div className="pt-4">
                  <p className="text-sm text-muted-foreground">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Your Citizenship</h1>
          <p className="text-muted-foreground mt-2">
            Complete this one-time verification to build trust and unlock better credit terms
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === 'info' && (
          <>
            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Why Verify?</CardTitle>
                <CardDescription>
                  Citizenship verification helps prevent fraud and builds trust
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-2/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Higher Credit Limits</h3>
                      <p className="text-sm text-muted-foreground">
                        Access larger credit amounts with verified status
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-chart-1" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Better Terms</h3>
                      <p className="text-sm text-muted-foreground">
                        Qualify for lower interest rates and extended due dates
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-3/10 rounded-lg">
                      <Shield className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Prevent Duplicates</h3>
                      <p className="text-sm text-muted-foreground">
                        One person, one account across all wallets
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-4/10 rounded-lg">
                      <Lock className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Privacy Protected</h3>
                      <p className="text-sm text-muted-foreground">
                        Your data is hashed using SHA-256 encryption
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy Notice */}
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                <strong className="font-semibold">Your Privacy is Protected:</strong> We use SHA-256 hashing to securely 
                process your citizenship number. The original number is never stored on our servers - only a cryptographic 
                hash is kept for verification purposes.
              </AlertDescription>
            </Alert>

            <div className="flex justify-center">
              <Button onClick={() => setStep('verify')} size="lg">
                Continue to Verification
              </Button>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Details</CardTitle>
                <CardDescription>
                  Provide your citizenship identification number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CitizenshipVerification
                  onVerified={handleVerificationComplete}
                  onError={(err) => setError(err)}
                />
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Supported IDs: Aadhaar (India), Social Security Number (USA), National ID, Passport Number
              </AlertDescription>
            </Alert>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
