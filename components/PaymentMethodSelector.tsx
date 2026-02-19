'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatNPR } from '@/lib/currency-utils';

type PaymentMethod = 'tokens' | 'stripe' | 'hybrid';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  stripeAvailable: boolean;
  stripeWarning?: string;
  creditAmount: number;
  onChainFeePercentage?: number;
  stripeFeePercentage?: number;
}

export function PaymentMethodSelector({
  value,
  onChange,
  stripeAvailable,
  stripeWarning,
  creditAmount,
  onChainFeePercentage = 0,
  stripeFeePercentage = 3.5,
}: PaymentMethodSelectorProps) {
  const calculateFee = (amount: number, feePercentage: number): number => {
    return Math.round(amount * (feePercentage / 100));
  };

  const tokensFee = calculateFee(creditAmount, onChainFeePercentage);
  const stripeFee = calculateFee(creditAmount, stripeFeePercentage);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-3">Select Payment Method</h3>
      </div>

      <RadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethod)}>
        {/* Tokens Option */}
        <div className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition">
          <RadioGroupItem value="tokens" id="tokens" className="mt-1" />
          <div className="flex-1">
            <Label htmlFor="tokens" className="cursor-pointer font-medium">
              Solana Tokens
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Repay directly using Solana blockchain
            </p>
            <div className="text-sm mt-2 space-y-1">
              <p>
                Amount: <span className="font-semibold">{(creditAmount / 1e8).toFixed(8)} SOL</span>
              </p>
              {tokensFee > 0 && (
                <p>
                  Fee: <span className="text-orange-600">{(tokensFee / 1e8).toFixed(8)} SOL</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stripe Option */}
        <div
          className={`flex items-start space-x-3 p-4 border rounded-lg transition ${
            stripeAvailable
              ? 'cursor-pointer hover:bg-gray-50'
              : 'opacity-60 cursor-not-allowed bg-gray-50'
          }`}
        >
          <RadioGroupItem
            value="stripe"
            id="stripe"
            disabled={!stripeAvailable}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="stripe"
              className={`font-medium ${stripeAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              Stripe (Card / UPI / Bank Transfer)
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Pay using your card, UPI, or bank transfer
            </p>
            {stripeWarning && (
              <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-sm text-yellow-800">
                  {stripeWarning}
                </AlertDescription>
              </Alert>
            )}
            {stripeAvailable && (
              <div className="text-sm mt-2 space-y-1">
                <p>
                  Amount: <span className="font-semibold">{formatNPR(creditAmount)}</span>
                </p>
                <p>
                  Fee: <span className="text-orange-600">{formatNPR(stripeFee)} ({stripeFeePercentage}%)</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hybrid Option */}
        <div
          className={`flex items-start space-x-3 p-4 border rounded-lg transition ${
            stripeAvailable
              ? 'cursor-pointer hover:bg-gray-50'
              : 'opacity-60 cursor-not-allowed bg-gray-50'
          }`}
        >
          <RadioGroupItem
            value="hybrid"
            id="hybrid"
            disabled={!stripeAvailable}
            className="mt-1"
          />
          <div className="flex-1">
            <Label
              htmlFor="hybrid"
              className={`font-medium ${stripeAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
            >
              Hybrid (Partial Tokens + Stripe)
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              Split payment between tokens and Stripe
            </p>
            {!stripeAvailable && (
              <Alert className="mt-2 bg-red-50 border-red-200">
                <AlertDescription className="text-sm text-red-800">
                  Store owner hasn't connected their Stripe account yet
                </AlertDescription>
              </Alert>
            )}
            {stripeAvailable && (
              <p className="text-sm text-gray-500 mt-2">
                You can choose how to split the payment in the next step
              </p>
            )}
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
