/**
 * Auth Service
 * Handles wallet-based authentication with Supabase
 */

import { supabaseAdmin } from '../supabase/server'
import type { Database } from '../supabase/types'

type Borrower = Database['public']['Tables']['borrowers']['Row']
type StoreOwner = Database['public']['Tables']['store_owners']['Row']

export interface AuthUser {
  id: string
  walletAddress: string
  userType: 'borrower' | 'store-owner'
  email: string
  citizenshipVerified?: boolean
  data: Borrower | StoreOwner
}

/**
 * Authenticate a user by wallet address
 * Checks both borrowers and store_owners tables
 */
export async function authenticateWallet(walletAddress: string): Promise<AuthUser | null> {
  try {
    // Check if user is a borrower
    const { data: borrower, error: borrowerError } = await supabaseAdmin
      .from('borrowers')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (borrower && !borrowerError) {
      return {
        id: borrower.id,
        walletAddress: borrower.wallet_address,
        userType: 'borrower',
        email: borrower.email,
        citizenshipVerified: !!borrower.citizenship_verified_at,
        data: borrower,
      }
    }

    // Check if user is a store owner
    const { data: storeOwner, error: storeOwnerError } = await supabaseAdmin
      .from('store_owners')
      .select('*')
      .eq('store_owner_pubkey', walletAddress)
      .single()

    if (storeOwner && !storeOwnerError) {
      return {
        id: storeOwner.id,
        walletAddress: storeOwner.store_owner_pubkey,
        userType: 'store-owner',
        email: storeOwner.email,
        data: storeOwner,
      }
    }

    return null
  } catch (error) {
    console.error('Auth wallet error:', error)
    return null
  }
}

/**
 * Get or create a user by wallet address
 * Used during initial wallet connection
 */
export async function getOrCreateUser(
  walletAddress: string,
  userType: 'borrower' | 'store-owner',
  email?: string
): Promise<AuthUser | null> {
  try {
    // First try to authenticate existing user
    const existingUser = await authenticateWallet(walletAddress)
    if (existingUser) {
      return existingUser
    }

    // Create new user based on type
    if (userType === 'borrower') {
      const { data: newBorrower, error } = await supabaseAdmin
        .from('borrowers')
        .insert({
          borrower_pubkey: walletAddress,
          wallet_address: walletAddress,
          email: email || `${walletAddress.slice(0, 8)}@khatachain.temp`,
          original_citizenship_hash_verified: false,
        })
        .select()
        .single()

      if (error) {
        console.error('Create borrower error:', error)
        return null
      }

      return {
        id: newBorrower.id,
        walletAddress: newBorrower.wallet_address,
        userType: 'borrower',
        email: newBorrower.email,
        citizenshipVerified: false,
        data: newBorrower,
      }
    } else {
      const { data: newStoreOwner, error } = await supabaseAdmin
        .from('store_owners')
        .insert({
          store_owner_pubkey: walletAddress,
          email: email || `${walletAddress.slice(0, 8)}@khatachain.temp`,
          store_name: 'My Store', // Default, can be updated later
        })
        .select()
        .single()

      if (error) {
        console.error('Create store owner error:', error)
        return null
      }

      return {
        id: newStoreOwner.id,
        walletAddress: newStoreOwner.store_owner_pubkey,
        userType: 'store-owner',
        email: newStoreOwner.email,
        data: newStoreOwner,
      }
    }
  } catch (error) {
    console.error('Get or create user error:', error)
    return null
  }
}

/**
 * Verify wallet signature (for enhanced security)
 * This should be implemented when using wallet signing
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  // TODO: Implement signature verification using Solana SDK
  // For now, return true as a placeholder
  console.log('Signature verification not yet implemented')
  return true
}

/**
 * Update user's last activity timestamp
 */
export async function updateUserActivity(
  userId: string,
  userType: 'borrower' | 'store-owner'
): Promise<void> {
  try {
    const table = userType === 'borrower' ? 'borrowers' : 'store_owners'
    await supabaseAdmin
      .from(table as any)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId)
  } catch (error) {
    console.error('Update activity error:', error)
  }
}
