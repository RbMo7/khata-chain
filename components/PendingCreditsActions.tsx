'use client'

import { useState, useEffect } from 'react'
import { creditApi } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { useOnChainAnchor } from '@/hooks/use-on-chain-anchor'
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
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'

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

export function PendingCreditsActions() {
  const [credits, setCredits] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [selectedCredit, setSelectedCredit] = useState<CreditRequest | null>(null)
  const { user } = useAuth()
  const { anchorCredit } = useOnChainAnchor()

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

      // Anchor on-chain after DB is updated (non-blocking — won't fail the approval)
      const credit = credits.find(c => c.id === id)
      if (credit && user?.walletAddress) {
        anchorCredit(
          credit.id,
          credit.credit_amount,
          credit.due_date,
          user.walletAddress,          // borrower is the current user
          credit.store_owner_pubkey,
          credit.currency || 'NPR'
        ).then(result => {
          if (result) console.log('[On-chain] Credit anchored:', result.explorerUrl)
        })
      }

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
      await creditApi.reject(id)
      setCredits(credits.filter(c => c.id !== id))
      setSelectedCredit(null)
      setActionType(null)
    } catch (err: any) {
      console.error('Failed to reject credit:', err)
      setError('Failed to reject credit request')
    } finally {
      setProcessingId(null)
    }
  }

  // Don't show if no pending credits
  if (loading) {
    return null
  }

  if (credits.length === 0) {
    return null
  }

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate)
    const today = new Date()
    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  return (
    <>
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                Pending Credit Requests
              </CardTitle>
              <CardDescription>
                {credits.length} credit{credits.length !== 1 ? 's' : ''} awaiting your approval or rejection
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {credits.length} Action{credits.length !== 1 ? 's' : ''} Required
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {credits.map((credit) => {
              const daysUntilDue = getDaysUntilDue(credit.due_date)
              const isUrgent = daysUntilDue <= 7

              return (
                <div
                  key={credit.id}
                  className="border rounded-lg p-3 bg-white space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-semibold text-lg">
                          {formatNPR(credit.credit_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          From: {credit.store_owner_pubkey.slice(0, 6)}...{credit.store_owner_pubkey.slice(-6)}
                        </p>
                      </div>
                    </div>
                    {isUrgent && (
                      <Badge variant="destructive" className="text-xs">
                        Due Soon
                      </Badge>
                    )}
                  </div>

                  {credit.description && (
                    <p className="text-sm text-muted-foreground">{credit.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Due: {formatDateNP(credit.due_date)}
                      {daysUntilDue > 0 && ` (${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''})`}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 px-3"
                        onClick={() => {
                          setSelectedCredit(credit)
                          setActionType('approve')
                        }}
                        disabled={processingId === credit.id}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3"
                        onClick={() => {
                          setSelectedCredit(credit)
                          setActionType('reject')
                        }}
                        disabled={processingId === credit.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <AlertDialog open={actionType === 'approve' && selectedCredit !== null}>
        <AlertDialogContent>
          <AlertDialogTitle>Accept Credit Request?</AlertDialogTitle>
          <AlertDialogDescription>
            You are about to accept {formatNPR(selectedCredit?.credit_amount || 0)}. An NFT will be created on the Solana blockchain.
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

      {/* Rejection Dialog */}
      <AlertDialog open={actionType === 'reject' && selectedCredit !== null}>
        <AlertDialogContent>
          <AlertDialogTitle>Decline Credit Request?</AlertDialogTitle>
          <AlertDialogDescription>
            You are declining {formatNPR(selectedCredit?.credit_amount || 0)}. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel
              onClick={() => {
                setSelectedCredit(null)
                setActionType(null)
              }}
            >
              Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCredit && handleReject(selectedCredit.id)}
              disabled={processingId !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processingId ? 'Processing...' : 'Decline'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
