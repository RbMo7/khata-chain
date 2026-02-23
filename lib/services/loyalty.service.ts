/**
 * Loyalty Service
 * Manages reward milestones, SOL payouts, and badge tiering.
 */

import { supabaseAdmin } from '../supabase/server'
import { 
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { getPlatformKeypair } from '../solana/anchor-server'

// ---------------------------------------------------------------------------
// Constants & Config
// ---------------------------------------------------------------------------

const REWARD_CONFIGS = {
  on_time_1: {
    label: 'First On-Time Payment',
    milestone: 1,
    rewardSol: 0.001,
    description: 'Welcome bonus for your first successful repayment!'
  },
  on_time_5: {
    label: 'High Consistency (5)',
    milestone: 5,
    rewardSol: 0.005,
    description: 'You have repaid 5 credits on time. Great job!'
  },
  on_time_10: {
    label: 'Trusted Borrower (10)',
    milestone: 10,
    rewardSol: 0.01,
    description: 'Significant milestone: 10 on-time repayments.'
  },
  score_800: {
    label: 'Elite Reputation',
    milestone: 800, // score threshold
    rewardSol: 0.015,
    description: 'You reached an Elite reputation score of 800!'
  }
}

// Minimum credit amount in SOL to qualify for loyalty rewards (prevents spam)
const MIN_QUALIFYING_AMOUNT_SOL = 0.01

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export interface BorrowerLoyaltyData {
  tier: BadgeTier
  totalRewardsSol: number
  nextMilestone: string
  onTimePayments: number
  reputationScore: number
}

// ---------------------------------------------------------------------------
// SOL Distribution (Server-side)
// ---------------------------------------------------------------------------

/**
 * Sends SOL from the platform wallet to a borrower as a reward.
 */
async function distributeSolReward(
  recipientAddress: string,
  amountSol: number,
  milestoneKey: string
): Promise<{ signature: string; error?: string }> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.testnet.solana.com',
      'confirmed'
    )
    
    const platformKeypair = getPlatformKeypair()
    const recipient = new PublicKey(recipientAddress)
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: platformKeypair.publicKey,
        toPubkey: recipient,
        lamports,
      })
    )

    // Optional: Add a memo to the reward transaction
    // tx.add(new TransactionInstruction({...}))

    const signature = await sendAndConfirmTransaction(
      connection, 
      tx, 
      [platformKeypair],
      { commitment: 'confirmed' }
    )

    return { signature }
  } catch (err: any) {
    console.error(`[loyalty] Reward distribution failed for ${milestoneKey}:`, err?.message)
    return { signature: '', error: err?.message || 'Transaction failed' }
  }
}

// ---------------------------------------------------------------------------
// Milestone Logic
// ---------------------------------------------------------------------------

/**
 * Evaluates milestones after a repayment and triggers rewards.
 */
export async function checkRepaymentMilestones(
  borrowerPubkey: string,
  onTimeCount: number,
  currentScore: number,
  paidAmountSol: number
): Promise<void> {
  // Guard: Only reward if credit amount is significant
  if (paidAmountSol < MIN_QUALIFYING_AMOUNT_SOL) {
    console.log(`[loyalty] Repayment too small (${paidAmountSol} SOL) for reward eligibility.`)
    return
  }

  const milestonesToCheck = [
    { key: 'on_time_1', condition: onTimeCount === 1 },
    { key: 'on_time_5', condition: onTimeCount === 5 },
    { key: 'on_time_10', condition: onTimeCount === 10 },
    { key: 'score_800', condition: currentScore >= 800 }
  ]

  for (const m of milestonesToCheck) {
    if (m.condition) {
      await processMilestoneReward(borrowerPubkey, m.key)
    }
  }
}

/**
 * Checks DB for existing reward, then distributes if new.
 */
async function processMilestoneReward(
  borrowerPubkey: string,
  milestoneKey: string
): Promise<void> {
  const config = (REWARD_CONFIGS as any)[milestoneKey]
  if (!config) return

  try {
    // 1. Check if already rewarded (atomic-ish check via unique constraint in DB)
    const { data: existing } = await supabaseAdmin
      .from('borrower_rewards')
      .select('id, status')
      .eq('borrower_pubkey', borrowerPubkey)
      .eq('milestone_key', milestoneKey)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'completed') return
      // If it failed or is pending, we might retry here, but for now we exit
      return
    }

    // 2. Create pending reward record
    const { data: rewardRecord, error: insertError } = await supabaseAdmin
      .from('borrower_rewards')
      .insert({
        borrower_pubkey: borrowerPubkey,
        reward_type: milestoneKey.startsWith('on_time') ? 'repayment_milestone' : 'score_milestone',
        milestone_key: milestoneKey,
        amount_sol: config.rewardSol,
        status: 'processing'
      })
      .select()
      .single()

    if (insertError) {
      // Likely hit the unique constraint race condition, which is fine
      return
    }

    // 3. Execute On-Chain Transfer
    const { signature, error } = await distributeSolReward(
      borrowerPubkey,
      config.rewardSol,
      milestoneKey
    )

    if (signature) {
      // 4. Update reward status and increment total in reputation
      await supabaseAdmin
        .from('borrower_rewards')
        .update({ status: 'completed', tx_signature: signature, updated_at: new Date().toISOString() })
        .eq('id', rewardRecord.id)

      // Increment total rewards in reputation table
      const { data: rep } = await supabaseAdmin
        .from('borrower_reputation')
        .select('total_rewards_earned_sol')
        .eq('borrower_pubkey', borrowerPubkey)
        .single()
      
      const newTotal = Number(rep?.total_rewards_earned_sol || 0) + config.rewardSol

      await supabaseAdmin
        .from('borrower_reputation')
        .update({ total_rewards_earned_sol: newTotal })
        .eq('borrower_pubkey', borrowerPubkey)

      console.log(`[loyalty] Successfully distributed ${config.rewardSol} SOL to ${borrowerPubkey} for ${milestoneKey}`)
    } else {
      // Log failure
      await supabaseAdmin
        .from('borrower_rewards')
        .update({ status: 'failed', error_message: error })
        .eq('id', rewardRecord.id)
    }

  } catch (err) {
    console.error('[loyalty] processMilestoneReward error:', err)
  }
}

// ---------------------------------------------------------------------------
// Badge Mapping
// ---------------------------------------------------------------------------

/**
 * Deterministically returns the badge tier based on score.
 */
export function getBadgeTier(score: number): BadgeTier {
  if (score >= 850) return 'Platinum'
  if (score >= 700) return 'Gold'
  if (score >= 550) return 'Silver'
  return 'Bronze'
}

/**
 * Gets all rewards for a borrower.
 */
export async function getBorrowerRewards(borrowerPubkey: string) {
  const { data, error } = await supabaseAdmin
    .from('borrower_rewards')
    .select('*')
    .eq('borrower_pubkey', borrowerPubkey)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}
