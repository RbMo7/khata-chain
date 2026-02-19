'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserType = 'borrower' | 'store-owner' | null

interface User {
  walletAddress: string
  walletType: string
  userType: UserType
  citizenshipVerified: boolean
  name?: string
  email?: string
}

interface AuthContextType {
  user: User | null
  isConnecting: boolean
  isAuthenticated: boolean
  connectWallet: (address: string, walletType: string) => void
  disconnectWallet: () => void
  setUserType: (type: UserType) => void
  updateUser: (updates: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = localStorage.getItem('khatachain_user')
        if (stored) {
          const userData = JSON.parse(stored)
          setUser(userData)
          
          // Try to reconnect to wallet
          await reconnectWallet(userData.walletType)
        }
      } catch (error) {
        console.error('Failed to load user:', error)
        localStorage.removeItem('khatachain_user')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('khatachain_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('khatachain_user')
    }
  }, [user])

  const reconnectWallet = async (walletType: string) => {
    try {
      // Map wallet names to their window keys
      const walletKeyMap: Record<string, string> = {
        'Phantom': 'solana',
        'Solflare': 'solflare',
        'Backpack': 'backpack',
        'Glow': 'glow',
      }
      
      const windowKey = walletKeyMap[walletType] || walletType.toLowerCase()
      const walletObj = (window as any)[windowKey]
      
      if (walletObj && walletObj.isConnected) {
        // Wallet is still connected, no action needed
        return true
      } else if (walletObj) {
        // Try silent reconnect
        await walletObj.connect({ onlyIfTrusted: true })
        return true
      }
    } catch (error) {
      console.log('Could not reconnect wallet:', error)
    }
    return false
  }

  const connectWallet = async (address: string, walletType: string) => {
    setIsConnecting(true)
    
    try {
      // Check if user exists in the database
      // For now, we'll create a new user object
      // In production, this should fetch from the API
      
      const newUser: User = {
        walletAddress: address,
        walletType,
        userType: null, // Will be set after user selects their role
        citizenshipVerified: false,
      }
      
      setUser(newUser)
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    // Disconnect from wallet extension
    if (user?.walletType) {
      const walletKeyMap: Record<string, string> = {
        'Phantom': 'solana',
        'Solflare': 'solflare',
        'Backpack': 'backpack',
        'Glow': 'glow',
      }
      
      const windowKey = walletKeyMap[user.walletType] || user.walletType.toLowerCase()
      const walletObj = (window as any)[windowKey]
      
      if (walletObj && walletObj.disconnect) {
        walletObj.disconnect().catch(console.error)
      }
    }
    
    setUser(null)
  }

  const setUserType = (type: UserType) => {
    if (!user) return
    
    setUser({
      ...user,
      userType: type,
    })
  }

  const updateUser = (updates: Partial<User>) => {
    if (!user) return
    
    setUser({
      ...user,
      ...updates,
    })
  }

  const value: AuthContextType = {
    user,
    isConnecting,
    isAuthenticated: user !== null && user.userType !== null,
    connectWallet,
    disconnectWallet,
    setUserType,
    updateUser,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
