'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extensionApi } from '@/lib/api-client'

interface Props {
  creditId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Refresh parent data after a successful request */
  onSuccess: () => void
}

export function ExtensionRequestDialog({
  creditId,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { toast } = useToast()
  const [days, setDays] = useState<string>('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedDays = parseInt(days, 10)
  const isValid = !isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 365

  async function handleSubmit() {
    if (!isValid) return
    setSubmitting(true)
    setError(null)
    try {
      await extensionApi.request(creditId, parsedDays, message.trim() || undefined)
      toast({
        title: 'Extension requested',
        description: `Your request for ${parsedDays} extra day${parsedDays === 1 ? '' : 's'} has been sent to the lender.`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      const msg = err?.details?.error || err?.error || err?.message || 'Failed to send request'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    setDays('')
    setMessage('')
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Request Due-Date Extension
          </DialogTitle>
          <DialogDescription>
            Ask the lender to move your repayment deadline. Only one extension
            request is allowed per credit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="days">
              Number of extra days <span className="text-destructive">*</span>
            </Label>
            <Input
              id="days"
              type="number"
              min={1}
              max={365}
              placeholder="e.g. 14"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={submitting}
            />
            {days && !isValid && (
              <p className="text-xs text-destructive">Must be between 1 and 365 days</p>
            )}
            {isValid && (
              <p className="text-xs text-muted-foreground">
                Requesting {parsedDays} extra day{parsedDays === 1 ? '' : 's'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to lender (optional)</Label>
            <Textarea
              id="message"
              placeholder="Briefly explain why you need more time…"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
