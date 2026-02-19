'use client'

import { useState, useEffect } from 'react'
import { creditApi } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CheckCircle, XCircle, FileText, AlertCircle, Clock } from 'lucide-react'

interface CreditRequest {
  id: string
  store_owner_pubkey: string
  credit_amount: number
  currency: string
  description: string
  due_date: string
  created_at: string
  status: string
}

export function PendingCreditRequests() {
  const [credits, setCredits] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [selectedCredit, setSelectedCredit] = useState<CreditRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadPendingCredits()
  }, [])

  const loadPendingCredits = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await creditApi.getPending()
      setCredits(response.data?.credits || [])
    } catch (err: any) {
      console.error('Failed to load pending credits:', err)
      setError('Failed to load credit requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await creditApi.approve(id)
      // Remove from pending list
      setCredits(credits.filter(c => c.id !== id))
      setSelectedCredit(null)
      setActionType(null)
    } catch (err: any) {
      console.error('Failed to approve credit:', err)
      setError('Failed to approve credit request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (id: string) => {
    setProcessingId(id)
    try {
      await creditApi.reject(id, rejectReason)
      // Remove from pending list
      setCredits(credits.filter(c => c.id !== id))
      setSelectedCredit(null)
      setActionType(null)
      setRejectReason('')
    } catch (err: any) {
      console.error('Failed to reject credit:', err)
      setError('Failed to reject credit request')
    } finally {
      setProcessingId(null)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    const formatted = (amount / 100).toFixed(2)
    return `${currency} ${formatted}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Credit Requests</CardTitle>
          <CardDescription>Awaiting your acceptance or decline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <p className="text-muted-foreground">Loading credit requests...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (credits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Credit Requests</CardTitle>
          <CardDescription>Awaiting your acceptance or decline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No pending credit requests</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Credit Requests</CardTitle>
          <CardDescription>
            You have {credits.length} credit request{credits.length !== 1 ? 's' : ''} awaiting your decision
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {credits.map((credit) => {
              const daysUntilDue = getDaysUntilDue(credit.due_date)
              const isUrgent = daysUntilDue <= 7

              return (
                <div
                  key={credit.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-lg">
                          {formatAmount(credit.credit_amount, credit.currency)}
                        </p>
                        {isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Due Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        From: {credit.store_owner_pubkey.slice(0, 8)}...{credit.store_owner_pubkey.slice(-8)}
                      </p>
                    </div>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>

                  {/* Description */}
                  {credit.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Purpose:</span> {credit.description}
                      </p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Created</p>
                      <p className="font-medium">{formatDate(credit.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide">Due Date</p>
                      <p className="font-medium">{formatDate(credit.due_date)}</p>
                      {daysUntilDue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {daysUntilDue === 1 ? 'Tomorrow' : `in ${daysUntilDue} days`}
                        </p>
                      )}
                      {daysUntilDue <= 0 && (
                        <p className="text-xs text-destructive font-medium">
                          {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''} overdue
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1"
                      onClick={() => {
                        setSelectedCredit(credit)
                        setActionType('approve')
                      }}
                      disabled={processingId === credit.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept (Create NFT)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedCredit(credit)
                        setActionType('reject')
                      }}
                      disabled={processingId === credit.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approval Confirmation Dialog */}
      <AlertDialog open={actionType === 'approve' && selectedCredit !== null}>
        <AlertDialogContent>
          <AlertDialogTitle>Accept Credit Request?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to accept a credit request for{' '}
              <strong>{formatAmount(selectedCredit?.credit_amount || 0, selectedCredit?.currency || 'NPR')}</strong>
            </p>
            <p className="text-sm text-foreground">
              An NFT will be created on the Solana blockchain to represent this credit agreement. You can then begin
              making repayments according to the agreed schedule.
            </p>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => {
                setSelectedCredit(null)
                setActionType(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCredit && handleApprove(selectedCredit.id)}
              disabled={processingId !== null}
            >
              {processingId ? 'Processing...' : 'Accept & Create NFT'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rejection Reason Dialog */}
      <AlertDialog open={actionType === 'reject' && selectedCredit !== null}>
        <AlertDialogContent>
          <AlertDialogTitle>Decline Credit Request?</AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mb-4">
              You are declining a credit request for{' '}
              <strong>{formatAmount(selectedCredit?.credit_amount || 0, selectedCredit?.currency || 'NPR')}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for declining (optional):</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Let the lender know why you're declining..."
                className="w-full px-3 py-2 text-sm border rounded-md resize-none h-20"
              />
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => {
                setSelectedCredit(null)
                setActionType(null)
                setRejectReason('')
              }}
            >
              Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCredit && handleReject(selectedCredit.id)}
              disabled={processingId !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processingId ? 'Processing...' : 'Decline Request'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
