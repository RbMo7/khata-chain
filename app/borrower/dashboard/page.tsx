'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PendingCreditsActions } from '@/components/PendingCreditsActions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  Wallet,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { borrowerApi } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'

export default function BorrowerDashboard() {
  const { user } = useAuth()
  
  // Fetch real data from API
  const { data: stats, loading: statsLoading, error: statsError } = useApi(
    () => borrowerApi.getStats(),
    []
  )

  const { data: creditsData, loading: creditsLoading, error: creditsError } = useApi(
    () => borrowerApi.getCredits(),
    []
  )

  const activeCredits = creditsData?.data?.credits || []

  const formatAmount = (amount: number) => {
    return formatNPR(amount)
  }

  const formatDate = (dateString: string) => {
    return formatDateNP(dateString)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'overdue':
        return 'destructive'
      case 'completed':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Loading state
  if (statsLoading || creditsLoading) {
    return (
      <DashboardLayout userType="borrower">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (statsError || creditsError) {
    return (
      <DashboardLayout userType="borrower">
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {statsError || creditsError || 'Failed to load dashboard data. Please try again.'}
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="space-y-8">
        {/* Pending Credits Alert - HIGH PRIORITY */}
        <PendingCreditsActions />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
            <p className="text-muted-foreground mt-1">
              Here's your credit overview and activity
            </p>
          </div>
          {!user?.citizenshipVerified && (
            <Link href="/borrower/verify">
              <Button variant="outline" className="border-chart-2">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify Citizenship
              </Button>
            </Link>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Active Credit
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats?.data?.totalOwed || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {stats?.data?.activeCreditsCount || 0} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Credits
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.totalCredits || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Credits
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.activeCreditsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Payments
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.completedPaymentsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Credits ({activeCredits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Credit Entries</CardTitle>
                <CardDescription>
                  Credits that need repayment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeCredits.map((credit: any) => {
                    const daysUntilDue = getDaysUntilDue(credit.due_date)
                    const isOverdue = daysUntilDue < 0

                    return (
                      <div
                        key={credit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{credit.store_owner?.store_name || 'Store'}</h3>
                            <Badge variant={getStatusColor(credit.status)}>
                              {credit.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(credit.due_date)}
                            {isOverdue ? (
                              <span className="text-destructive ml-1">
                                (Overdue by {Math.abs(daysUntilDue)} days)
                              </span>
                            ) : (
                              <span className="ml-1">
                                (in {daysUntilDue} days)
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatAmount(credit.credit_amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {credit.currency || 'NPR'}
                            </div>
                          </div>
                          <Link href={`/borrower/repay?credit_entry_id=${credit.id}`}>
                            <Button size="sm">
                              Repay Now
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}

                  {activeCredits.length === 0 && (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No active credits</p>
                      <p className="text-sm text-muted-foreground">
                        You're all caught up!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Citizenship Verification Banner */}
        {!user?.citizenshipVerified && (
          <Card className="border-chart-2/50 bg-chart-2/5">
            <CardHeader>
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-chart-2 mt-0.5" />
                <div className="flex-1">
                  <CardTitle className="text-lg">Verify Your Citizenship</CardTitle>
                  <CardDescription className="mt-1">
                    Complete citizenship verification to unlock higher credit limits and better terms.
                    Your information is secured using SHA-256 hashing.
                  </CardDescription>
                  <Link href="/borrower/verify">
                    <Button className="mt-4" variant="default">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Start Verification
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
