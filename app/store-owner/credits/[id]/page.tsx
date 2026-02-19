'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Loader2,
  AlertCircle,
  CreditCard,
  Hash,
  TrendingUp,
  Store,
} from 'lucide-react'
import Link from 'next/link'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { useApi } from '@/hooks/use-api'
import { creditApi } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active': return 'default'
    case 'completed': return 'secondary'
    case 'overdue': return 'destructive'
    case 'pending_approval': return 'outline'
    case 'cancelled':
    case 'rejected': return 'outline'
    default: return 'outline'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'active': return <Clock className="h-4 w-4 text-blue-500" />
    case 'completed': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case 'overdue': return <AlertTriangle className="h-4 w-4 text-destructive" />
    case 'pending_approval': return <Clock className="h-4 w-4 text-amber-500" />
    default: return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

function getDaysInfo(dueDate: string, status: string) {
  const due = new Date(dueDate)
  const today = new Date()
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (status === 'completed') return { text: 'Paid', color: 'text-emerald-600' }
  if (status === 'cancelled' || status === 'rejected') return { text: 'Closed', color: 'text-muted-foreground' }
  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-destructive' }
  if (diffDays === 0) return { text: 'Due today', color: 'text-amber-600' }
  if (diffDays <= 7) return { text: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, color: 'text-amber-600' }
  return { text: `Due in ${diffDays} days`, color: 'text-muted-foreground' }
}

