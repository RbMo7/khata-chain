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
import { Search, ArrowUpRight, Download, Filter } from 'lucide-react'
import Link from 'next/link'

export default function BorrowerHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Mock data
  const transactions = [
    {
      id: '1',
      type: 'credit' as const,
      storeName: 'Sharma Kirana Store',
      amount: 15000,
      date: '2026-02-01',
      dueDate: '2026-03-15',
      status: 'active' as const,
      method: 'on_chain' as const
    },
    {
      id: '2',
      type: 'repayment' as const,
      storeName: 'Singh Hardware',
      amount: 5000,
      date: '2026-02-18',
      dueDate: null,
      status: 'completed' as const,
      method: 'stripe' as const
    },
    {
      id: '3',
      type: 'credit' as const,
      storeName: 'Kumar Textiles',
      amount: 12000,
      date: '2026-02-15',
      dueDate: '2026-03-20',
      status: 'active' as const,
      method: 'on_chain' as const
    },
    {
      id: '4',
      type: 'repayment' as const,
      storeName: 'Verma Groceries',
      amount: 8000,
      date: '2026-02-10',
      dueDate: null,
      status: 'completed' as const,
      method: 'on_chain' as const
    },
    {
      id: '5',
      type: 'credit' as const,
      storeName: 'Patel General Store',
      amount: 20000,
      date: '2026-01-28',
      dueDate: '2026-02-28',
      status: 'overdue' as const,
      method: 'on_chain' as const
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

  const getTypeColor = (type: string) => {
    return type === 'credit' ? 'text-chart-1' : 'text-chart-2'
  }

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.storeName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalCredits: transactions.filter(t => t.type === 'credit').length,
    totalRepayments: transactions.filter(t => t.type === 'repayment').length,
    active: transactions.filter(t => t.status === 'active').length,
    completed: transactions.filter(t => t.status === 'completed').length,
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground mt-1">
            View all your credits and repayments
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
                Repayments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRepayments}</div>
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
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
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
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${getTypeColor(tx.type)}`}>
                          {tx.type === 'credit' ? 'Credit' : 'Repayment'}
                        </span>
                      </TableCell>
                      <TableCell>{tx.storeName}</TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(tx.amount)}
                      </TableCell>
                      <TableCell>
                        {tx.dueDate ? formatDate(tx.dueDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(tx.status)}>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {tx.method === 'stripe' ? 'Stripe' : 'On-chain'}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.type === 'credit' && tx.status === 'active' && (
                          <Link href={`/borrower/repay?credit_entry_id=${tx.id}`}>
                            <Button size="sm" variant="ghost">
                              Repay
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
