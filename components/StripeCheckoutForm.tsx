'use client';

import { useState, useEffect } from 'react';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface StripeCheckoutFormProps {
  creditEntryId: string;
  amount: number; // in paise/smallest unit
  currency: string;
  storeOwnerPubkey: string;
  borrowerWallet: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  description?: string;
}

export function StripeCheckoutForm({
  creditEntryId,
  amount,
  currency,
  storeOwnerPubkey,
  borrowerWallet,
  onSuccess,
  onError,
  description,
}: StripeCheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const createPaymentIntent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/stripe/payment/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credit_entry_id: creditEntryId,
            amount,
            currency,
            store_owner_pubkey: storeOwnerPubkey,
            borrower_wallet: borrowerWallet,
            description,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent');
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize payment';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [creditEntryId, amount, currency, storeOwnerPubkey, borrowerWallet, description, onSuccess, onError]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="h-6 w-6 mr-2" />
        <p>Initializing payment form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load payment form</AlertDescription>
      </Alert>
    );
  }

  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        onComplete: () => {
          onSuccess?.();
        },
      }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
