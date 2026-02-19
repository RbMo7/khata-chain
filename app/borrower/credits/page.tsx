'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { borrowerApi } from '@/lib/api-client'

export default function BorrowerCredits() {
  // Fetch active credits from API
  const { data: creditsData, loading, error } = useApi(
    () => borrowerApi.getCredits('active'),
    []
  )

  const activeCredits = creditsData?.data?.credits || []

  const formatAmount = (amount: number) => {
    return formatNPR(amount)
  }

  const formatDate = (dateString: string) => {
    return formatDateNP(dateString)
  }

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (status: string) => {
    return status === 'overdue' ? 'destructive' : 'default'
  }

  const totalOutstanding = activeCredits.reduce((sum: number, credit: any) => sum + credit.credit_amount, 0)

  if (loading) {
    return (
      <DashboardLayout userType="borrower">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout userType="borrower">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load credits. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Credits</h1>
            <p className="text-muted-foreground mt-1">
              Active credits that need repayment
            </p>
          </div>
          <Link href="/borrower/history">
            <Button variant="outline">
              View History
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatAmount(totalOutstanding)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Across {activeCredits.length} credit{activeCredits.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {activeCredits.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <p className="text-lg font-medium">No active credits</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    You don't have any active credits at the moment
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            activeCredits.map((credit: any) => {
              const daysUntilDue = getDaysUntilDue(credit.due_date)
              const isOverdue = daysUntilDue < 0

              return (
                <Card key={credit.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{credit.store_owner?.store_name || 'Store'}</CardTitle>
                        <CardDescription className="mt-1">
                          {credit.description || 'No description'}
                        </CardDescription>
                      </div>
                      <Badge variant={getStatusColor(credit.status)}>
                        {credit.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                      <div className="space-y-2">
                        <div>
                          <div className="text-2xl font-bold">
                            {formatAmount(credit.credit_amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Due {formatDate(credit.due_date)}
                            {isOverdue && (
                              <span className="text-destructive ml-1">
                                (Overdue by {Math.abs(daysUntilDue)} days)
                              </span>
                            )}
                            {!isOverdue && (
                              <span className="ml-1">
                                (in {daysUntilDue} days)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link href={`/borrower/repay?credit_entry_id=${credit.id}`}>
                        <Button>
                          Repay Now
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
