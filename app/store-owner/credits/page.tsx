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
import { Search, ArrowUpRight, Download, Filter, Plus, AlertCircle, Loader2, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { storeOwnerApi } from '@/lib/api-client'


export default function StoreOwnerCredits() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch credits from API based on status filter
  const { data: creditsData, loading, error } = useApi(
    () => storeOwnerApi.getCredits({ 
      status: statusFilter === 'all' ? undefined : statusFilter 
    }),
    [statusFilter]
  )

  const { data: extensionsData } = useApi(
    () => storeOwnerApi.getExtensions(),
    []
  )
  const pendingExtensions: any[] = (extensionsData as any)?.data?.extensions || []

  const credits = creditsData?.data?.credits || []

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

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredCredits = credits.filter((credit: any) => {
    const matchesSearch = credit.borrower?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         credit.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         false
    return matchesSearch
  })

  const stats = {
    total: credits.length,
    active: credits.filter((c: any) => c.status === 'active').length,
    completed: credits.filter((c: any) => c.status === 'completed').length,
    overdue: credits.filter((c: any) => c.status === 'overdue').length,
  }

  if (loading) {
    return (
      <DashboardLayout userType="store-owner">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout userType="store-owner">
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
    <DashboardLayout userType="store-owner">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Credit Entries</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your issued credits
            </p>
          </div>
          <Link href="/store-owner/create-credit">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Credit Entry
            </Button>
          </Link>
        </div>

        {/* Pending Extension Requests banner */}
        {pendingExtensions.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50/80 dark:bg-amber-950/20 dark:border-amber-800 p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  {pendingExtensions.length} Pending Extension Request{pendingExtensions.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 space-y-1.5">
                  {pendingExtensions.map((ext: any) => (
                    <div key={ext.id} className="flex items-center justify-between text-sm">
                      <span className="text-amber-700 dark:text-amber-400">
                        {ext.borrower?.full_name || 'Borrower'} — {ext.requested_days} day{ext.requested_days !== 1 ? 's' : ''} requested
                      </span>
                      <Link href={`/store-owner/credits/${ext.credit_entry_id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-100">
                          Review
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
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

        {/* Credits Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>All Credit Entries</CardTitle>
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
                  placeholder="Search by borrower or description..."
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
                    <TableHead>Borrower</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Issued</TableHead>
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
                          {searchQuery ? 'Try adjusting your search' : 'Start by creating your first credit entry'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCredits.map((credit: any) => {
                      const daysUntilDue = getDaysUntilDue(credit.due_date)
                      const isOverdue = daysUntilDue < 0

                      return (
                        <TableRow key={credit.id}>
                          <TableCell className="font-medium">
                            {credit.borrower?.full_name || credit.borrower_pubkey}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatAmount(credit.credit_amount)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {credit.description || 'No description'}
                          </TableCell>
                          <TableCell>
                            {formatDate(credit.created_at)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{formatDate(credit.due_date)}</div>
                              {credit.status === 'active' && (
                                <div className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(credit.status)} className={getStatusClassName(credit.status)}>
                              {credit.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/store-owner/credits/${credit.id}`}>
                              <Button size="sm" variant="ghost">
                                View
                                <ArrowUpRight className="ml-1 h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
