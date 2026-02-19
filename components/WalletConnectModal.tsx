'use client'

import { useState } from 'react'
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

interface WalletConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConnect: (walletAddress: string, walletType: string) => void
}

type WalletProvider = {
  name: string
  icon: string
  adapter: string
  windowKey: string
  installed: boolean
}

export function WalletConnectModal({ open, onOpenChange, onConnect }: WalletConnectModalProps) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check which wallet extensions are installed
  const walletProviders: WalletProvider[] = [
    {
      name: 'Phantom',
      icon: '👻',
      adapter: 'phantom',
      windowKey: 'solana',
      installed: typeof window !== 'undefined' && 'solana' in window && (window as any).solana?.isPhantom,
    },
    {
      name: 'Solflare',
      icon: '🔥',
      adapter: 'solflare',
      windowKey: 'solflare',
      installed: typeof window !== 'undefined' && 'solflare' in window,
    },
    {
      name: 'Backpack',
      icon: '🎒',
      adapter: 'backpack',
      windowKey: 'backpack',
      installed: typeof window !== 'undefined' && 'backpack' in window,
    },
    {
      name: 'Glow',
      icon: '✨',
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
        setError(`${provider.name} wallet not found`)
        setConnecting(null)
        return
      }

      // Request connection
      const resp = await walletObj.connect()
      const publicKey = resp.publicKey?.toString() || 
                       walletObj.publicKey?.toString() ||
                       resp.toString()

      if (!publicKey) {
        throw new Error('Could not get wallet address')
      }

      // Success - call the onConnect handler
      onConnect(publicKey, provider.name)
      onOpenChange(false)
    } catch (err) {
      console.error('Wallet connection error:', err)
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('rejected')) {
          setError('Connection request was rejected')
        } else {
          setError(err.message)
        }
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
              disabled={connecting !== null}
            >
              <div className="flex items-center w-full">
                <span className="text-2xl mr-3">{provider.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{provider.name}</div>
                  {!provider.installed && (
                    <div className="text-xs text-muted-foreground">Not installed</div>
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
