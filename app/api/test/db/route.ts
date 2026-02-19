import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * Database Connection Test Endpoint
 * 
 * Test this endpoint to verify Supabase connection works
 * Visit: http://localhost:3000/api/test/db
 */
export async function GET() {
  try {
    // Test 1: Basic connection
    const { data: borrowersCount, error: error1 } = await supabaseAdmin
      .from('borrowers')
      .select('*', { count: 'exact', head: true })

    // Test 2: Store owners count
    const { data: storeOwnersCount, error: error2 } = await supabaseAdmin
      .from('store_owners')
      .select('*', { count: 'exact', head: true })

    // Test 3: Credit entries count
    const { data: creditsCount, error: error3 } = await supabaseAdmin
      .from('credit_entries')
      .select('*', { count: 'exact', head: true })

    if (error1 || error2 || error3) {
      return NextResponse.json(
        {
          status: 'error',
          errors: {
            borrowers: error1?.message,
            storeOwners: error2?.message,
            credits: error3?.message,
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'connected',
      message: 'Supabase connection successful! ✅',
      tables: {
        borrowers: borrowersCount || 0,
        store_owners: storeOwnersCount || 0,
        credit_entries: creditsCount || 0,
      },
      timestamp: new Date().toISOString(),
      database: process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0],
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        hint: 'Check your environment variables and database schema',
      },
      { status: 500 }
    )
  }
}
