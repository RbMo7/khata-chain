import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/contexts/AuthContext'
import { SolanaProvider } from '@/contexts/SolanaProvider'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://khata-chain.vercel.app'

export const metadata: Metadata = {
  title: 'KhataChain — On-Chain Credit Bureau',
  description:
    'The first decentralized credit bureau for informal economies. Build a tamper-proof credit reputation on Solana — no bank account required.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'KhataChain — On-Chain Credit Bureau',
    description:
      'Build a tamper-proof credit reputation on Solana. No bank account. Just a wallet.',
    url: APP_URL,
    siteName: 'KhataChain',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KhataChain — On-Chain Credit Bureau',
    description:
      'Build a tamper-proof credit reputation on Solana. No bank account. Just a wallet.',
  },
  keywords: [
    'Solana', 'credit bureau', 'DeFi', 'microfinance', 'informal economy',
    'blockchain', 'reputation', 'khata', 'Nepal', 'financial inclusion',
  ],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SolanaProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </SolanaProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
