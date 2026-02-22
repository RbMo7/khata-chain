'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, ArrowUpRight, Download, Filter, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import { borrowerApi } from '@/lib/api-client'

export default function BorrowerHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch all credits from API (no status filter to get complete history)
  const { data: creditsData, loading, error } = useApi(
    () => borrowerApi.getCredits(),
    []
  )

  const allCredits = creditsData?.data?.credits || []

  const formatAmount = (amount: number) => {
    return formatNPR(amount)
  }

  const formatDate = (dateString: string) => {
    return formatDateNP(dateString)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'completed': return 'outline'
      case 'overdue': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusClassName = (status: string) => {
    return status === 'completed'
      ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
      : ''
  }

  const getTypeColor = (type: string) => {
    return 'text-chart-1' // All are credits for now
  }

  const filteredCredits = allCredits.filter((credit: any) => {
    const matchesSearch = credit.store_owner?.store_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         credit.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         false
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalCredits: allCredits.length,
    active: allCredits.filter((c: any) => c.status === 'active').length,
    completed: allCredits.filter((c: any) => c.status === 'completed').length,
    overdue: allCredits.filter((c: any) => c.status === 'overdue').length,
  }

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
            Failed to load transaction history. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit History</h1>
          <p className="text-muted-foreground mt-1">
            View all your credits and their status
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCredits}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive">
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>All Credits</CardTitle>
                <CardDescription>
                  {filteredCredits.length} credit{filteredCredits.length !== 1 ? 's' : ''} found
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by store name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Issued</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCredits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <p className="text-lg font-medium">No credits found</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No credit history available'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCredits.map((credit: any) => (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">
                          {formatDate(credit.created_at)}
                        </TableCell>
                        <TableCell>
                          {credit.store_owner?.store_name || 'Store'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {credit.description || 'No description'}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatAmount(credit.credit_amount)}
                        </TableCell>
                        <TableCell>
                          {formatDate(credit.due_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(credit.status)} className={getStatusClassName(credit.status)}>
                            {credit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {credit.status === 'active' || credit.status === 'overdue' ? (
                            <Link href={`/borrower/repay?credit_entry_id=${credit.id}`}>
                              <Button size="sm" variant="ghost">
                                Repay
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          ) : credit.repayment_tx_signature ? (
                            <a
                              href={`https://explorer.solana.com/tx/${credit.repayment_tx_signature}?cluster=testnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50">
                                On-chain
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
