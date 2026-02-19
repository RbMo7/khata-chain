'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '@/lib/api-client'

export type UserType = 'borrower' | 'store-owner' | null

interface User {
  walletAddress: string
  walletType: string
  userType: UserType
  citizenshipVerified: boolean
  name?: string | null
  email?: string | null
  id?: string | null
}

interface AuthContextType {
  user: User | null
  isConnecting: boolean
  isAuthenticated: boolean
  connectWallet: (address: string, walletType: string, userType: UserType, name?: string, email?: string) => Promise<void>
  disconnectWallet: () => void
  setUserType: (type: UserType) => Promise<void>
  updateUser: (updates: Partial<User>) => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage and verify with API on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = localStorage.getItem('khatachain_user')
        
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser)
          
          // Only load if user has an ID (fully authenticated)
          if (parsedUser.id && parsedUser.walletAddress) {
            setUser(parsedUser)
            
            // Try to reconnect to wallet silently
            try {
              await reconnectWallet(parsedUser.walletType)
            } catch (error) {
              console.log('Could not reconnect wallet (this is normal)')
            }
            
            // Try to refresh user data from API (optional)
            try {
              await refreshUserData()
            } catch (error) {
              // Refresh failed but user is still valid from localStorage
              console.log('Could not refresh user data (continuing with cached data)')
            }
          } else {
            // Remove incomplete user data
            console.log('Removing incomplete user data from localStorage')
            localStorage.removeItem('khatachain_user')
          }
        }
      } catch (error) {
        console.error('Failed to load user from localStorage:', error)
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
      
      if (!walletObj) {
        console.log('Wallet not found:', walletType)
        return false
      }

      if (walletObj.isConnected) {
        // Wallet is still connected
        console.log('Wallet already connected:', walletType)
        return true
      }
      
      // Try silent reconnect with onlyIfTrusted flag
      try {
        await walletObj.connect({ onlyIfTrusted: true })
        console.log('Wallet reconnected silently:', walletType)
        return true
      } catch (err) {
        // Silent reconnect failed - user needs to explicitly connect
        console.log('Silent reconnect failed for:', walletType)
        return false
      }
    } catch (error) {
      console.log('Could not reconnect wallet:', error)
      return false
    }
  }

  const refreshUserData = async () => {
    if (!user || !user.id) {
      console.log('No user to refresh')
      return
    }
    
    try {
      console.log('Refreshing user data...')
      const response = await authApi.getCurrentUser()
      
      if (!response) {
        console.warn('No response from refresh API')
        return
      }
      
      if (response.success && response.data) {
        const apiUser = response.data
        const refreshedUser = {
          walletAddress: apiUser.walletAddress,
          walletType: user.walletType, // Keep existing wallet type
          userType: apiUser.userType,
          citizenshipVerified: apiUser.citizenshipVerified || false,
          name: apiUser.name,
          email: apiUser.email,
          id: apiUser.id,
        }
        setUser(refreshedUser)
        console.log('User data refreshed successfully')
      } else {
        console.warn('Refresh API returned unsuccessful response:', response)
      }
    } catch (error) {
      console.warn('Failed to refresh user data:', error)
      // Don't throw - user data from localStorage is still valid
    }
  }

  const connectWallet = async (address: string, walletType: string, userType: UserType, name?: string, email?: string) => {
    setIsConnecting(true)
    
    try {
      if (!address) {
        throw new Error('Wallet address is required')
      }
      
      if (!userType) {
        throw new Error('User type is required')
      }

      console.log('Authenticating user:', { address, walletType, userType, name, email })
      
      // Call login API to create/authenticate user
      const response = await authApi.login(address, userType, name, email)
      console.log('Login API response:', response)
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Authentication failed')
      }
      
      if (!response.data || !response.data.user) {
        throw new Error('No user data in response')
      }
      
      const apiUser = response.data.user
      const newUser: User = {
        walletAddress: apiUser.walletAddress,
        walletType: walletType,
        userType: apiUser.userType,
        citizenshipVerified: apiUser.citizenshipVerified || false,
        name: apiUser.name,
        email: apiUser.email,
        id: apiUser.id,
      }
      
      // Save to localStorage immediately before setting state
      // This ensures auth token is available for subsequent API calls
      localStorage.setItem('khatachain_user', JSON.stringify(newUser))
      
      setUser(newUser)
      console.log('User authenticated successfully:', newUser)
    } catch (error: any) {
      console.error('Failed to authenticate:', error)
      
      // Clear any partial state
      setUser(null)
      
      // Re-throw with a clear message
      const errorMessage = error?.message || error?.toString() || 'Failed to authenticate'
      throw new Error(errorMessage)
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

  const setUserType = async (type: UserType) => {
    if (!user || !user.walletAddress) {
      throw new Error('No wallet connected')
    }
    
    if (!type) {
      throw new Error('User type is required')
    }
    
    try {
      console.log('Setting user type:', { type, walletAddress: user.walletAddress })
      
      // Call login API to create/authenticate user
      const response = await authApi.login(user.walletAddress, type)
      console.log('Login API response:', response)
      
      if (!response) {
        throw new Error('No response from server')
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Authentication failed')
      }
      
      if (!response.data || !response.data.user) {
        throw new Error('No user data in response')
      }
      
      const apiUser = response.data.user
      console.log('API user data:', apiUser)
      
      const updatedUser: User = {
        walletAddress: apiUser.walletAddress,
        walletType: user.walletType,
        userType: apiUser.userType,
        citizenshipVerified: apiUser.citizenshipVerified || false,
        name: apiUser.name,
        email: apiUser.email,
        id: apiUser.id,
      }
      
      // Save to localStorage immediately before setting state
      localStorage.setItem('khatachain_user', JSON.stringify(updatedUser))
      
      setUser(updatedUser)
      console.log('User authenticated successfully:', updatedUser)
    } catch (error: any) {
      console.error('Failed to set user type:', error)
      throw error
    }
  }

  const updateUser = (updates: Partial<User>) => {
    if (!user) return
    
    setUser({
      ...user,
      ...updates,
    })
  }

  const refreshUser = async () => {
    await refreshUserData()
  }

  const value: AuthContextType = {
    user,
    isConnecting,
    isAuthenticated: user !== null && user.userType !== null,
    connectWallet,
    disconnectWallet,
    setUserType,
    updateUser,
    refreshUser,
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
