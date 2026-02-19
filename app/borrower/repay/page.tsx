'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { StripeCheckoutForm } from '@/components/StripeCheckoutForm';
import { Spinner } from '@/components/ui/spinner';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle, 
  AlertCircle,
  ArrowLeft,
  Info
} from 'lucide-react';
import Link from 'next/link';

interface CreditEntry {
  id: string;
  credit_amount: number;
  borrower_pubkey: string;
  store_owner_pubkey: string;
  store_owner_name: string;
  is_repaid: boolean;
  created_at: string;
  description?: string;
  due_date?: string;
}

type PaymentMethod = 'tokens' | 'stripe' | 'hybrid';

export default function BorrowerRepayPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const creditEntryId = searchParams.get('credit_entry_id');

  const [creditEntry, setCreditEntry] = useState<CreditEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Mock borrower wallet (in real app, get from auth)
  const borrowerWallet = 'BorrowerPublicKeyHere';

  useEffect(() => {
    const loadCreditEntry = async () => {
      if (!creditEntryId) {
        setError('Credit entry ID is required');
        setIsLoading(false);
        return;
      }

      try {
        // In a real app, fetch from your API
        // For now, mock data
        setCreditEntry({
          id: creditEntryId,
          credit_amount: 1500000, // ₹15,000
          borrower_pubkey: borrowerWallet,
          store_owner_pubkey: 'StoreOwnerPublicKeyHere',
          store_owner_name: 'Sharma Kirana Store',
          is_repaid: false,
          created_at: '2026-02-01',
          description: 'Grocery supplies and household items',
          due_date: '2026-03-15',
        });
        
        // Check if store owner has Stripe connected
        setStripeAvailable(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load credit entry'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCreditEntry();
  }, [creditEntryId, borrowerWallet]);

  const handlePayment = async () => {
    setProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessingPayment(false);
      setShowCheckout(true);
    }, 1000);
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout userType="borrower">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 mr-2" />
          <p>Loading credit details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !creditEntry) {
    return (
      <DashboardLayout userType="borrower">
        <div className="max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Credit entry not found'}</AlertDescription>
          </Alert>
          <Link href="/borrower/dashboard">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const amountInPaise = creditEntry.credit_amount;

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/borrower/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Repay Credit
            </h1>
            <p className="text-muted-foreground">Complete your payment to {creditEntry.store_owner_name}</p>
          </div>
        </div>

        {/* Credit Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Details</CardTitle>
            <CardDescription>Review the credit information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Store Owner</span>
              <span className="font-medium">{creditEntry.store_owner_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Credit Amount</span>
              <span className="font-bold text-xl">{formatAmount(amountInPaise)}</span>
            </div>
            {creditEntry.description && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-right">{creditEntry.description}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Issued On</span>
              <span className="font-medium">{formatDate(creditEntry.created_at)}</span>
            </div>
            {creditEntry.due_date && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Due Date</span>
                <span className="font-medium">{formatDate(creditEntry.due_date)}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={creditEntry.is_repaid ? 'secondary' : 'destructive'}>
                {creditEntry.is_repaid ? 'Paid' : 'Outstanding'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
            <CardDescription>
              Choose how you want to repay this credit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
              <div className="flex items-center space-x-3 border border-border p-4 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="stripe" id="stripe" />
                <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-chart-1" />
                    </div>
                    <div>
                      <p className="font-semibold">Pay with Stripe</p>
                      <p className="text-sm text-muted-foreground">
                        Credit/Debit Card, UPI, Net Banking
                      </p>
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border border-border p-4 rounded-lg hover:bg-accent cursor-pointer">
                <RadioGroupItem value="tokens" id="tokens" />
                <Label htmlFor="tokens" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-chart-2/10 rounded-lg">
                      <Wallet className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="font-semibold">Pay with Crypto</p>
                      <p className="text-sm text-muted-foreground">
                        Pay using Solana tokens from your wallet
                      </p>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {!stripeAvailable && paymentMethod === 'stripe' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  This store owner hasn't set up Stripe payments yet. Please use crypto payment or contact them.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handlePayment} 
              className="w-full" 
              size="lg"
              disabled={processingPayment || (paymentMethod === 'stripe' && !stripeAvailable)}
            >
              {processingPayment ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                <>
                  Proceed to Payment
                  {paymentMethod === 'stripe' ? (
                    <CreditCard className="ml-2 h-4 w-4" />
                  ) : (
                    <Wallet className="ml-2 h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Payment Instructions */}
        {paymentMethod === 'tokens' && (
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              You'll be prompted to approve the transaction in your wallet. Make sure you have sufficient SOL balance for the transaction.
            </AlertDescription>
          </Alert>
        )}

        {showCheckout && paymentMethod === 'stripe' && (
          <Card>
            <CardHeader>
              <CardTitle>Complete Payment</CardTitle>
              <CardDescription>Enter your payment details</CardDescription>
            </CardHeader>
            <CardContent>
              <StripeCheckoutForm 
                creditEntryId={creditEntry.id}
                amount={amountInPaise}
                currency="INR"
              />
            </CardContent>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-chart-2 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Secure Payment</p>
                <p className="text-sm text-muted-foreground">
                  Your payment is secured with industry-standard encryption. 
                  {paymentMethod === 'stripe' && ' Card details are never stored on our servers.'}
                  {paymentMethod === 'tokens' && ' Transaction is recorded on Solana blockchain.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
