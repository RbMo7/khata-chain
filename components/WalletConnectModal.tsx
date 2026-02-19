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
import { Wallet, AlertCircle, Loader2 } from 'lucide-react'
import { UserType } from '@/contexts/AuthContext'

interface WalletConnectModalProps {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onConnect: (walletAddress: string, walletType: string, userType: UserType) => void,
  userType: UserType 
}

type WalletProvider = {
  name: string
  icon: string
  adapter: string
  windowKey: string
  installed: boolean
}

export function WalletConnectModal({ open, onOpenChange, onConnect, userType }: WalletConnectModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Clear error when modal is closed/opened
  useEffect(() => {
    if (!open) {
      setError(null)
      setConnecting(null)
    }
  }, [open])

  // Helper function to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
      )
    ])
  }

  // Check which wallet extensions are installed
  const walletProviders: WalletProvider[] = [
    {
      name: 'Phantom',
      icon: '',
      adapter: 'phantom',
      windowKey: 'solana',
      installed: typeof window !== 'undefined' && 'solana' in window && (window as any).solana?.isPhantom,
    },
    {
      name: 'Solflare',
      icon: '',
      adapter: 'solflare',
      windowKey: 'solflare',
      installed: typeof window !== 'undefined' && 'solflare' in window,
    },
    {
      name: 'Backpack',
      icon: '',
      adapter: 'backpack',
      windowKey: 'backpack',
      installed: typeof window !== 'undefined' && 'backpack' in window,
    },
    {
      name: 'Glow',
      icon: '',
      adapter: 'glow',
      windowKey: 'glow',
      installed: typeof window !== 'undefined' && 'glow' in window,
    },
  ]

  const handleConnect = async (provider: WalletProvider) => {
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

      // For Phantom, wait for it to be ready
      if (provider.adapter === 'phantom' && walletObj) {
        // Wait for Phantom to be fully initialized (max 5 seconds)
        const startTime = Date.now()
        while (!walletObj.isConnected && !walletObj.publicKey && (Date.now() - startTime) < 5000) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

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
        // Only treat as rejection if code is 4001 OR message explicitly mentions rejection
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

      // Success - call the onConnect handler
      await onConnect(publicKey, provider.name, userType)
      onOpenChange(false)
    } catch (err: any) {
      // Log actual errors (user rejection is already handled above)
      console.error('Wallet connection error:', err)
      
      // Handle different error types
      if (err?.message?.includes('locked')) {
        setError(err.message)
      } else if (err?.message?.includes('timeout') || err?.message?.includes('timed out')) {
        setError('Connection timed out. Please try again.')
      } else if (err?.message) {
        setError(err.message)
      } else if (typeof err === 'string') {
        setError(err)
      } else if (err?.toString && typeof err.toString === 'function') {
        setError(err.toString())
      } else {
        setError('Failed to connect wallet. Please try again.')
      }
    } finally {
      setConnecting(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Your Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to KhataChain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {walletProviders.map((provider) => (
            <Button
              key={provider.adapter}
              variant="outline"
              className="w-full h-auto py-3 px-4 justify-start"
              onClick={() => handleConnect(provider)}
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
        </div>

        <div className="mt-4 space-y-2">
          <Alert>
            <AlertDescription className="text-xs">
              <strong>New to Solana?</strong> Install a wallet extension from the official websites:
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li><a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="underline">Phantom</a></li>
                <li><a href="https://solflare.com" target="_blank" rel="noopener noreferrer" className="underline">Solflare</a></li>
                <li><a href="https://backpack.app" target="_blank" rel="noopener noreferrer" className="underline">Backpack</a></li>
                <li><a href="https://glow.app" target="_blank" rel="noopener noreferrer" className="underline">Glow</a></li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}
