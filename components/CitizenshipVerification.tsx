'use client';

import { useState } from 'react';
import { validateCitizenshipNumber } from '@/lib/citizenship-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';

interface CitizenshipVerificationProps {
  onVerified: (citizenshipHash: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function CitizenshipVerification({
  onVerified,
  onError,
  disabled = false,
}: CitizenshipVerificationProps) {
  const [citizenshipNumber, setCitizenshipNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCitizenshipNumber(value);
    setValidationError(null);
    setCheckError(null);
    setIsAvailable(null);
  };

  const handleVerify = async () => {
    // Validate locally first
    const validation = validateCitizenshipNumber(citizenshipNumber);
    if (!validation.valid) {
      setValidationError(validation.error!);
      return;
    }

    setIsLoading(true);
    setValidationError(null);
    setCheckError(null);

    try {
      const response = await fetch('/api/citizenship/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenship_number: citizenshipNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCheckError(data.error);
        setIsAvailable(false);
        return;
      }

      if (data.available) {
        setIsAvailable(true);
        setVerifiedHash(data.citizenshipHash);
        onVerified(data.citizenshipHash);
      } else {
        setIsAvailable(false);
        setCheckError(data.message);
        onError?.(data.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to verify citizenship';
      setCheckError(errorMessage);
      setIsAvailable(false);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="citizenship">
          Citizenship Number (Aadhar / ID Card)
        </Label>
        <p className="text-sm text-gray-600 mt-1 mb-2">
          This is required to prevent duplicate accounts. You cannot change this
          after registration.
        </p>
        <Input
          id="citizenship"
          placeholder="Enter your citizenship number"
          value={citizenshipNumber}
          onChange={handleInputChange}
          disabled={disabled || isLoading || isAvailable === true}
          className="mt-1"
        />
      </div>

      {validationError && (
        <Alert variant="destructive">
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      {checkError && (
        <Alert variant="destructive">
          <AlertDescription>{checkError}</AlertDescription>
        </Alert>
      )}

      {isAvailable === true && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            ✓ Citizenship number verified and available
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleVerify}
        disabled={
          disabled ||
          !citizenshipNumber ||
          isLoading ||
          isAvailable === true
        }
        className="w-full"
      >
        {isLoading && <Spinner className="mr-2 h-4 w-4" />}
        {isLoading ? 'Verifying...' : 'Verify Citizenship'}
      </Button>

      {isAvailable === true && (
        <p className="text-sm text-gray-600">
          You can now proceed with account creation.
        </p>
      )}
    </div>
  );
}
