'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, ShieldAlert, TrendingUp, Coins } from 'lucide-react'
import { reputationApi } from '@/lib/api-client'
import { LoyaltyBadge, BadgeTier } from './LoyaltyBadge'

interface ReputationBadgeProps {
  borrowerPubkey: string
}

interface ReputationData {
  reputation_score: number
  tier: string
  badge_tier: BadgeTier
  total_rewards_earned_sol: number
  warning: string | null
  is_low_score: boolean
  is_critical_score: boolean
  stats: {
    total_credits: number
    on_time_payments: number
    early_payments: number
    late_payments_minor: number
    late_payments_major: number
    late_payments_severe: number
  }
}

function getTierStyles(tier: string) {
  switch (tier) {
    case 'Excellent': return { color: 'text-emerald-600 dark:text-emerald-400', barColor: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-500/30' }
    case 'Good':      return { color: 'text-blue-600 dark:text-blue-400',    barColor: 'bg-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/40',    border: 'border-blue-500/30'    }
    case 'Fair':      return { color: 'text-amber-600 dark:text-amber-400',  barColor: 'bg-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40',  border: 'border-amber-500/30'  }
    default:          return { color: 'text-red-600 dark:text-red-400',       barColor: 'bg-red-400',     bg: 'bg-red-50 dark:bg-red-950/40',       border: 'border-red-500/30'     }
  }
}

function scoreProgressPercent(score: number): number {
  return Math.round(((score - 300) / (1000 - 300)) * 100)
}

export function ReputationBadge({ borrowerPubkey }: ReputationBadgeProps) {
  const [data, setData] = useState<ReputationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    if (!borrowerPubkey) return

    let cancelled = false
    setLoading(true)
    setFetchError(false)

    reputationApi.getPublic(borrowerPubkey)
      .then((res: any) => {
        if (!cancelled && res?.data) setData(res.data)
      })
      .catch(() => {
        if (!cancelled) setFetchError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [borrowerPubkey])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-full" />
      </div>
    )
  }

  if (fetchError || !data) {
    return (
      <p className="text-sm text-muted-foreground italic">Reputation data unavailable</p>
    )
  }

  const styles = getTierStyles(data.tier)
  const progressPct = scoreProgressPercent(data.reputation_score)
  const goodPayments = (data.stats.on_time_payments || 0) + (data.stats.early_payments || 0)
  const latePayments =
    (data.stats.late_payments_minor || 0) +
    (data.stats.late_payments_major || 0) +
    (data.stats.late_payments_severe || 0)

  return (
    <div className="space-y-3">
      {/* Score + tier */}
      <div className={`rounded-lg border p-4 ${styles.bg} ${styles.border}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-3">
            <LoyaltyBadge tier={data.badge_tier} size="md" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-3xl font-extrabold tabular-nums ${styles.color}`}>
                  {data.reputation_score}
                </span>
                <span className="text-muted-foreground text-sm">/ 1000</span>
              </div>
              <Badge variant="secondary" className={`${styles.color} font-semibold`}>
                {data.tier}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 justify-end">
              <Coins className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">{data.total_rewards_earned_sol.toFixed(4)} SOL</span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Total Earned</p>
          </div>
        </div>

        <Progress value={progressPct} className="h-2 mb-2" />

        {/* Mini stats */}
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ {goodPayments} on-time
          </span>
          {latePayments > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              ✗ {latePayments} late
            </span>
          )}
          <span>{data.stats.total_credits} total credits</span>
        </div>
      </div>

      {/* Warning alerts */}
      {data.is_critical_score && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription className="text-sm font-medium">
            {data.warning}
          </AlertDescription>
        </Alert>
      )}
      {data.is_low_score && !data.is_critical_score && (
        <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm font-medium">
            {data.warning}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
