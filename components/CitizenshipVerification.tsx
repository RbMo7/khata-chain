'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

interface CitizenshipVerificationProps {
  walletAddress: string;
  borrowerPubkey: string;
  onVerified: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

// Simulate NID database lookup stages
const VERIFICATION_STAGES = [
  'Connecting to NID registry…',
  'Validating NID number…',
  'Cross-checking records…',
  'Finalising verification…',
];

export function CitizenshipVerification({
  walletAddress,
  borrowerPubkey,
  onVerified,
  onError,
  disabled = false,
}: CitizenshipVerificationProps) {
  const [nidNumber, setNidNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stageLabel, setStageLabel] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
    setNidNumber(value);
    setFieldError(null);
    setApiError(null);
  };

  const handleVerify = async () => {
    if (nidNumber.length < 8) {
      setFieldError('NID number must be at least 8 digits.');
      return;
    }

    setIsLoading(true);
    setFieldError(null);
    setApiError(null);

    // Walk through fake verification stages for UX
    for (let i = 0; i < VERIFICATION_STAGES.length; i++) {
      setStageLabel(VERIFICATION_STAGES[i]);
      await new Promise((r) => setTimeout(r, 600));
    }

    try {
      const response = await fetch('/api/citizenship/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenship_number: nidNumber,
          borrower_pubkey: borrowerPubkey,
          wallet_address: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error || 'Verification failed. Please try again.';
        setApiError(msg);
        onError?.(msg);
        return;
      }

      setVerified(true);
      onVerified();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setApiError(msg);
      onError?.(msg);
    } finally {
      setIsLoading(false);
      setStageLabel('');
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
        <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800">NID Verified Successfully</p>
          <p className="text-sm text-emerald-700">Your identity has been confirmed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="nid" className="text-sm font-medium">
          NID Number
        </Label>
        <p className="text-sm text-muted-foreground">
          Enter your National Identity Document (NID) number. This is a one-time verification — it cannot be changed later.
        </p>
        <Input
          id="nid"
          inputMode="numeric"
          placeholder="Enter your NID number (8–12 digits)"
          value={nidNumber}
          onChange={handleInputChange}
          disabled={disabled || isLoading}
          className="text-base tracking-widest font-mono"
          maxLength={12}
        />
        <p className="text-xs text-muted-foreground">{nidNumber.length} / 12 digits</p>
      </div>

      {fieldError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{fieldError}</AlertDescription>
        </Alert>
      )}

      {apiError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {isLoading && stageLabel && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          <span>{stageLabel}</span>
        </div>
      )}

      <Button
        onClick={handleVerify}
        disabled={disabled || nidNumber.length < 8 || isLoading}
        className="w-full gap-2"
        size="lg"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</>
        ) : (
          <><ShieldCheck className="h-4 w-4" />Verify NID</>
        )}
      </Button>
    </div>
  );
}
