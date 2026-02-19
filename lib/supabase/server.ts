/**
 * Supabase Server Client for Server-Side Operations
 * Use this for API routes, server components, and middleware
 * Uses service role key for elevated permissions
 */

import { createClient } from '@supabase/supabase-js'
// @ts-ignore - Type import
import type { Database } from './types'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables')
}

/**
 * Create a Supabase client with service role privileges
 * WARNING: Only use this on the server. Never expose service role key to client.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Create a Supabase client with user context for server-side operations
 * This should be used when you need to impersonate a user on the server
 */
export function createServerClient(accessToken?: string) {
  const anonKey = process.env.SUPABASE_ANON_KEY!
  
  const client = createClient<Database>(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: accessToken ? {
        Authorization: `Bearer ${accessToken}`,
      } : {},
    },
  })

  return client
}
