/**
 * Database Types
 * Auto-generated types for Supabase tables
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      borrowers: {
        Row: {
          id: string
          borrower_pubkey: string
          email: string
          wallet_address: string
          full_name: string | null
          phone_number: string | null
          display_name: string | null
          created_at: string
          updated_at: string
          citizenship_number_hash: string | null
          citizenship_verified_at: string | null
          original_citizenship_hash_verified: boolean
        }
        Insert: {
          id?: string
          borrower_pubkey: string
          email: string
          wallet_address: string
          full_name?: string | null
          phone_number?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
          citizenship_number_hash?: string | null
          citizenship_verified_at?: string | null
          original_citizenship_hash_verified?: boolean
        }
        Update: {
          id?: string
          borrower_pubkey?: string
          email?: string
          wallet_address?: string
          full_name?: string | null
          phone_number?: string | null
          display_name?: string | null
          created_at?: string
          updated_at?: string
          citizenship_number_hash?: string | null
          citizenship_verified_at?: string | null
          original_citizenship_hash_verified?: boolean
        }
      }
      store_owners: {
        Row: {
          id: string
          store_owner_pubkey: string
          email: string
          store_name: string
          store_address: string | null
          city: string | null
          state: string | null
          postal_code: string | null
          phone_number: string | null
          business_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          store_owner_pubkey: string
          email: string
          store_name: string
          store_address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          phone_number?: string | null
          business_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          store_owner_pubkey?: string
          email?: string
          store_name?: string
          store_address?: string | null
          city?: string | null
          state?: string | null
          postal_code?: string | null
          phone_number?: string | null
          business_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      credit_entries: {
        Row: {
          id: string
          borrower_pubkey: string
          store_owner_pubkey: string
          credit_amount: number
          currency: string
          description: string | null
          created_at: string
          due_date: string | null
          status: 'active' | 'completed' | 'overdue' | 'cancelled' | 'pending_approval'
          nft_mint_address: string | null
          stripe_repayment_amount: number
          repayment_method: 'on_chain' | 'stripe' | 'hybrid'
          stripe_payment_intent_id: string | null
          repayment_status: 'pending' | 'partial' | 'completed' | 'refunded' | 'failed'
        }
        Insert: {
          id?: string
          borrower_pubkey: string
          store_owner_pubkey: string
          credit_amount: number
          currency?: string
          description?: string | null
          created_at?: string
          due_date?: string | null
          status?: 'active' | 'completed' | 'overdue' | 'cancelled'
          nft_mint_address?: string | null
          stripe_repayment_amount?: number
          repayment_method?: 'on_chain' | 'stripe' | 'hybrid'
          stripe_payment_intent_id?: string | null
          repayment_status?: 'pending' | 'partial' | 'completed' | 'refunded' | 'failed'
        }
        Update: {
          id?: string
          borrower_pubkey?: string
          store_owner_pubkey?: string
          credit_amount?: number
          currency?: string
          description?: string | null
          created_at?: string
          due_date?: string | null
          status?: 'active' | 'completed' | 'overdue' | 'cancelled'
          nft_mint_address?: string | null
          stripe_repayment_amount?: number
          repayment_method?: 'on_chain' | 'stripe' | 'hybrid'
          stripe_payment_intent_id?: string | null
          repayment_status?: 'pending' | 'partial' | 'completed' | 'refunded' | 'failed'
        }
      }
      citizenship_registrations: {
        Row: {
          id: string
          citizenship_number_hash: string
          borrower_pubkey: string
          first_wallet_address: string
          registered_at: string
          status: 'active' | 'inactive' | 'suspended'
          verified_at: string | null
        }
        Insert: {
          id?: string
          citizenship_number_hash: string
          borrower_pubkey: string
          first_wallet_address: string
          registered_at?: string
          status?: 'active' | 'inactive' | 'suspended'
          verified_at?: string | null
        }
        Update: {
          id?: string
          citizenship_number_hash?: string
          borrower_pubkey?: string
          first_wallet_address?: string
          registered_at?: string
          status?: 'active' | 'inactive' | 'suspended'
          verified_at?: string | null
        }
      }
      citizenship_verification_logs: {
        Row: {
          id: string
          citizenship_hash: string
          wallet_address: string
          verification_attempt_at: string
          verification_result: 'allowed' | 'rejected_duplicate' | 'rejected_invalid' | null
          reason: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          citizenship_hash: string
          wallet_address: string
          verification_attempt_at?: string
          verification_result?: 'allowed' | 'rejected_duplicate' | 'rejected_invalid' | null
          reason?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          citizenship_hash?: string
          wallet_address?: string
          verification_attempt_at?: string
          verification_result?: 'allowed' | 'rejected_duplicate' | 'rejected_invalid' | null
          reason?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      stripe_payments: {
        Row: {
          id: string
          credit_entry_id: string
          borrower_pubkey: string
          store_owner_pubkey: string
          store_owner_stripe_id: string
          amount: number
          currency: string
          payment_intent_id: string
          payment_method_id: string | null
          payment_method_type: 'card' | 'upi' | 'netbanking' | 'wallet' | 'unknown' | null
          status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled'
          created_at: string
          completed_at: string | null
          webhook_received_at: string | null
          failed_reason: string | null
          refund_id: string | null
          refund_reason: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          credit_entry_id: string
          borrower_pubkey: string
          store_owner_pubkey: string
          store_owner_stripe_id: string
          amount: number
          currency?: string
          payment_intent_id: string
          payment_method_id?: string | null
          payment_method_type?: 'card' | 'upi' | 'netbanking' | 'wallet' | 'unknown' | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled'
          created_at?: string
          completed_at?: string | null
          webhook_received_at?: string | null
          failed_reason?: string | null
          refund_id?: string | null
          refund_reason?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          credit_entry_id?: string
          borrower_pubkey?: string
          store_owner_pubkey?: string
          store_owner_stripe_id?: string
          amount?: number
          currency?: string
          payment_intent_id?: string
          payment_method_id?: string | null
          payment_method_type?: 'card' | 'upi' | 'netbanking' | 'wallet' | 'unknown' | null
          status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled'
          created_at?: string
          completed_at?: string | null
          webhook_received_at?: string | null
          failed_reason?: string | null
          refund_id?: string | null
          refund_reason?: string | null
          metadata?: Json
        }
      }
      store_owner_stripe_accounts: {
        Row: {
          id: string
          store_owner_pubkey: string
          stripe_account_id: string
          stripe_customer_id: string | null
          onboarding_status: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended'
          created_at: string
          updated_at: string
          connected_at: string | null
          bank_account_last4: string | null
          bank_account_country: string | null
          bank_account_type: string | null
          onboarding_link: string | null
          onboarding_link_expires_at: string | null
          charges_enabled: boolean
          payouts_enabled: boolean
          requirements_pending: Json
        }
        Insert: {
          id?: string
          store_owner_pubkey: string
          stripe_account_id: string
          stripe_customer_id?: string | null
          onboarding_status?: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended'
          created_at?: string
          updated_at?: string
          connected_at?: string | null
          bank_account_last4?: string | null
          bank_account_country?: string | null
          bank_account_type?: string | null
          onboarding_link?: string | null
          onboarding_link_expires_at?: string | null
          charges_enabled?: boolean
          payouts_enabled?: boolean
          requirements_pending?: Json
        }
        Update: {
          id?: string
          store_owner_pubkey?: string
          stripe_account_id?: string
          stripe_customer_id?: string | null
          onboarding_status?: 'pending' | 'active' | 'inactive' | 'rejected' | 'suspended'
          created_at?: string
          updated_at?: string
          connected_at?: string | null
          bank_account_last4?: string | null
          bank_account_country?: string | null
          bank_account_type?: string | null
          onboarding_link?: string | null
          onboarding_link_expires_at?: string | null
          charges_enabled?: boolean
          payouts_enabled?: boolean
          requirements_pending?: Json
        }
      }
      stripe_payouts: {
        Row: {
          id: string
          store_owner_pubkey: string
          store_owner_stripe_id: string
          stripe_payout_id: string
          amount: number
          currency: string
          status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'
          arrival_date: string | null
          created_at: string
          updated_at: string
          failure_reason: string | null
          automatic: boolean
          method: string | null
        }
        Insert: {
          id?: string
          store_owner_pubkey: string
          store_owner_stripe_id: string
          stripe_payout_id: string
          amount: number
          currency?: string
          status?: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'
          arrival_date?: string | null
          created_at?: string
          updated_at?: string
          failure_reason?: string | null
          automatic?: boolean
          method?: string | null
        }
        Update: {
          id?: string
          store_owner_pubkey?: string
          store_owner_stripe_id?: string
          stripe_payout_id?: string
          amount?: number
          currency?: string
          status?: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled'
          arrival_date?: string | null
          created_at?: string
          updated_at?: string
          failure_reason?: string | null
          automatic?: boolean
          method?: string | null
        }
      }
      stripe_webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          event_data: Json
          processed: boolean
          processed_at: string | null
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          event_data: Json
          processed?: boolean
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          event_data?: Json
          processed?: boolean
          processed_at?: string | null
          error_message?: string | null
          created_at?: string
        }
      }
      stripe_disputes: {
        Row: {
          id: string
          stripe_dispute_id: string
          payment_id: string
          store_owner_pubkey: string
          amount: number
          currency: string
          reason: string
          status: string
          created_at: string
          updated_at: string
          evidence_due_by: string | null
        }
        Insert: {
          id?: string
          stripe_dispute_id: string
          payment_id: string
          store_owner_pubkey: string
          amount: number
          currency?: string
          reason: string
          status?: string
          created_at?: string
          updated_at?: string
          evidence_due_by?: string | null
        }
        Update: {
          id?: string
          stripe_dispute_id?: string
          payment_id?: string
          store_owner_pubkey?: string
          amount?: number
          currency?: string
          reason?: string
          status?: string
          created_at?: string
          updated_at?: string
          evidence_due_by?: string | null
        }
      }
    }
    Views: {
      active_citizenship_registrations: {
        Row: {
          id: string | null
          citizenship_number_hash: string | null
          borrower_pubkey: string | null
          first_wallet_address: string | null
          registered_at: string | null
          status: string | null
          verified_at: string | null
          email: string | null
          full_name: string | null
          wallet_address: string | null
        }
      }
      pending_stripe_payments: {
        Row: {
          id: string | null
          credit_entry_id: string | null
          borrower_pubkey: string | null
          store_owner_pubkey: string | null
          amount: number | null
          currency: string | null
          status: string | null
          created_at: string | null
          borrower_name: string | null
          store_name: string | null
          credit_amount: number | null
          repayment_percentage: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
