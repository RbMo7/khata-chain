import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validateCitizenshipNumber,
  hashCitizenshipNumber,
  checkCitizenshipExists,
} from '@/lib/citizenship-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { citizenship_number } = await request.json();

    // Validate input
    if (!citizenship_number) {
      return NextResponse.json(
        { error: 'Citizenship number is required' },
        { status: 400 }
      );
    }

    // Validate format
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

    // Check if citizenship already exists
    const checkResult = await checkCitizenshipExists(citizenshipHash, supabase);

    if (checkResult.exists) {
      return NextResponse.json(
        {
          available: false,
          message: 'This citizenship number is already registered. Each person can only have one KhataChain account.',
          existingWallet: checkResult.walletAddress,
          status: checkResult.status,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        available: true,
        message: 'Citizenship number is available',
        citizenshipHash, // Send hash to frontend for later use
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Citizenship check error:', error);
    return NextResponse.json(
      { error: 'Failed to check citizenship availability' },
      { status: 500 }
    );
  }
}
