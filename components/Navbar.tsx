'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { WalletConnectModal } from '@/components/WalletConnectModal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu, Wallet, User, LogOut, Settings } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, connectWallet: authConnectWallet, disconnectWallet } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showWalletModal, setShowWalletModal] = useState(false)

  const truncateAddress = (address: string) => {
    if (!address) return ''
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const getDashboardLink = () => {
    if (user?.userType === 'borrower') return '/borrower/dashboard'
    if (user?.userType === 'store-owner') return '/store-owner/dashboard'
    return '/'
  }

  const getProfileLink = () => {
    if (user?.userType === 'borrower') return '/borrower/profile'
    if (user?.userType === 'store-owner') return '/store-owner/profile'
    return '/'
  }

  const handleConnectWallet = () => {
    setShowWalletModal(true)
  }

  const handleWalletConnected = async (address: string, walletType: string) => {
    await authConnectWallet(address, walletType)
    router.push('/select-role')
  }

  const handleDisconnect = () => {
    disconnectWallet()
    router.push('/')
  }

  return (
    <>
      <WalletConnectModal
        open={showWalletModal}
        onOpenChange={setShowWalletModal}
        onConnect={handleWalletConnected}
      />

      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
                KhataChain
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user?.userType && (
              <>
                <Link 
                  href={getDashboardLink()}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    pathname === getDashboardLink() ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  Dashboard
                </Link>
                {user.userType === 'borrower' && (
                  <>
                    <Link 
                      href="/borrower/credits"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        pathname === '/borrower/credits' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      My Credits
                    </Link>
                    <Link 
                      href="/borrower/history"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        pathname === '/borrower/history' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      History
                    </Link>
                  </>
                )}
                {user.userType === 'store-owner' && (
                  <>
                    <Link 
                      href="/store-owner/credits"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        pathname === '/store-owner/credits' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Credit Entries
                    </Link>
                    <Link 
                      href="/store-owner/stripe-setup"
                      className={`text-sm font-medium transition-colors hover:text-primary ${
                        pathname === '/store-owner/stripe-setup' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      Payments
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="hidden sm:flex items-center gap-2">
                  <Wallet className="h-3 w-3" />
                  {truncateAddress(user?.walletAddress || '')}
                </Badge>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user?.userType === 'borrower' ? 'B' : 'S'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={getProfileLink()} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={getDashboardLink()} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive cursor-pointer" onClick={handleDisconnect}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Disconnect Wallet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button onClick={handleConnectWallet}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {user?.userType && (
              <>
                <Link 
                  href={getDashboardLink()}
                  className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {user.userType === 'borrower' && (
                  <>
                    <Link 
                      href="/borrower/credits"
                      className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      My Credits
                    </Link>
                    <Link 
                      href="/borrower/history"
                      className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      History
                    </Link>
                  </>
                )}
                {user.userType === 'store-owner' && (
                  <>
                    <Link 
                      href="/store-owner/credits"
                      className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Credit Entries
                    </Link>
                    <Link 
                      href="/store-owner/stripe-setup"
                      className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Payments
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </nav>
    </>
  )
}
