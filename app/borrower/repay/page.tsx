'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import { StripeCheckoutForm } from '@/components/StripeCheckoutForm';
import { Spinner } from '@/components/ui/spinner';

interface CreditEntry {
  id: string;
  credit_amount: number;
  borrower_pubkey: string;
  store_owner_pubkey: string;
  store_owner_name: string;
  is_repaid: boolean;
  created_at: string;
}

type PaymentMethod = 'tokens' | 'stripe' | 'hybrid';

export default function BorrowerRepayPage() {
  const searchParams = useSearchParams();
  const creditEntryId = searchParams.get('credit_entry_id');

  const [creditEntry, setCreditEntry] = useState<CreditEntry | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tokens');
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

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
          credit_amount: 10000, // ₹100
          borrower_pubkey: borrowerWallet,
          store_owner_pubkey: 'StoreOwnerPublicKeyHere',
          store_owner_name: 'Local Kirana Store',
          is_repaid: false,
          created_at: new Date().toISOString(),
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 mr-2" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !creditEntry) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error || 'Credit entry not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const amountInPaise = creditEntry.credit_amount;
  const amountInRupees = amountInPaise / 100;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-slate-900">
          Repay Credit
        </h1>
        <p className="text-slate-600 mb-8">
          Select how you'd like to repay your credit from{' '}
          <span className="font-semibold">{creditEntry.store_owner_name}</span>
        </p>

        <Card className="p-6 mb-6 border-slate-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-600">Credit Amount</p>
              <p className="text-2xl font-bold text-slate-900">
                ₹{amountInRupees.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">From Store</p>
              <p className="text-lg font-semibold text-slate-900">
                {creditEntry.store_owner_name}
              </p>
            </div>
          </div>

          {creditEntry.is_repaid && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✓ This credit has already been repaid
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {!creditEntry.is_repaid && (
          <>
            {!showCheckout ? (
              <Card className="p-6 border-slate-200">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  stripeAvailable={stripeAvailable}
                  stripeWarning={
                    !stripeAvailable
                      ? 'This store owner hasn\'t set up Stripe yet'
                      : undefined
                  }
                  creditAmount={amountInPaise}
                  stripeFeePercentage={3.5}
                />

                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={
                    !paymentMethod ||
                    (!stripeAvailable && paymentMethod !== 'tokens')
                  }
                  className="w-full mt-6"
                >
                  Continue to Payment
                </Button>
              </Card>
            ) : paymentMethod === 'tokens' ? (
              <Card className="p-6 border-slate-200">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">
                  Solana Token Payment
                </h2>
                <p className="text-slate-600 mb-4">
                  You'll send SOL tokens directly to the store owner's wallet.
                </p>
                <Button
                  onClick={() => setShowCheckout(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back
                </Button>
              </Card>
            ) : (
              <Card className="p-6 border-slate-200">
                <h2 className="text-xl font-semibold mb-4 text-slate-900">
                  Complete Payment
                </h2>
                <StripeCheckoutForm
                  creditEntryId={creditEntry.id}
                  amount={amountInPaise}
                  currency="INR"
                  storeOwnerPubkey={creditEntry.store_owner_pubkey}
                  borrowerWallet={borrowerWallet}
                  description={`Repayment to ${creditEntry.store_owner_name}`}
                  onSuccess={() => {
                    setError(null);
                    // Show success message
                  }}
                  onError={(err) => {
                    setError(err);
                  }}
                />
                <Button
                  onClick={() => setShowCheckout(false)}
                  variant="outline"
                  className="w-full mt-4"
                >
                  Back
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
