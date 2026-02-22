-- Migration: add 'credit_overdue_daily' to reputation_events event_type CHECK constraint
-- Run this in Supabase SQL editor

ALTER TABLE reputation_events
  DROP CONSTRAINT IF EXISTS reputation_events_event_type_check;

ALTER TABLE reputation_events
  ADD CONSTRAINT reputation_events_event_type_check
  CHECK (event_type IN (
    'account_created',
    'citizenship_verified',
    'credit_accepted',
    'paid_early',
    'paid_on_time',
    'paid_late_minor',
    'paid_late_major',
    'paid_late_severe',
    'credit_overdue_weekly',
    'credit_overdue_daily',
    'milestone_first_credit',
    'milestone_five_credits'
  ));
