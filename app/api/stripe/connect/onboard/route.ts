import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { initializeStripeConnect } from '@/lib/stripe-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const {
      store_owner_pubkey,
      store_owner_email,
      store_name,
      phone_number,
    } = await request.json();

    // Validate required fields
    if (!store_owner_pubkey || !store_owner_email || !store_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if already connected
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: existing } = await supabase
      .from('store_owner_stripe_accounts')
      .select('stripe_account_id, onboarding_status')
      .eq('store_owner_pubkey', store_owner_pubkey)
      .single();

    if (existing && existing.onboarding_status === 'active') {
      return NextResponse.json(
        {
          error: 'Stripe account already connected',
          stripeAccountId: existing.stripe_account_id,
        },
        { status: 400 }
      );
    }

    // Initialize Stripe Connect
    const result = await initializeStripeConnect(
      store_owner_pubkey,
      store_owner_email,
      store_name,
      phone_number
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Save to database
    const { error: dbError } = await supabase
      .from('store_owner_stripe_accounts')
      .upsert(
        {
          store_owner_pubkey,
          stripe_account_id: result.stripeAccountId!,
          onboarding_status: 'pending',
          onboarding_link: result.onboardingUrl,
          onboarding_link_expires_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'store_owner_pubkey',
        }
      );

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save Stripe account information' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stripeAccountId: result.stripeAccountId,
        onboardingUrl: result.onboardingUrl,
        message: 'Stripe Connect onboarding initiated',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Stripe onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Stripe Connect onboarding' },
      { status: 500 }
    );
  }
}
