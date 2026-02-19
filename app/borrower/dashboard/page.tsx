'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CreditCard, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  Wallet,
  ShieldCheck
} from 'lucide-react'
import Link from 'next/link'

export default function BorrowerDashboard() {
  // Mock data - replace with real API calls
  const stats = {
    totalCredit: 45000, // in paise
    activeCredits: 3,
    creditsPaid: 12,
    reputationScore: 850,
    citizenshipVerified: true
  }

  const activeCredits = [
    {
      id: '1',
      storeName: 'Sharma Kirana Store',
      amount: 15000,
      dueDate: '2026-03-15',
      currency: 'INR',
      status: 'active' as const
    },
    {
      id: '2',
      storeName: 'Patel General Store',
      amount: 20000,
      dueDate: '2026-03-20',
      currency: 'INR',
      status: 'active' as const
    },
    {
      id: '3',
      storeName: 'Khan Electronics',
      amount: 10000,
      dueDate: '2026-03-10',
      currency: 'INR',
      status: 'overdue' as const
    }
  ]

  const recentTransactions = [
    {
      id: '1',
      type: 'repayment' as const,
      storeName: 'Singh Hardware',
      amount: 5000,
      date: '2026-02-18',
      method: 'stripe' as const
    },
    {
      id: '2',
      type: 'credit' as const,
      storeName: 'Kumar Textiles',
      amount: 12000,
      date: '2026-02-15',
      method: 'on_chain' as const
    },
    {
      id: '3',
      type: 'repayment' as const,
      storeName: 'Verma Groceries',
      amount: 8000,
      date: '2026-02-10',
      method: 'on_chain' as const
    }
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
    <DashboardLayout userType="borrower">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
            <p className="text-muted-foreground mt-1">
              Here's your credit overview and activity
            </p>
          </div>
          {!stats.citizenshipVerified && (
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
              <div className="text-2xl font-bold">{formatAmount(stats.totalCredit)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {stats.activeCredits} entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Reputation Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reputationScore}</div>
              <Progress value={(stats.reputationScore / 1000) * 100} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Excellent standing
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
              <div className="text-2xl font-bold">{stats.activeCredits}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Credits Paid
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.creditsPaid}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Credits</TabsTrigger>
            <TabsTrigger value="history">Recent Activity</TabsTrigger>
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
                  {activeCredits.map((credit) => {
                    const daysUntilDue = getDaysUntilDue(credit.dueDate)
                    const isOverdue = daysUntilDue < 0

                    return (
                      <div
                        key={credit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{credit.storeName}</h3>
                            <Badge variant={getStatusColor(credit.status)}>
                              {credit.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(credit.dueDate)}
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
                              {formatAmount(credit.amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {credit.currency}
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

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your latest transactions and credit entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.type === 'repayment' 
                            ? 'bg-chart-2/10' 
                            : 'bg-chart-1/10'
                        }`}>
                          {transaction.type === 'repayment' ? (
                            <CheckCircle className="h-4 w-4 text-chart-2" />
                          ) : (
                            <Wallet className="h-4 w-4 text-chart-1" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transaction.type === 'repayment' ? 'Repaid to' : 'Credit from'}{' '}
                            {transaction.storeName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.date)} • {transaction.method === 'stripe' ? 'Stripe' : 'On-chain'}
                          </p>
                        </div>
                      </div>
                      <div className={`font-semibold ${
                        transaction.type === 'repayment' 
                          ? 'text-chart-2' 
                          : 'text-chart-1'
                      }`}>
                        {transaction.type === 'repayment' ? '-' : '+'}
                        {formatAmount(transaction.amount)}
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/borrower/history">
                  <Button variant="outline" className="w-full mt-4">
                    View All History
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Citizenship Verification Banner */}
        {!stats.citizenshipVerified && (
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
