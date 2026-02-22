'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, CheckCircle2, AlertCircle, ArrowLeft, Calendar, Store, Info,
  ExternalLink, Wallet, Lock, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { formatNPR, formatDateNP } from '@/lib/currency-utils';
import { useApi } from '@/hooks/use-api';
import { creditApi, post } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useOnChainAnchor } from '@/hooks/use-on-chain-anchor';
import { fetchSolPrice, PROTOCOL_FEE_SOL } from '@/lib/solana/credit-chain';

type SolPriceData = { solUSD: number; nprPerUsd: number; solPriceNPR: number; fallback?: boolean }

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

  const [paying, setPaying] = useState(false);
  const [txExplorerUrl, setTxExplorerUrl] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [priceData, setPriceData] = useState<SolPriceData | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceFailed, setPriceFailed] = useState(false);

  const { user } = useAuth();
  const { payWithSol } = useOnChainAnchor();

  const loadPrice = () => {
    setPriceLoading(true);
    setPriceFailed(false);
    fetchSolPrice().then((data) => {
      setPriceData(data);
      setPriceFailed(!data);
      setPriceLoading(false);
    });
  };

  // Fetch live price on mount
  useEffect(() => { loadPrice(); }, []);

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
    credit.repayment_status === 'completed' ||
    confirmed;
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
              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-700 underline font-medium"
                >
                  View repayment proof on Solana Explorer
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

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

  // ── SOL payment handler ─────────────────────────────────────────────────────
  async function handlePayWithSol() {
    setPaying(true);
    setPayError(null);

    try {
      // If we already fetched the price, pass the pre-calculated SOL amount
      // so the hook doesn't need to fetch it again during the transaction.
      // credit_amount is in paisa — divide by 100 for NPR, then convert to SOL.
      const amountNPR = credit.credit_amount / 100;
      const overrideAmountSol = priceData
        ? parseFloat((amountNPR / priceData.solPriceNPR).toFixed(6))
        : undefined;

      const result = await payWithSol(
        credit.id,
        credit.credit_amount,
        credit.store_owner_pubkey,
        overrideAmountSol,
      );

      if (!result) {
        throw new Error('Payment failed or wallet is not connected. Please connect Phantom / Solflare and try again.');
      }

      setTxExplorerUrl(result.explorerUrl);

      // Mark credit as paid in DB with the SOL tx signature
      await post(`/api/credits/${credit.id}/confirm-repayment`, {
        txSignature: result.txSignature,
      });

      setConfirmed(true);
    } catch (err: any) {
      setPayError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
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
          <p className="text-muted-foreground mt-1">Confirm repayment to {storeName}</p>
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
            <CardDescription>Review before confirming</CardDescription>
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

        {/* SOL Payment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Pay with Solana
            </CardTitle>
            <CardDescription>
              SOL is sent directly from your wallet to the store owner's wallet.
              Phantom / Solflare will ask you to approve the transaction.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Amount breakdown: NPR → USD → SOL + fee */}
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-muted-foreground">Amount (NPR)</span>
                <span className="font-bold text-lg">{formatNPR(credit.credit_amount)}</span>
              </div>

              {priceLoading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-3 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-sm">Fetching live exchange rate…</span>
                </div>
              ) : priceData ? (
                <>
                  <div className="flex justify-between items-center px-4 py-2 bg-muted/30">
                    <span className="text-muted-foreground text-xs">NPR → USD</span>
                    <span className="font-mono text-xs">
                      ₹{(credit.credit_amount / 100).toLocaleString()} ÷ {priceData.nprPerUsd.toFixed(2)} = ${(credit.credit_amount / 100 / priceData.nprPerUsd).toFixed(4)} USD
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 bg-muted/30">
                    <span className="text-muted-foreground text-xs">USD → SOL</span>
                    <span className="font-mono text-xs">
                      1 SOL = ${priceData.solUSD.toFixed(2)} USD
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-muted-foreground text-sm">To store owner</span>
                    <span className="font-mono text-sm">
                      ◊ {(credit.credit_amount / 100 / priceData.solPriceNPR).toFixed(6)} SOL
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-muted-foreground text-sm">To store owner (fallback rate)</span>
                  <span className="font-mono text-sm">
                    ◊ {(credit.credit_amount / 100 / (88 * 135.5)).toFixed(6)} SOL
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center px-4 py-2 text-xs text-muted-foreground">
                <span>Platform fee</span>
                <span className="font-mono">◊ {PROTOCOL_FEE_SOL} SOL</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 text-xs text-emerald-600">
                <span>Network gas</span>
                <span className="font-medium">FREE — paid by KhataChain</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-muted/30">
                <span className="font-semibold">Total you pay</span>
                <span className="font-bold text-lg font-mono">
                  ◊ {priceData
                    ? (credit.credit_amount / 100 / priceData.solPriceNPR + PROTOCOL_FEE_SOL).toFixed(6)
                    : (credit.credit_amount / 100 / (88 * 135.5) + PROTOCOL_FEE_SOL).toFixed(6)
                  } SOL
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 text-xs text-muted-foreground">
                <span>Recipient</span>
                <span className="font-mono truncate max-w-[180px]">{credit.store_owner_pubkey}</span>
              </div>
            </div>

            {priceFailed && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  Could not fetch live rate. Using fallback (1 SOL ≈ $88 · 135.5 NPR/USD = ~₹11,924/SOL).
                  <button onClick={loadPrice} className="underline inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />Retry
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {priceData?.fallback && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center gap-2">
                  Using estimated rate — live price unavailable.
                  <button onClick={loadPrice} className="underline inline-flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />Refresh
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {payError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{payError}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handlePayWithSol}
              disabled={paying || priceLoading}
            >
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approve in your wallet…
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Pay{priceData
                    ? ` ◊ ${(credit.credit_amount / 100 / priceData.solPriceNPR + PROTOCOL_FEE_SOL).toFixed(6)} SOL`
                    : ' with SOL'}
                </>
              )}
            </Button>

          </CardContent>
        </Card>

        {/* Security notice */}
        <div className="flex items-start gap-3 text-sm text-muted-foreground px-1">
          <Lock className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
          <p>SOL transfers directly from your wallet to the store owner’s wallet on-chain. The transaction is immutable and publicly verifiable on Solana Explorer.</p>
        </div>

      </div>
    </DashboardLayout>
  );
}