export default function CreditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const creditId = params.id as string

  const [showMarkPaidDialog, setShowMarkPaidDialog] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  const {
    data: creditData,
    loading,
    error,
    refetch,
  } = useApi(() => creditApi.getById(creditId), [creditId])

  const credit = creditData?.data

  async function handleMarkPaid() {
    setMarkingPaid(true)
    try {
      const res = await creditApi.markPaidCash(creditId)
      if ((res as any)?.success) {
        toast({
          title: 'Credit marked as paid',
          description: "The borrower's reputation has been updated accordingly.",
        })
        setShowMarkPaidDialog(false)
        refetch()
      } else {
        throw new Error((res as any)?.error || 'Failed to mark as paid')
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to mark as paid',
        description: err?.message || 'An unexpected error occurred.',
      })
    } finally {
      setMarkingPaid(false)
    }
  }

  // ──────────────── Loading / Error states ────────────────

  if (loading) {
    return (
      <DashboardLayout userType="store-owner">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (error || !credit) {
    return (
      <DashboardLayout userType="store-owner">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Credits
          </Button>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credit not found</AlertTitle>
            <AlertDescription>
              This credit entry does not exist or you do not have permission to view it.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  const daysInfo = getDaysInfo(credit.due_date, credit.status)
  const canMarkPaid = ['active', 'overdue'].includes(credit.status)
  const borrower = credit.borrowers
  const storeOwner = credit.store_owners

  return (
    <DashboardLayout userType="store-owner">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back navigation */}
        <div className="flex items-center gap-3">
          <Link href="/store-owner/credits">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Credits
            </Button>
          </Link>
        </div>

        {/* Hero summary card */}
        <Card className={credit.status === 'overdue' ? 'border-destructive/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(credit.status)}
                  <Badge variant={getStatusBadgeVariant(credit.status)} className="capitalize text-sm">
                    {credit.status.replace('_', ' ')}
                  </Badge>
                  <span className={`text-sm font-medium ${daysInfo.color}`}>
                    {daysInfo.text}
                  </span>
                </div>
                <p className="text-3xl font-bold">{formatNPR(credit.credit_amount)}</p>
                <p className="text-muted-foreground text-sm">
                  Issued to{' '}
                  <span className="font-medium text-foreground">
                    {borrower?.full_name || credit.borrower_pubkey}
                  </span>
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:items-end">
                {canMarkPaid && (
                  <Button
                    onClick={() => setShowMarkPaidDialog(true)}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Banknote className="h-4 w-4" />
                    Mark as Paid (Cash)
                  </Button>
                )}
                {credit.status === 'completed' && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Paid</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue alert */}
        {credit.status === 'overdue' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Overdue Payment</AlertTitle>
            <AlertDescription>
              This credit is past its due date. Contact the borrower or mark it as paid if cash has been received.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Borrower information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Borrower
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Name</p>
                <p className="font-semibold text-base">
                  {borrower?.full_name || borrower?.display_name || '—'}
                </p>
              </div>
              {borrower?.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{borrower.email}</span>
                </div>
              )}
              {borrower?.phone_number && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{borrower.phone_number}</span>
                </div>
              )}
              {borrower?.citizenship_verified_at && (
                <div className="flex items-center gap-2 text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    Citizenship verified on{' '}
                    {formatDateNP(borrower.citizenship_verified_at)}
                  </span>
                </div>
              )}
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Wallet</p>
                <p className="font-mono text-xs break-all text-muted-foreground">
                  {credit.borrower_pubkey}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Credit details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Credit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {credit.description && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Description</p>
                  <p className="text-foreground">{credit.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Issued</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDateNP(credit.created_at)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Due Date</p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatDateNP(credit.due_date)}</span>
                  </div>
                </div>
                {credit.approved_at && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Approved</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{formatDateNP(credit.approved_at)}</span>
                    </div>
                  </div>
                )}
                {credit.updated_at && credit.status === 'completed' && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Paid On</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      <span>{formatDateNP(credit.updated_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Repayment & NFT info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-primary" />
              Repayment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Repayment Status</p>
                <Badge
                  variant={credit.repayment_status === 'completed' ? 'secondary' : 'outline'}
                  className="capitalize"
                >
                  {credit.repayment_status || 'pending'}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Payment Method</p>
                <p className="font-medium capitalize">
                  {credit.repayment_method?.replace('_', ' ') || 'On Chain'}
                </p>
              </div>
              {credit.stripe_repayment_amount > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Stripe Amount</p>
                  <p className="font-medium">{formatNPR(credit.stripe_repayment_amount)}</p>
                </div>
              )}
            </div>

            {credit.nft_mint_address && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    Credit Agreement NFT
                  </p>
                  <p className="font-mono text-xs text-muted-foreground break-all">
                    {credit.nft_mint_address}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Store info */}
        {storeOwner && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="h-4 w-4 text-primary" />
                Your Store
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <p className="font-semibold">{storeOwner.store_name}</p>
              {storeOwner.store_address && (
                <p className="text-muted-foreground">
                  {storeOwner.store_address}
                  {storeOwner.city ? `, ${storeOwner.city}` : ''}
                  {storeOwner.state ? `, ${storeOwner.state}` : ''}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rejection info */}
        {credit.status === 'rejected' && credit.rejection_reason && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Rejected</AlertTitle>
            <AlertDescription>{credit.rejection_reason}</AlertDescription>
          </Alert>
        )}

        {/* Credit ID */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono">
            Credit ID: {creditId}
          </p>
        </div>
      </div>

      {/* Mark as Paid (Cash) confirmation dialog */}
      <Dialog open={showMarkPaidDialog} onOpenChange={setShowMarkPaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-emerald-600" />
              Confirm Cash Payment
            </DialogTitle>
            <DialogDescription>
              You are about to mark this credit as fully paid via cash.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Borrower</span>
              <span className="font-medium">{borrower?.full_name || credit.borrower_pubkey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-bold text-base">{formatNPR(credit.credit_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Due Date</span>
              <span>{formatDateNP(credit.due_date)}</span>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50 text-amber-800">
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              The borrower's reputation score will be updated based on whether this payment is on time, early, or late.
            </AlertDescription>
          </Alert>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowMarkPaidDialog(false)}
              disabled={markingPaid}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkPaid}
              disabled={markingPaid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {markingPaid ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
