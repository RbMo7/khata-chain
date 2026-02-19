import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateCitizenshipNumber,
  hashCitizenshipNumber,
  registerCitizenship,
} from '@/lib/citizenship-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { citizenship_number, borrower_pubkey, wallet_address } =
      await request.json();

    // Validate inputs
    if (!citizenship_number || !borrower_pubkey || !wallet_address) {
      return NextResponse.json(
        {
          error: 'Missing required fields: citizenship_number, borrower_pubkey, wallet_address',
        },
        { status: 400 }
      );
    }

    // Validate citizenship number format
    const validation = validateCitizenshipNumber(citizenship_number);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Hash the citizenship number
    const citizenshipHash = hashCitizenshipNumber(citizenship_number);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Register the citizenship
    const result = await registerCitizenship(
      citizenshipHash,
      borrower_pubkey,
      wallet_address,
      supabase
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Citizenship registered successfully',
        registrationId: result.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Citizenship registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register citizenship' },
      { status: 500 }
    );
  }
}
