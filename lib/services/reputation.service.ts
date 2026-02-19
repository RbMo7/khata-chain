/**
 * Reputation Service
 * Manages borrower reputation scores based on payment behaviour.
 *
 * Score range  : 300 – 1000
 * Default      : 600  (new borrower)
 *
 * Tier thresholds
 *   850+  → Excellent
 *   700 – 849 → Good
 *   550 – 699 → Fair
 *   300 – 549 → Building
 *
 * Event deltas (clamped to keep score within 300–1000)
 *   account_created          :  0  (row initialised)
 *   citizenship_verified     : +50 (one-time)
 *   credit_accepted          :  +5
 *   paid_early (>7 days)     : +40
 *   paid_early (1-7 days)    : +25
 *   paid_on_time             : +20
 *   paid_late_minor (1-7d)   : -15
 *   paid_late_major (8-30d)  : -40
 *   paid_late_severe (>30d)  : -80
 *   credit_overdue_weekly    : -10 (triggers weekly while credit is overdue)
 *   milestone_first_credit   : +30
 *   milestone_five_credits   : +50
 */

import { supabaseAdmin } from '../supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReputationEventType =
  | 'account_created'
  | 'citizenship_verified'
  | 'credit_accepted'
  | 'paid_early'
  | 'paid_on_time'
  | 'paid_late_minor'
  | 'paid_late_major'
  | 'paid_late_severe'
  | 'credit_overdue_weekly'
  | 'milestone_first_credit'
  | 'milestone_five_credits'

export interface ReputationRecord {
  id: string
  borrower_pubkey: string
  reputation_score: number
  total_credits: number
  on_time_payments: number
  early_payments: number
  late_payments_minor: number
  late_payments_major: number
  late_payments_severe: number
  overdue_credits: number
  avg_payment_offset_days: number
  citizenship_bonus_applied: boolean
  first_credit_bonus_applied: boolean
  five_credits_bonus_applied: boolean
  created_at: string
  updated_at: string
}

export interface ReputationEvent {
  id: string
  borrower_pubkey: string
  credit_entry_id: string | null
  event_type: ReputationEventType
  score_before: number
  score_change: number
  score_after: number
  description: string | null
  payment_offset_days: number | null
  created_at: string
}

export interface ReputationTier {
  label: string
  color: string        // Tailwind text color class
  bgColor: string      // Tailwind bg color class
  borderColor: string  // Tailwind border class
  min: number
  max: number
}

export interface ProjectedScoreItem {
  scenario: string
  scoreChange: number
  projectedScore: number
  description: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORE_MIN = 300
const SCORE_MAX = 1000
const SCORE_DEFAULT = 600

const SCORE_DELTAS: Record<string, number> = {
  account_created: 0,
  citizenship_verified: 50,
  credit_accepted: 5,
  paid_early_major: 40,   // > 7 days early
  paid_early_minor: 25,   // 1–7 days early
  paid_on_time: 20,
  paid_late_minor: -15,   // 1–7 days late
  paid_late_major: -40,   // 8–30 days late
  paid_late_severe: -80,  // > 30 days late
  credit_overdue_weekly: -10,
  milestone_first_credit: 30,
  milestone_five_credits: 50,
}

// ---------------------------------------------------------------------------
// Tier helper
// ---------------------------------------------------------------------------

export function getReputationTier(score: number): ReputationTier {
  if (score >= 850) return {
    label: 'Excellent', min: 850, max: 1000,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-500/40',
  }
  if (score >= 700) return {
    label: 'Good', min: 700, max: 849,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-500/40',
  }
  if (score >= 550) return {
    label: 'Fair', min: 550, max: 699,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-500/40',
  }
  return {
    label: 'Building', min: 300, max: 549,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    borderColor: 'border-red-500/40',
  }
}

export function isLowScore(score: number): boolean {
  return score < 550
}

export function isCriticalScore(score: number): boolean {
  return score < 400
}

// ---------------------------------------------------------------------------
// Clamp helper
// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, value))
}

