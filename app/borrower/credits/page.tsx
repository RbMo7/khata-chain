'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function BorrowerCredits() {
  // Mock data
  const activeCredits = [
    {
      id: '1',
      storeName: 'Sharma Kirana Store',
      amount: 15000,
      dueDate: '2026-03-15',
      status: 'active' as const,
      description: 'Grocery supplies and household items'
    },
    {
      id: '2',
      storeName: 'Patel General Store',
      amount: 20000,
      dueDate: '2026-03-20',
      status: 'active' as const,
      description: 'Monthly supplies'
    },
    {
      id: '3',
      storeName: 'Khan Electronics',
      amount: 10000,
      dueDate: '2026-03-10',
      status: 'overdue' as const,
      description: 'Electronics purchase'
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

  const totalOutstanding = activeCredits.reduce((sum, credit) => sum + credit.amount, 0)

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
          {activeCredits.map((credit) => {
            const daysUntilDue = getDaysUntilDue(credit.dueDate)
            const isOverdue = daysUntilDue < 0

            return (
              <Card key={credit.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{credit.storeName}</CardTitle>
                      <CardDescription className="mt-1">
                        {credit.description}
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
                          {formatAmount(credit.amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due {formatDate(credit.dueDate)}
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
          })}
        </div>
      </div>
    </DashboardLayout>
  )
}
