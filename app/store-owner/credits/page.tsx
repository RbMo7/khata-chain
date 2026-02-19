'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Search, ArrowUpRight, Download, Filter, Plus } from 'lucide-react'
import Link from 'next/link'

export default function StoreOwnerCredits() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data
  const credits = [
    {
      id: '1',
      borrowerName: 'Rajesh Kumar',
      amount: 35000,
      issueDate: '2026-02-01',
      dueDate: '2026-03-15',
      status: 'active' as const,
      description: 'Grocery supplies'
    },
    {
      id: '2',
      borrowerName: 'Priya Sharma',
      amount: 20000,
      issueDate: '2026-02-10',
      dueDate: '2026-03-20',
      status: 'active' as const,
      description: 'Household items'
    },
    {
      id: '3',
      borrowerName: 'Amit Patel',
      amount: 15000,
      issueDate: '2026-01-25',
      dueDate: '2026-03-10',
      status: 'overdue' as const,
      description: 'Electronics'
    },
    {
      id: '4',
      borrowerName: 'Sunita Verma',
      amount: 12000,
      issueDate: '2026-01-20',
      dueDate: '2026-02-20',
      status: 'completed' as const,
      description: 'General store items'
    },
    {
      id: '5',
      borrowerName: 'Vikram Shah',
      amount: 25000,
      issueDate: '2026-02-15',
      dueDate: '2026-03-25',
      status: 'active' as const,
      description: 'Building materials'
    },
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
      case 'active': return 'default'
      case 'completed': return 'secondary'
      case 'overdue': return 'destructive'
      default: return 'outline'
    }
  }

  const getDaysUntilDue = (dueDateString: string) => {
    const dueDate = new Date(dueDateString)
    const today = new Date()
    const diffTime = dueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const filteredCredits = credits.filter(credit => {
    const matchesSearch = credit.borrowerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         credit.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || credit.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: credits.length,
    active: credits.filter(c => c.status === 'active').length,
    completed: credits.filter(c => c.status === 'completed').length,
    overdue: credits.filter(c => c.status === 'overdue').length,
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
                  {filteredCredits.map((credit) => {
                    const daysUntilDue = getDaysUntilDue(credit.dueDate)
                    const isOverdue = daysUntilDue < 0

                    return (
                      <TableRow key={credit.id}>
                        <TableCell className="font-medium">
                          {credit.borrowerName}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatAmount(credit.amount)}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {credit.description}
                        </TableCell>
                        <TableCell>
                          {formatDate(credit.issueDate)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(credit.dueDate)}</div>
                            {credit.status === 'active' && (
                              <div className={`text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(credit.status)}>
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
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
