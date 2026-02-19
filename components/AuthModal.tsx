'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Wallet, AlertCircle, Loader2, ShoppingBag, User, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/lib/api-client'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (walletAddress: string, walletType: string, userType: 'borrower' | 'store-owner', name?: string, email?: string) => void
}

type WalletProvider = {
  name: string
  adapter: string
  windowKey: string
  installed: boolean
}

type Step = 'wallet' | 'role' | 'signup'

export function AuthModal({ open, onOpenChange, onComplete }: AuthModalProps) {
  const [step, setStep] = useState<Step>('wallet')
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [walletType, setWalletType] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'borrower' | 'store-owner' | null>(null)
  const [isExistingUser, setIsExistingUser] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isCheckingUser, setIsCheckingUser] = useState(false)

  // Clear state when modal is closed/opened
  useEffect(() => {
    if (!open) {
      setStep('wallet')
      setError(null)
      setConnecting(null)
      setWalletAddress('')
      setWalletType('')
      setSelectedRole(null)
      setIsExistingUser(false)
      setName('')
      setEmail('')
      setIsCheckingUser(false)
    }
  }, [open])

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>
    return new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      promise.then(
        (val) => { clearTimeout(timer); resolve(val) },
        (err) => { clearTimeout(timer); reject(err) }
      )
    })
  }

  // Check which wallet extensions are installed
  const walletProviders: WalletProvider[] = [
    {
      name: 'Phantom',
      adapter: 'phantom',
      windowKey: 'solana',
      installed: typeof window !== 'undefined' && 'solana' in window && (window as any).solana?.isPhantom,
    },
    {
      name: 'Solflare',
      adapter: 'solflare',
      windowKey: 'solflare',
      installed: typeof window !== 'undefined' && 'solflare' in window,
    },
    {
      name: 'Backpack',
      adapter: 'backpack',
      windowKey: 'backpack',
      installed: typeof window !== 'undefined' && 'backpack' in window,
    },
    {
      name: 'Glow',
      adapter: 'glow',
      windowKey: 'glow',
      installed: typeof window !== 'undefined' && 'glow' in window,
    },
  ]

  const handleWalletConnect = async (provider: WalletProvider) => {
    setError(null)
    setConnecting(provider.adapter)

    try {
      // Check if wallet exists
      if (!provider.installed) {
        setError(`${provider.name} wallet is not installed. Please install it first.`)
        setConnecting(null)
        return
      }

      // Get the wallet object from window using the correct key
      const walletObj = (window as any)[provider.windowKey]
      
      if (!walletObj) {
        throw new Error(`${provider.name} wallet not found in window object`)
      }

      // Check if wallet has connect method
      if (typeof walletObj.connect !== 'function') {
        throw new Error(`${provider.name} wallet is not properly initialized`)
      }

      console.log(`Attempting to connect to ${provider.name}...`)

      // Request connection with timeout (30 seconds)
      let resp: any
      try {
        resp = await withTimeout(
          walletObj.connect({ onlyIfTrusted: false }),
          30000,
          'Connection timed out. Please try again.'
        )
        console.log('Wallet connection response:', resp)
      } catch (connectErr: any) {
        // Log the error details for debugging
        console.log('Connection error details:', {
          message: connectErr?.message,
          code: connectErr?.code,
          error: connectErr
        })
        
        // Check for user rejection - this is a normal user action, not an error
        if (connectErr?.code === 4001 || 
            connectErr?.message?.toLowerCase().includes('rejected') || 
            connectErr?.message?.toLowerCase().includes('user rejected') ||
            connectErr?.message?.toLowerCase().includes('user denied')) {
          setError('Connection request was cancelled')
          setConnecting(null)
          return
        }
        
        // Check for wallet locked
        if (connectErr?.message?.includes('locked') || 
            connectErr?.message?.includes('Wallet is locked')) {
          console.warn('Wallet is locked:', connectErr)
          throw new Error(`${provider.name} wallet is locked. Please unlock it and try again.`)
        }
        
        // Log actual errors
        console.error('Wallet connect() error:', connectErr)
        
        // Re-throw with original error or a generic message
        const errorMsg = connectErr?.message || connectErr?.toString() || 'Failed to connect to wallet'
        throw new Error(errorMsg)
      }
      
      // Get public key from response
      let publicKey = ''
      if (resp?.publicKey) {
        publicKey = typeof resp.publicKey === 'string' ? resp.publicKey : resp.publicKey.toString()
      } else if (walletObj.publicKey) {
        publicKey = typeof walletObj.publicKey === 'string' ? walletObj.publicKey : walletObj.publicKey.toString()
      } else if (resp && typeof resp === 'string') {
        publicKey = resp
      }

      if (!publicKey) {
        console.error('Could not extract public key from:', { resp, walletObj })
        throw new Error('Could not retrieve wallet address from provider')
      }

      console.log(`Successfully connected to ${provider.name}:`, publicKey)

      // Store wallet info
      setWalletAddress(publicKey)
      setWalletType(provider.name)
      
      // Check if user exists in database
      setIsCheckingUser(true)
      try {
        const checkResponse = await authApi.check(publicKey)
        console.log('User check response:', checkResponse)
        
        if (checkResponse?.success && checkResponse?.data?.exists) {
          // Existing user - login directly
          const existingUser = checkResponse.data.user
          console.log('Existing user found:', existingUser)
          await onComplete(publicKey, provider.name, existingUser.userType)
          onOpenChange(false)
          return
        } else {
          // New user - show role selection
          setIsExistingUser(false)
          setStep('role')
        }
      } catch (err: any) {
        console.error('Failed to check user:', err)
        // On error, proceed to role selection anyway
        setIsExistingUser(false)
        setStep('role')
      } finally {
        setIsCheckingUser(false)
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err)
      
      if (err?.message?.includes('locked')) {
        setError(err.message)
      } else if (err?.message?.includes('timeout') || err?.message?.includes('timed out')) {
        setError('Connection timed out. Please try again.')
      } else if (err?.message) {
        setError(err.message)
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Failed to connect wallet. Please try again.')
      }
    } finally {
      setConnecting(null)
    }
  }

  const handleContinue = async () => {
    if (!selectedRole || !walletAddress || !walletType) return

    // New user - show signup form to collect details
    setStep('signup')
  }
  
  const handleSignup = async () => {
    if (!selectedRole || !walletAddress || !walletType || !name.trim()) {
      setError('Please fill in all required fields')
      return
    }

    setConnecting('signup')
    try {
      setError(null)
      await onComplete(walletAddress, walletType, selectedRole, name.trim(), email.trim() || undefined)
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to complete registration')
    } finally {
      setConnecting(null)
    }
  }

  const handleBackToWallet = () => {
    setStep('wallet')
    setSelectedRole(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'wallet' && (
              <>
                <Wallet className="h-5 w-5" />
                Connect Your Wallet
              </>
            )}
            {step === 'role' && (
              <>
                <User className="h-5 w-5" />
                Choose Your Role
              </>
            )}
            {step === 'signup' && (
              <>
                <User className="h-5 w-5" />
                Complete Your Profile
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'wallet' && 'Choose a wallet to connect to KhataChain'}
            {step === 'role' && 'Select how you want to use KhataChain'}
            {step === 'signup' && 'Enter your details to complete registration'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Wallet Selection */}
          {step === 'wallet' && (
            <>
              {walletProviders.map((provider) => (
                <Button
                  key={provider.adapter}
                  variant="outline"
                  className="w-full h-auto py-3 px-4 justify-start"
                  onClick={() => handleWalletConnect(provider)}
                  disabled={connecting !== null || !provider.installed}
                >
                  <div className="flex items-center w-full">
                    <Wallet className="h-5 w-5 mr-3 text-primary" />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{provider.name}</div>
                      {!provider.installed && (
                        <div className="text-xs text-muted-foreground">Not installed</div>
                      )}
                      {provider.installed && connecting !== provider.adapter && (
                        <div className="text-xs text-muted-foreground">Click to connect</div>
                      )}
                    </div>
                    {connecting === provider.adapter && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </Button>
              ))}

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>New to Solana?</strong> Install a wallet extension from the official websites:
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="underline">Phantom</a></li>
                    <li><a href="https://solflare.com" target="_blank" rel="noopener noreferrer" className="underline">Solflare</a></li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}

          {/* Step 2: Role Selection */}
          {step === 'role' && (
            <>
              <Alert className="bg-primary/10 border-primary/20">
                <Wallet className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong className="font-semibold">Connected:</strong>{' '}
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)} ({walletType})
                </AlertDescription>
              </Alert>

              <div className="grid gap-3">
                <Card
                  className={`cursor-pointer transition-all p-4 ${
                    selectedRole === 'borrower' 
                      ? 'border-primary border-2 bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedRole('borrower')}
                >
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Borrower</h3>
                      <p className="text-sm text-muted-foreground">
                        Get instant credit from local stores
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className={`cursor-pointer transition-all p-4 ${
                    selectedRole === 'store-owner' 
                      ? 'border-primary border-2 bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedRole('store-owner')}
                >
                  <div className="flex items-start gap-3">
                    <ShoppingBag className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Store Owner</h3>
                      <p className="text-sm text-muted-foreground">
                        Provide credit to customers and manage payments
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleBackToWallet}
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleContinue}
                  disabled={!selectedRole || connecting !== null}
                  className="flex-1"
                >
                  Continue
                  {connecting && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Signup Form for New Users */}
          {step === 'signup' && (
            <>
              <Alert className="bg-primary/10 border-primary/20">
                <Wallet className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong className="font-semibold">Connected:</strong>{' '}
                  {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)} ({walletType})
                  {' • '}
                  <strong>{selectedRole === 'borrower' ? 'Borrower' : 'Store Owner'}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll use this to send you updates about your account
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('role')}
                  className="flex-1"
                  disabled={connecting !== null}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleSignup}
                  disabled={!name.trim() || connecting !== null}
                  className="flex-1"
                >
                  {connecting === 'signup' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
