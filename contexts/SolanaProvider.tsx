'use client'

/**
 * SolanaProvider — wraps the app with Wallet Adapter connection/wallet/modal providers.
 * Must be a client component. Placed inside layout.tsx > AuthProvider.
 */

import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import '@solana/wallet-adapter-react-ui/styles.css'

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const network =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) ||
    WalletAdapterNetwork.Testnet

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    `https://api.${network}.solana.com`

  // Only instantiate adapters once
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
    ],
    [network]
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
