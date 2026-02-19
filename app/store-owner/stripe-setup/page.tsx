'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StripeConnectButton } from '@/components/StripeConnectButton';
import { Spinner } from '@/components/ui/spinner';

interface StripeAccountStatus {
  connected: boolean;
  status: 'pending' | 'active' | 'rejected' | 'inactive';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  bankAccountLast4?: string;
  available?: number;
  pending?: number;
}

export default function StripeSetupPage() {
  const searchParams = useSearchParams();
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Mock store owner data (in real app, get from auth)
  const storeOwnerPubkey = 'StoreOwnerPublicKeyHere';

  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true' || refresh === 'true') {
      // Check account status after returning from Stripe
      checkAccountStatus();
    } else {
      loadInitialStatus();
    }
  }, [searchParams]);

  const loadInitialStatus = async () => {
    try {
      setIsLoading(true);
      // In a real app, fetch from API
      // For now, mock as not connected
      setAccountStatus({
        connected: false,
        status: 'inactive',
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load account status'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccountStatus = async () => {
    try {
      // In a real app, fetch from API
      // For now, mock as pending
      setAccountStatus({
        connected: true,
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to check account status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-6 w-6 mr-2" />
        <p>Loading...</p>
      </div>
    );
  }

  const getStatusColor = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Stripe Payment Setup
          </h1>
          <p className="text-slate-600 mt-2">
            Connect your Stripe account to accept payments from borrowers
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Status Card */}
        <Card className="p-6 mb-6 border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Connection Status
            </h2>
            {accountStatus && (
              <Badge variant={getStatusColor(accountStatus.status)}>
                {getStatusLabel(accountStatus.status)}
              </Badge>
            )}
          </div>

          {accountStatus?.connected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Charges Enabled</p>
                  <p className="text-lg font-semibold">
                    {accountStatus.chargesEnabled ? '✓ Yes' : '✗ No'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Payouts Enabled</p>
                  <p className="text-lg font-semibold">
                    {accountStatus.payoutsEnabled ? '✓ Yes' : '✗ No'}
                  </p>
                </div>
              </div>

              {accountStatus.bankAccountLast4 && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">Bank Account</p>
                  <p className="font-mono text-lg">****{accountStatus.bankAccountLast4}</p>
                </div>
              )}

              {accountStatus.available !== undefined && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-600">Available Balance</p>
                      <p className="text-lg font-semibold">
                        ₹{(accountStatus.available / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Pending Payouts</p>
                      <p className="text-lg font-semibold">
                        ₹{(accountStatus.pending! / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-600">
              You haven't connected a Stripe account yet. Click below to get started.
            </p>
          )}
        </Card>

        {/* Setup Form */}
        {(!accountStatus?.connected || showForm) && (
          <Card className="p-6 border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">
              {accountStatus?.connected ? 'Update' : 'Connect'} Stripe Account
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  placeholder="Your kirana store name"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="storeEmail">Email Address</Label>
                <Input
                  id="storeEmail"
                  type="email"
                  placeholder="your@email.com"
                  value={storeEmail}
                  onChange={(e) => setStoreEmail(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+91 XXXXX XXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <StripeConnectButton
              storeOwnerPubkey={storeOwnerPubkey}
              storeOwnerEmail={storeEmail}
              storeName={storeName}
              phoneNumber={phoneNumber}
              onSuccess={() => {
                setShowForm(false);
                checkAccountStatus();
              }}
              onError={(err) => {
                setError(err);
              }}
            />
          </Card>
        )}

        {/* Information Card */}
        <Card className="mt-6 p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              1. <strong>Connect Stripe</strong> - You'll be redirected to Stripe to set up your account
            </li>
            <li>
              2. <strong>Verify Bank Account</strong> - Provide your bank details for payouts
            </li>
            <li>
              3. <strong>Start Accepting Payments</strong> - Borrowers can repay via Stripe
            </li>
            <li>
              4. <strong>Automatic Payouts</strong> - Funds are transferred to your bank account
            </li>
          </ul>
        </Card>

        {/* Features Card */}
        <Card className="mt-4 p-6 border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Features Included</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Accept credit card payments</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>UPI and bank transfer options</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Instant payment notifications</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Secure, PCI-compliant processing</span>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
