'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface StripeConnectButtonProps {
  storeOwnerPubkey: string;
  storeOwnerEmail: string;
  storeName: string;
  phoneNumber?: string;
  onSuccess?: (stripeAccountId: string) => void;
  onError?: (error: string) => void;
}

export function StripeConnectButton({
  storeOwnerPubkey,
  storeOwnerEmail,
  storeName,
  phoneNumber,
  onSuccess,
  onError,
}: StripeConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_owner_pubkey: storeOwnerPubkey,
          store_owner_email: storeOwnerEmail,
          store_name: storeName,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize Stripe Connect');
      }

      // Redirect to Stripe onboarding
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
        onSuccess?.(data.stripeAccountId);
      } else {
        throw new Error('No onboarding URL provided');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to connect Stripe';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleConnect}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {isLoading ? 'Connecting...' : 'Connect Stripe Account'}
      </Button>

      <p className="text-sm text-gray-600">
        You'll be redirected to Stripe to set up your payment account and connect your bank details.
      </p>
    </div>
  );
}
