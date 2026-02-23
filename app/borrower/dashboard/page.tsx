'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { PendingCreditsActions } from '@/components/PendingCreditsActions'
import { ExtensionRequestDialog } from '@/components/ExtensionRequestDialog'
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
  Loader2,
  Award,
  Calendar,
  Share2,
  Coins,
} from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { borrowerApi, reputationApi } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { LoyaltyBadge } from '@/components/LoyaltyBadge'

function ExtensionStatusBadge({ status }: { status: 'pending' | 'accepted' | 'declined' }) {
  if (status === 'pending') {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 text-xs">
        Extension Pending
      </Badge>
    )
  }
  if (status === 'accepted') {
    return (
      <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 text-xs">
        Extension Accepted
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground text-xs">
      Extension Declined
    </Badge>
  )
}

export default function BorrowerDashboard() {
  const { user } = useAuth()
  
  // Extension request dialog state
  const [extensionCreditId, setExtensionCreditId] = useState<string | null>(null)
  
  // Fetch real data from API
  const { data: stats, loading: statsLoading, error: statsError } = useApi(
    () => borrowerApi.getStats(),
    []
  )

  const { data: creditsData, loading: creditsLoading, error: creditsError } = useApi(
    () => borrowerApi.getCredits(),
    []
  )

  const { data: reputationData } = useApi(
    () => reputationApi.getMy(),
    []
  )

  const { data: extensionsData, refetch: refetchExtensions } = useApi(
    () => borrowerApi.getExtensions(),
    []
  )

  const activeCredits = creditsData?.data?.credits || []
  const reputationScore = reputationData?.data?.reputation?.reputation_score ?? null
  const reputationTier = reputationData?.data?.reputation?.tier ?? null
  // Extension requests keyed by credit_entry_id
  const extensionsByCredit: Record<string, any> = extensionsData?.data?.extensions || {}

  const getRepScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground'
    if (score >= 700) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 550) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

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
        return 'outline'
      default:
        return 'default'
    }
  }

  const getStatusClassName = (status: string) => {
    return status === 'completed'
      ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
      : ''
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

          <Card className="border-amber-200 bg-amber-50/10 dark:bg-amber-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Loyalty Rewards
              </CardTitle>
              <Coins className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {Number(stats?.data?.totalRewardsEarned || 0).toFixed(4)} SOL
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Earned for on-time payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Reputation and Share Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Reputation Score Card */}
          <Link href="/borrower/profile?tab=reputation" className="md:col-span-1">
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Reputation Score
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {reputationScore && (
                    <LoyaltyBadge 
                      tier={reputationScore >= 850 ? 'Platinum' : reputationScore >= 700 ? 'Gold' : reputationScore >= 550 ? 'Silver' : 'Bronze'} 
                      showLabel={false} 
                      size="sm" 
                    />
                  )}
                  <div className={`text-2xl font-bold ${getRepScoreColor(reputationScore)}`}>
                    {reputationScore ?? '—'}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {reputationTier ?? 'Loading...'} · View details →
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Share reputation CTA */}
          {user?.walletAddress && (
            <Card className="border-dashed md:col-span-2">
              <CardContent className="py-0 h-full flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Share your reputation</p>
                    <p className="text-xs text-muted-foreground">Let lenders and merchants verify your credit score publicly</p>
                  </div>
                </div>
                <Link href={`/verify?wallet=${user.walletAddress}`} target="_blank">
                  <Button variant="outline" size="sm" className="gap-2 shrink-0">
                    <Share2 className="h-3.5 w-3.5" />
                    Open verifier
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
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
                    const extension = extensionsByCredit[credit.id]
                    const canRequestExtension =
                      (isOverdue || credit.status === 'active') && !extension

                    return (
                      <div
                        key={credit.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 mb-3 sm:mb-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold">{credit.store_owner?.store_name || 'Store'}</h3>
                            <Badge variant={getStatusColor(credit.status)} className={getStatusClassName(credit.status)}>
                              {credit.status}
                            </Badge>
                            {extension && (
                              <ExtensionStatusBadge status={extension.status} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Due {formatDate(credit.due_date)}
                            {credit.status !== 'completed' && (isOverdue ? (
                              <span className="text-destructive ml-1">
                                (Overdue by {Math.abs(daysUntilDue)} days)
                              </span>
                            ) : (
                              <span className="ml-1">
                                (in {daysUntilDue} days)
                              </span>
                            ))}
                          </p>
                          {extension?.status === 'pending' && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              Extension of {extension.requested_days} day{extension.requested_days === 1 ? '' : 's'} pending lender response
                            </p>
                          )}
                          {extension?.status === 'accepted' && (
                            <p className="text-xs text-emerald-600 mt-0.5">
                              Extension of {extension.adjusted_days ?? extension.requested_days} day{(extension.adjusted_days ?? extension.requested_days) === 1 ? '' : 's'} accepted by lender
                            </p>
                          )}
                          {extension?.status === 'declined' && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Extension request was declined by lender
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {formatAmount(credit.credit_amount)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {credit.currency || 'NPR'}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Link href={`/borrower/repay?credit_entry_id=${credit.id}`}>
                              <Button size="sm">
                                Repay Now
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                            {canRequestExtension && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1"
                                onClick={() => setExtensionCreditId(credit.id)}
                              >
                                <Calendar className="h-3 w-3" />
                                Request Extension
                              </Button>
                            )}
                          </div>
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

        {/* NID Verification — required to receive credits */}
        {!user?.citizenshipVerified && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-start gap-4">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <CardTitle className="text-lg text-destructive">NID Verification Required</CardTitle>
                  <CardDescription className="mt-1">
                    You cannot receive or accept credits until you verify your National Identity Document (NID).
                    Verification is a one-time step and takes under a minute.
                  </CardDescription>
                  <Link href="/borrower/verify">
                    <Button className="mt-4" variant="destructive">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Verify NID Now
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Extension Request Dialog */}
      {extensionCreditId && (
        <ExtensionRequestDialog
          creditId={extensionCreditId}
          open={!!extensionCreditId}
          onOpenChange={(open) => { if (!open) setExtensionCreditId(null) }}
          onSuccess={refetchExtensions}
        />
      )}
    </DashboardLayout>
  )
}
