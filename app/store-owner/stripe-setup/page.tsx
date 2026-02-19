'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { StripeConnectButton } from '@/components/StripeConnectButton';
import { Spinner } from '@/components/ui/spinner';
import { 
  CheckCircle, 
  AlertCircle,
  CreditCard,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
  Shield,
  Clock
} from 'lucide-react';
import Link from 'next/link';

interface StripeAccountStatus {
  connected: boolean;
  status: 'pending' | 'active' | 'rejected' | 'inactive';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  bankAccountLast4?: string;
  available?: number;
  pending?: number;
  requirements?: string[];
}

export default function StripeSetupPage() {
  const searchParams = useSearchParams();
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const storeOwnerPubkey = 'StoreOwnerPublicKeyHere';

  useEffect(() => {
    const success = searchParams.get('success');
    const refresh = searchParams.get('refresh');

    if (success === 'true' || refresh === 'true') {
      checkAccountStatus();
    } else {
      loadInitialStatus();
    }
  }, [searchParams]);

  const loadInitialStatus = async () => {
    try {
      setIsLoading(true);
      setAccountStatus({
        connected: false,
        status: 'inactive',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account status');
    } finally {
      setIsLoading(false);
    }
  };

  const checkAccountStatus = async () => {
    try {
      setIsLoading(true);
      const mockStatus = searchParams.get('mock_status') || 'pending';
      
      if (mockStatus === 'active') {
        setAccountStatus({
          connected: true,
          status: 'active',
          chargesEnabled: true,
          payoutsEnabled: true,
          bankAccountLast4: '4242',
          available: 125000,
          pending: 45000,
        });
      } else {
        setAccountStatus({
          connected: true,
          status: 'pending',
          chargesEnabled: false,
          payoutsEnabled: false,
          requirements: ['Verify bank account', 'Submit business details']
        });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to check account status:', err);
      setError('Failed to load account status');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userType="store-owner">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6 mr-2" />
          <p>Loading Stripe account status...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="store-owner">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/store-owner/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stripe Payment Setup</h1>
            <p className="text-muted-foreground">Enable fiat payments for your borrowers</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!accountStatus?.connected && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Why Connect Stripe?</CardTitle>
                <CardDescription>Accept fiat payments from borrowers via UPI, cards, and net banking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-1/10 rounded-lg">
                      <CreditCard className="h-5 w-5 text-chart-1" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Multiple Payment Methods</h3>
                      <p className="text-sm text-muted-foreground">Accept credit/debit cards, UPI, net banking, and wallets</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-2/10 rounded-lg">
                      <DollarSign className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Instant Settlements</h3>
                      <p className="text-sm text-muted-foreground">Receive payments directly to your bank account</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-3/10 rounded-lg">
                      <Shield className="h-5 w-5 text-chart-3" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Secure & Compliant</h3>
                      <p className="text-sm text-muted-foreground">PCI DSS compliant payment processing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-chart-4/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-chart-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Transparent Fees</h3>
                      <p className="text-sm text-muted-foreground">2.9% + ₹3 per transaction (Stripe standard)</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <StripeConnectButton
                    storeOwnerPubkey={storeOwnerPubkey}
                    storeOwnerEmail="owner@store.com"
                    storeName="My Store"
                    onSuccess={() => checkAccountStatus()}
                    onError={(err) => setError(err)}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Your data is secure</p>
                    <p className="text-sm text-muted-foreground">
                      We never store your banking details. All sensitive information is handled securely by Stripe's PCI-compliant infrastructure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {accountStatus?.connected && accountStatus.status === 'pending' && (
          <>
            <Card className="border-chart-1/50 bg-chart-1/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-chart-1" />
                  <CardTitle>Stripe Account Pending</CardTitle>
                </div>
                <CardDescription>Complete the following requirements to activate payments</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {accountStatus.requirements && accountStatus.requirements.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Required Actions:</p>
                    <ul className="space-y-2">
                      {accountStatus.requirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <div className="h-2 w-2 rounded-full bg-chart-1" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button className="w-full sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Complete Stripe Onboarding
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={getStatusColor(accountStatus.status)}>{accountStatus.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Charges Enabled</span>
                  {accountStatus.chargesEnabled ? <CheckCircle className="h-5 w-5 text-chart-2" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payouts Enabled</span>
                  {accountStatus.payoutsEnabled ? <CheckCircle className="h-5 w-5 text-chart-2" /> : <AlertCircle className="h-5 w-5 text-muted-foreground" />}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {accountStatus?.connected && accountStatus.status === 'active' && (
          <>
            <Card className="border-chart-2/50 bg-chart-2/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                  <CardTitle>Stripe Connected</CardTitle>
                </div>
                <CardDescription>Your Stripe account is active and ready to accept payments</CardDescription>
              </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {accountStatus.available !== undefined ? formatAmount(accountStatus.available) : '₹0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Ready to transfer</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {accountStatus.pending !== undefined ? formatAmount(accountStatus.pending) : '₹0'}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Processing</p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Charges Enabled</span>
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Payouts Enabled</span>
                  <CheckCircle className="h-5 w-5 text-chart-2" />
                </div>
                {accountStatus.bankAccountLast4 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bank Account</span>
                    <span className="text-sm font-mono">****{accountStatus.bankAccountLast4}</span>
                  </div>
                )}
                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage in Stripe Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {accountStatus?.connected && accountStatus.status === 'rejected' && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Account Rejected</CardTitle>
              </div>
              <CardDescription>Your Stripe account couldn't be verified. Please contact support.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">Contact Support</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
