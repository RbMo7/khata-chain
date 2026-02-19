'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowUpRight,
  CheckCircle,
  Clock,
  BarChart3,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { storeOwnerApi } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'

export default function StoreOwnerDashboard() {
  const { user } = useAuth()
  
  // Fetch real data from API
  const { data: stats, loading: statsLoading, error: statsError } = useApi(
    () => storeOwnerApi.getStats(),
    []
  )

  const { data: creditsData, loading: creditsLoading, error: creditsError } = useApi(
    () => storeOwnerApi.getCredits({ recent: true, limit: 10 }),
    []
  )

  const creditEntries = creditsData?.data?.credits || []

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
      case 'pending':
        return 'outline'
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
      <DashboardLayout userType="store-owner">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  // Error state
  if (statsError || creditsError) {
    return (
      <DashboardLayout userType="store-owner">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="store-owner">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Store Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your credits and track payments
            </p>
          </div>
          <div className="flex gap-2">
            {!stats.stripeConnected && (
              <Link href="/store-owner/stripe-setup">
                <Button variant="outline">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Setup Stripe
                </Button>
              </Link>
            )}
            <Link href="/store-owner/create-credit">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Credit Entry
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Outstanding Credit
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats?.data?.totalOutstanding || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {creditEntries.filter((c: any) => c.status === 'active' || c.status === 'overdue').length} active credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Collected
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats?.data?.totalCollected || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Borrowers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.data?.activeBorrowers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                With outstanding credits
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Settlements
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(stats?.data?.pendingPayment || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From Stripe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Connection Banner */}
        {!stats?.data?.stripeConnected && (
          <Card className="border-chart-2/50 bg-chart-2/5">
            <CardHeader>
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-chart-2 mt-0.5" />
                <div className="flex-1">
                  <CardTitle className="text-lg">Connect Stripe to Accept Payments</CardTitle>
                  <CardDescription className="mt-1">
                    Enable your borrowers to repay with fiat currency (UPI, cards, netbanking).
                    Setup takes less than 5 minutes.
                  </CardDescription>
                  <Link href="/store-owner/stripe-setup">
                    <Button className="mt-4" variant="default">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Setup Stripe Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="credits" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credits">Recent Credits ({creditEntries.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="credits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Credit Entries</CardTitle>
                <CardDescription>
                  Credits awaiting repayment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {creditEntries.map((credit: any) => {
                    const daysUntilDue = getDaysUntilDue(credit.due_date)
                    const isOverdue = daysUntilDue < 0

                    return (
                      <div
                        key={credit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{credit.borrower?.full_name || credit.borrower_pubkey}</h3>
                            <Badge variant={getStatusColor(credit.status)}>
                              {credit.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDate(credit.created_at)} • Due {formatDate(credit.due_date)}
                            {isOverdue && (
                              <span className="text-destructive ml-1">
                                (Overdue by {Math.abs(daysUntilDue)} days)
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
                              NPR
                            </div>
                          </div>
                          <Link href={`/store-owner/credits/${credit.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}

                  {creditEntries.length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-medium">No credits issued yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start issuing credits to your customers
                      </p>
                      <Link href="/store-owner/create-credit">
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Issue First Credit
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {creditEntries.length > 0 && (
                  <Link href="/store-owner/credits">
                    <Button variant="outline" className="w-full mt-4">
                      View All Credits
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
