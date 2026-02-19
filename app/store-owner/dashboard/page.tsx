'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

export default function StoreOwnerDashboard() {
  // Mock data - replace with real API calls
  const stats = {
    totalOutstanding: 85000, // in paise
    totalCollected: 245000,
    activeBorrowers: 12,
    stripeConnected: true,
    pendingPayment: 25000
  }

  const creditEntries = [
    {
      id: '1',
      borrowerName: 'Rajesh Kumar',
      amount: 35000,
      dueDate: '2026-03-15',
      status: 'active' as const,
      created: '2026-02-01'
    },
    {
      id: '2',
      borrowerName: 'Priya Sharma',
      amount: 20000,
      dueDate: '2026-03-20',
      status: 'active' as const,
      created: '2026-02-10'
    },
    {
      id: '3',
      borrowerName: 'Amit Patel',
      amount: 15000,
      dueDate: '2026-03-10',
      status: 'overdue' as const,
      created: '2026-01-25'
    },
    {
      id: '4',
      borrowerName: 'Sunita Verma',
      amount: 15000,
      dueDate: '2026-03-05',
      status: 'active' as const,
      created: '2026-02-15'
    }
  ]

  const recentPayments = [
    {
      id: '1',
      borrowerName: 'Anil Singh',
      amount: 12000,
      date: '2026-02-18',
      method: 'stripe' as const,
      status: 'completed' as const
    },
    {
      id: '2',
      borrowerName: 'Meena Reddy',
      amount: 18000,
      date: '2026-02-17',
      method: 'on_chain' as const,
      status: 'completed' as const
    },
    {
      id: '3',
      borrowerName: 'Vikram Shah',
      amount: 25000,
      date: '2026-02-16',
      method: 'stripe' as const,
      status: 'pending' as const
    }
  ]

  const monthlyStats = [
    { month: 'Jan', credits: 125000, collections: 98000 },
    { month: 'Feb', credits: 156000, collections: 132000 },
    { month: 'Mar', credits: 85000, collections: 25000 }
  ]

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
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
              <div className="text-2xl font-bold">{formatAmount(stats.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From {creditEntries.filter(c => c.status === 'active' || c.status === 'overdue').length} active credits
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
              <div className="text-2xl font-bold">{formatAmount(stats.totalCollected)}</div>
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
              <div className="text-2xl font-bold">{stats.activeBorrowers}</div>
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
              <div className="text-2xl font-bold">{formatAmount(stats.pendingPayment)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                From Stripe
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stripe Connection Banner */}
        {!stats.stripeConnected && (
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
            <TabsTrigger value="credits">Credit Entries</TabsTrigger>
            <TabsTrigger value="payments">Recent Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                  {creditEntries.map((credit) => {
                    const daysUntilDue = getDaysUntilDue(credit.dueDate)
                    const isOverdue = daysUntilDue < 0

                    return (
                      <div
                        key={credit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{credit.borrowerName}</h3>
                            <Badge variant={getStatusColor(credit.status)}>
                              {credit.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Created {formatDate(credit.created)} • Due {formatDate(credit.dueDate)}
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
                              {formatAmount(credit.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              INR
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
                </div>

                <Link href="/store-owner/credits">
                  <Button variant="outline" className="w-full mt-4">
                    View All Credits
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>
                  Latest repayments from borrowers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          payment.status === 'completed' 
                            ? 'bg-chart-2/10' 
                            : 'bg-chart-1/10'
                        }`}>
                          {payment.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-chart-2" />
                          ) : (
                            <Clock className="h-4 w-4 text-chart-1" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{payment.borrowerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(payment.date)} • {payment.method === 'stripe' ? 'Stripe' : 'On-chain'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-chart-2">
                          {formatAmount(payment.amount)}
                        </div>
                        <Badge variant={getStatusColor(payment.status)} className="mt-1">
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/store-owner/payments">
                  <Button variant="outline" className="w-full mt-4">
                    View All Payments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Overview</CardTitle>
                <CardDescription>
                  Credits issued vs collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.map((stat) => (
                    <div key={stat.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stat.month} 2026</span>
                        <span className="text-muted-foreground">
                          {formatAmount(stat.collections)} / {formatAmount(stat.credits)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-chart-2 rounded-full transition-all"
                          style={{ 
                            width: `${(stat.collections / stat.credits) * 100}%` 
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {((stat.collections / stat.credits) * 100).toFixed(1)}% collection rate
                      </p>
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-6">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Detailed Analytics
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
