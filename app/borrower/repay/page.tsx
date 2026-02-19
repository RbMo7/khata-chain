'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StripeCheckoutForm } from '@/components/StripeCheckoutForm';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, ArrowLeft, Calendar, Store, Info } from 'lucide-react';
import Link from 'next/link';
import { formatNPR, formatDateNP } from '@/lib/currency-utils';
import { useApi } from '@/hooks/use-api';
import { creditApi } from '@/lib/api-client';

function getDaysInfo(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-destructive' };
  if (diffDays === 0) return { text: 'Due today', color: 'text-amber-600' };
  if (diffDays <= 7) return { text: `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`, color: 'text-amber-600' };
  return { text: `Due in ${diffDays} days`, color: 'text-muted-foreground' };
}

export default function BorrowerRepayPage() {
  const searchParams = useSearchParams();
  const creditEntryId = searchParams.get('credit_entry_id');

  const [showCheckout, setShowCheckout] = useState(false);

  const { data: res, loading, error } = useApi(
    () => creditApi.getById(creditEntryId!),
    [creditEntryId]
  );

  if (!creditEntryId) {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No credit entry ID provided.</AlertDescription>
          </Alert>
          <Link href="/borrower/credits">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Credits</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout userType="borrower">
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !res?.data) {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Credit entry not found or you do not have access to it.'}</AlertDescription>
          </Alert>
          <Link href="/borrower/credits">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Back to Credits</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const credit = res.data;
  const isPaid =
    credit.status === 'completed' ||
    credit.repayment_status === 'completed';
  const isCancelled = credit.status === 'cancelled' || credit.status === 'rejected';
  const storeName = credit.store_owners?.store_name ?? credit.store_owner_pubkey;
  const daysInfo = credit.due_date ? getDaysInfo(credit.due_date) : null;

  // ── Already Paid ──────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/borrower/credits">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />Back to Credits
              </Button>
            </Link>
          </div>

          <Card className="border-emerald-200">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-700">Credit Paid</h2>
                <p className="text-muted-foreground mt-1">
                  This credit has already been fully settled.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-left space-y-2 max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Store</span>
                  <span className="font-medium">{storeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-bold">{formatNPR(credit.credit_amount)}</span>
                </div>
                {credit.due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{formatDateNP(credit.due_date)}</span>
                  </div>
                )}
              </div>
              <Link href="/borrower/credits">
                <Button variant="outline" className="mt-2">View All Credits</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── Cancelled / Rejected ──────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <Link href="/borrower/credits">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Credits
            </Button>
          </Link>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This credit was <strong>{credit.status}</strong> and cannot be repaid.
              {credit.rejection_reason && ` Reason: ${credit.rejection_reason}`}
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // ── Pending approval ──────────────────────────────────────────────────────
  if (credit.status === 'pending_approval') {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto space-y-4 pt-8">
          <Link href="/borrower/credits">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Credits
            </Button>
          </Link>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This credit is still <strong>pending your approval</strong>. Accept it first before making a repayment.
            </AlertDescription>
          </Alert>
          <Link href="/borrower/credits">
            <Button>Go to Pending Credits</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // ── Active / Overdue — show repayment UI ──────────────────────────────────
  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/borrower/credits">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />Back to Credits
            </Button>
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repay Credit</h1>
          <p className="text-muted-foreground mt-1">Complete your payment to {storeName}</p>
        </div>

        {/* Status alert for overdue */}
        {credit.status === 'overdue' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This credit is <strong>overdue</strong>. {daysInfo && daysInfo.text}. Please repay as soon as possible to avoid further reputation impact.
            </AlertDescription>
          </Alert>
        )}

        {/* Credit Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Credit Details</CardTitle>
            <CardDescription>Review before paying</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />Store
              </span>
              <span className="font-medium">{storeName}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground">Amount Due</span>
              <span className="font-bold text-xl">{formatNPR(credit.credit_amount)}</span>
            </div>

            {credit.description && (
              <div className="flex justify-between items-start py-1.5 border-b gap-4">
                <span className="text-muted-foreground shrink-0">Description</span>
                <span className="font-medium text-right">{credit.description}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5 border-b">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />Issued
              </span>
              <span>{formatDateNP(credit.created_at)}</span>
            </div>

            {credit.due_date && (
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Due Date
                </span>
                <div className="text-right">
                  <span>{formatDateNP(credit.due_date)}</span>
                  {daysInfo && (
                    <p className={`text-xs ${daysInfo.color}`}>{daysInfo.text}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center py-1.5">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={credit.status === 'overdue' ? 'destructive' : 'default'} className="capitalize">
                {credit.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment section */}
        {!showCheckout ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Pay via Stripe</CardTitle>
              <CardDescription>Credit/Debit card, UPI or Net Banking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 border p-4 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Total to pay</span>
                <span className="text-xl font-bold">{formatNPR(credit.credit_amount)}</span>
              </div>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setShowCheckout(true)}
              >
                <CreditCard className="h-4 w-4" />
                Proceed to Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>Enter your card details below</CardDescription>
            </CardHeader>
            <CardContent>
              <StripeCheckoutForm
                creditEntryId={credit.id}
                amount={credit.credit_amount}
                currency="INR"
              />
            </CardContent>
          </Card>
        )}

        {/* Security notice */}
        <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <p>Your payment is secured with industry-standard encryption. Card details are never stored on our servers.</p>
        </div>

      </div>
    </DashboardLayout>
  );
}