// ---------------------------------------------------------------------------
// init / get
// ---------------------------------------------------------------------------

/**
 * Ensure a reputation row exists for the borrower.
 * Safe to call multiple times – idempotent.
 */
export async function initReputationIfNeeded(
  borrowerPubkey: string
): Promise<ReputationRecord | null> {
  try {
    const { data: existing } = await supabaseAdmin
      .from('borrower_reputation')
      .select('*')
      .eq('borrower_pubkey', borrowerPubkey)
      .single()

    if (existing) return existing as ReputationRecord

    // Create a fresh row
    const { data, error } = await supabaseAdmin
      .from('borrower_reputation')
      .insert({ borrower_pubkey: borrowerPubkey, reputation_score: SCORE_DEFAULT })
      .select()
      .single()

    if (error) {
      console.error('initReputation insert error:', error)
      return null
    }

    // Log account_created event
    await supabaseAdmin.from('reputation_events').insert({
      borrower_pubkey: borrowerPubkey,
      event_type: 'account_created',
      score_before: SCORE_DEFAULT,
      score_change: 0,
      score_after: SCORE_DEFAULT,
      description: 'Account created – starting reputation score',
    })

    return data as ReputationRecord
  } catch (err) {
    console.error('initReputationIfNeeded error:', err)
    return null
  }
}

/**
 * Fetch the current reputation record for a borrower.
 */
export async function getReputation(
  borrowerPubkey: string
): Promise<ReputationRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('borrower_reputation')
      .select('*')
      .eq('borrower_pubkey', borrowerPubkey)
      .single()

    if (error) return null
    return data as ReputationRecord
  } catch {
    return null
  }
}

/**
 * Fetch recent reputation events (newest first).
 */
