import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentIntent } from '@/lib/stripe-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const {
      credit_entry_id,
      amount,
      currency = 'INR',
      store_owner_pubkey,
      borrower_wallet,
      description,
    } = await request.json();

    // Validate required fields
    if (
      !credit_entry_id ||
      !amount ||
      !store_owner_pubkey ||
      !borrower_wallet
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate amount (must be positive integer in smallest currency unit)
    if (amount <= 0 || !Number.isInteger(amount)) {
      return NextResponse.json(
        { error: 'Amount must be a positive integer in paise (INR)' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get store owner's Stripe account ID
    const { data: stripeAccount, error: dbError } = await supabase
      .from('store_owner_stripe_accounts')
      .select('stripe_account_id, onboarding_status')
      .eq('store_owner_pubkey', store_owner_pubkey)
      .single();

    if (dbError || !stripeAccount) {
      return NextResponse.json(
        { error: 'Store owner does not have a Stripe account connected' },
        { status: 400 }
      );
    }

    if (stripeAccount.onboarding_status !== 'active') {
      return NextResponse.json(
        {
          error: 'Store owner Stripe account is not fully set up',
          status: stripeAccount.onboarding_status,
        },
        { status: 400 }
      );
    }

    // Create payment intent
    const result = await createPaymentIntent(
      amount,
      currency,
      stripeAccount.stripe_account_id,
      borrower_wallet,
      credit_entry_id,
      description || `KhataChain Repayment - ${credit_entry_id.slice(0, 8)}`
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Save to database
    const { error: insertError } = await supabase
      .from('stripe_payments')
      .insert({
        credit_entry_id,
        borrower_pubkey: borrower_wallet,
        store_owner_pubkey,
        store_owner_stripe_id: stripeAccount.stripe_account_id,
        amount,
        currency: currency.toUpperCase(),
        payment_intent_id: result.paymentIntentId!,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Payment intent error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
