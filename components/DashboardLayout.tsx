'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from './Navbar'

interface DashboardLayoutProps {
  children: ReactNode
  userType: 'borrower' | 'store-owner'
}

export function DashboardLayout({ 
  children, 
  userType
}: DashboardLayoutProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
    } else if (user?.userType && user.userType !== userType) {
      // Redirect to correct dashboard if user type doesn't match
      if (user.userType === 'borrower') {
        router.push('/borrower/dashboard')
      } else {
        router.push('/store-owner/dashboard')
      }
    }
  }, [isAuthenticated, user, userType, router])

  // Show loading state while checking authentication
  if (!isAuthenticated || (user?.userType && user.userType !== userType)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