export async function getReputationEvents(
  borrowerPubkey: string,
  limit = 20
): Promise<ReputationEvent[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('reputation_events')
      .select('*')
      .eq('borrower_pubkey', borrowerPubkey)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return (data as ReputationEvent[]) || []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Core delta applier
// ---------------------------------------------------------------------------

async function applyDelta(
  borrowerPubkey: string,
  delta: number,
  eventType: ReputationEventType,
  description: string,
  creditEntryId?: string,
  paymentOffsetDays?: number,
  counterUpdates?: Record<string, any>
): Promise<ReputationRecord | null> {
  try {
    // Always init first (safe if already exists)
    const current = await initReputationIfNeeded(borrowerPubkey)
    if (!current) return null

    const scoreBefore = current.reputation_score
    const scoreAfter = clamp(scoreBefore + delta)

    // Update reputation row
    const updates: Record<string, any> = {
      reputation_score: scoreAfter,
      updated_at: new Date().toISOString(),
      ...counterUpdates,
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('borrower_reputation')
      .update(updates)
      .eq('borrower_pubkey', borrowerPubkey)
      .select()
      .single()

    if (updateErr) {
      console.error('applyDelta update error:', updateErr)
      return null
    }

    // Log event
    const eventInsert: any = {
      borrower_pubkey: borrowerPubkey,
      event_type: eventType,
      score_before: scoreBefore,
      score_change: scoreAfter - scoreBefore, // actual (after clamping)
      score_after: scoreAfter,
      description,
    }
    if (creditEntryId) eventInsert.credit_entry_id = creditEntryId
    if (paymentOffsetDays !== undefined) eventInsert.payment_offset_days = paymentOffsetDays

    await supabaseAdmin.from('reputation_events').insert(eventInsert)

    return updated as ReputationRecord
  } catch (err) {
    console.error('applyDelta error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Public event helpers
// ---------------------------------------------------------------------------

/**
 * Call when a new borrower account is created.
 */
export async function onAccountCreated(borrowerPubkey: string) {
  return initReputationIfNeeded(borrowerPubkey)
}

/**
 * Call when borrower completes citizenship verification.
 * Idempotent – bonus only applied once.
 */
export async function onCitizenshipVerified(borrowerPubkey: string) {
  const current = await initReputationIfNeeded(borrowerPubkey)
  if (!current || current.citizenship_bonus_applied) return current

  return applyDelta(
    borrowerPubkey,
    SCORE_DELTAS.citizenship_verified,
    'citizenship_verified',
    'Citizenship verified – identity confirmed',
    undefined,
    undefined,
    { citizenship_bonus_applied: true }
  )
}

/**
 * Call when a borrower accepts (approves) a credit request.
 */
export async function onCreditAccepted(
  borrowerPubkey: string,
  creditEntryId: string
) {
  const current = await initReputationIfNeeded(borrowerPubkey)
  if (!current) return null

  return applyDelta(
    borrowerPubkey,
    SCORE_DELTAS.credit_accepted,
    'credit_accepted',
    'Accepted a new credit request',
    creditEntryId,
    undefined,
    { total_credits: (current.total_credits || 0) + 1 }
  )
}

/**
 * Call when a credit is marked as completed / repaid.
 * @param dueDateIso  ISO string of the credit's due date
 * @param paidAtIso   ISO string of when it was actually paid
 */
export async function onCreditRepaid(
  borrowerPubkey: string,
  creditEntryId: string,
  dueDateIso: string,
  paidAtIso: string
) {
  const current = await initReputationIfNeeded(borrowerPubkey)
  if (!current) return null

  const dueDate = new Date(dueDateIso)
  const paidAt = new Date(paidAtIso)
  const offsetDays = Math.round(
    (paidAt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  ) // negative = paid early, positive = paid late

  let eventType: ReputationEventType
  let deltaKey: string
  let description: string
  let counterKey: string

  if (offsetDays < -7) {
    eventType = 'paid_early'
    deltaKey = 'paid_early_major'
    description = `Paid ${Math.abs(offsetDays)} days early – excellent!`
    counterKey = 'early_payments'
  } else if (offsetDays < 0) {
    eventType = 'paid_early'
    deltaKey = 'paid_early_minor'
    description = `Paid ${Math.abs(offsetDays)} day${Math.abs(offsetDays) === 1 ? '' : 's'} early`
    counterKey = 'early_payments'
  } else if (offsetDays <= 1) {
    eventType = 'paid_on_time'
    deltaKey = 'paid_on_time'
    description = 'Paid on time'
    counterKey = 'on_time_payments'
  } else if (offsetDays <= 7) {
    eventType = 'paid_late_minor'
    deltaKey = 'paid_late_minor'
    description = `Paid ${offsetDays} days late`
    counterKey = 'late_payments_minor'
  } else if (offsetDays <= 30) {
    eventType = 'paid_late_major'
    deltaKey = 'paid_late_major'
    description = `Paid ${offsetDays} days late`
    counterKey = 'late_payments_major'
  } else {
    eventType = 'paid_late_severe'
    deltaKey = 'paid_late_severe'
    description = `Paid ${offsetDays} days late – severely overdue`
    counterKey = 'late_payments_severe'
  }

  const counterUpdates: Record<string, any> = {
    [counterKey]: ((current as any)[counterKey] || 0) + 1,
    avg_payment_offset_days: calculateNewAvgOffset(
      current.avg_payment_offset_days,
      current.on_time_payments + current.early_payments +
        current.late_payments_minor + current.late_payments_major +
        current.late_payments_severe,
      offsetDays
    ),
  }

  const updatedRecord = await applyDelta(
    borrowerPubkey,
    SCORE_DELTAS[deltaKey],
    eventType,
    description,
    creditEntryId,
    offsetDays,
    counterUpdates
  )

  // Check for milestones (re-fetch to get fresh counters)
  const fresh = updatedRecord || current
  const totalCompleted =
    (fresh.on_time_payments || 0) +
    (fresh.early_payments || 0) +
    (fresh.late_payments_minor || 0) +
    (fresh.late_payments_major || 0) +
    (fresh.late_payments_severe || 0)

  if (totalCompleted === 1 && !fresh.first_credit_bonus_applied) {
    await applyDelta(
      borrowerPubkey,
      SCORE_DELTAS.milestone_first_credit,
      'milestone_first_credit',
      'Milestone: First credit repaid!',
      creditEntryId,
      undefined,
      { first_credit_bonus_applied: true }
    )
  } else if (totalCompleted === 5 && !fresh.five_credits_bonus_applied) {
    await applyDelta(
      borrowerPubkey,
      SCORE_DELTAS.milestone_five_credits,
      'milestone_five_credits',
      'Milestone: 5 credits repaid!',
      creditEntryId,
      undefined,
      { five_credits_bonus_applied: true }
    )
  }

  return updatedRecord
}

/**
 * Call weekly for each overdue credit (cron / scheduled function).
 */
export async function onCreditOverdueWeekly(
  borrowerPubkey: string,
  creditEntryId: string
) {
  const current = await initReputationIfNeeded(borrowerPubkey)
  if (!current) return null

  return applyDelta(
    borrowerPubkey,
    SCORE_DELTAS.credit_overdue_weekly,
    'credit_overdue_weekly',
    'Credit still overdue – weekly penalty',
    creditEntryId,
    undefined,
    { overdue_credits: (current.overdue_credits || 0) + 1 }
  )
}

// ---------------------------------------------------------------------------
// Projected score calculator (no DB writes)
// ---------------------------------------------------------------------------

/**
 * Returns projected scores for different payment scenarios on a given credit.
 * Used in the borrower UI to show "what you'll earn if you pay on time".
 */
export function calculateProjectedScores(
  currentScore: number,
  dueDateIso: string
): ProjectedScoreItem[] {
  const dueDate = new Date(dueDateIso)
  const today = new Date()
  const daysUntilDue = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )

  const scenarios: ProjectedScoreItem[] = []

  // Early (>7 days before due)
  if (daysUntilDue > 7) {
    const change = SCORE_DELTAS.paid_early_major
    scenarios.push({
      scenario: 'Pay right now',
      scoreChange: change,
      projectedScore: clamp(currentScore + change),
      description: `More than 7 days early – maximum bonus`,
    })
  }

  // Early (1–7 days before due)
  if (daysUntilDue >= 1) {
    const change = SCORE_DELTAS.paid_early_minor
    scenarios.push({
      scenario: 'Pay a few days early',
      scoreChange: change,
      projectedScore: clamp(currentScore + change),
      description: `1–7 days before due date`,
    })
  }

  // On time
  const changeOnTime = SCORE_DELTAS.paid_on_time
  scenarios.push({
    scenario: 'Pay on due date',
    scoreChange: changeOnTime,
    projectedScore: clamp(currentScore + changeOnTime),
    description: 'Within 1 day of due date',
  })

  // Minor late
  const changeLateMinor = SCORE_DELTAS.paid_late_minor
  scenarios.push({
    scenario: 'Pay 1–7 days late',
    scoreChange: changeLateMinor,
    projectedScore: clamp(currentScore + changeLateMinor),
    description: 'Small penalty for minor delay',
  })

  // Major late
  const changeLateMajor = SCORE_DELTAS.paid_late_major
  scenarios.push({
    scenario: 'Pay 8–30 days late',
    scoreChange: changeLateMajor,
    projectedScore: clamp(currentScore + changeLateMajor),
    description: 'Significant penalty',
  })

  // Severe late
  const changeLateSevere = SCORE_DELTAS.paid_late_severe
  scenarios.push({
    scenario: 'Pay 30+ days late',
    scoreChange: changeLateSevere,
    projectedScore: clamp(currentScore + changeLateSevere),
    description: 'Severe penalty – avoid this!',
  })

  return scenarios
}

// ---------------------------------------------------------------------------
// Internal util
// ---------------------------------------------------------------------------

function calculateNewAvgOffset(
  currentAvg: number,
  currentCount: number,
  newValue: number
): number {
  if (currentCount === 0) return newValue
  return (currentAvg * currentCount + newValue) / (currentCount + 1)
}
