'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  ShieldCheck,
} from 'lucide-react'
import { useApi } from '@/hooks/use-api'
import { reputationApi } from '@/lib/api-client'
import { formatNPR, formatDateNP } from '@/lib/currency-utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// ---------------------------------------------------------------------------
// Tier helpers (mirrored from service – no server imports in client component)
// ---------------------------------------------------------------------------
function getReputationTier(score: number) {
  if (score >= 850) return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/40', borderColor: 'border-emerald-500/40', barColor: 'bg-emerald-500', min: 850, max: 1000 }
  if (score >= 700) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/40', borderColor: 'border-blue-500/40', barColor: 'bg-blue-500', min: 700, max: 849 }
  if (score >= 550) return { label: 'Fair', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/40', borderColor: 'border-amber-500/40', barColor: 'bg-amber-500', min: 550, max: 699 }
  return { label: 'Building', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-950/40', borderColor: 'border-red-500/40', barColor: 'bg-red-400', min: 300, max: 549 }
}

function scoreProgressPercent(score: number): number {
  return Math.round(((score - 300) / (1000 - 300)) * 100)
}

// ---------------------------------------------------------------------------
// Event icon helper
// ---------------------------------------------------------------------------
function EventIcon({ type }: { type: string }) {
  const iconClass = 'h-4 w-4'
  if (type.includes('early') || type.includes('on_time')) return <TrendingUp className={`${iconClass} text-emerald-500`} />
  if (type.includes('late') || type.includes('overdue')) return <TrendingDown className={`${iconClass} text-red-500`} />
  if (type.includes('milestone')) return <Award className={`${iconClass} text-amber-500`} />
  if (type.includes('citizenship')) return <ShieldCheck className={`${iconClass} text-blue-500`} />
  if (type.includes('accepted')) return <CheckCircle className={`${iconClass} text-primary`} />
  return <Clock className={`${iconClass} text-muted-foreground`} />
}

function scoreDeltaLabel(change: number) {
  if (change > 0) return <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-sm">+{change}</span>
  if (change < 0) return <span className="text-red-600 dark:text-red-400 font-semibold text-sm">{change}</span>
  return <span className="text-muted-foreground text-sm">0</span>
}

// ---------------------------------------------------------------------------
// ProjectionRow
// ---------------------------------------------------------------------------
function ProjectionRow({ scenario, scoreChange, projectedScore }: { scenario: string; scoreChange: number; projectedScore: number; description: string }) {
  const isGain = scoreChange >= 0
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{scenario}</span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {isGain ? '+' : ''}{scoreChange} pts
        </span>
        <span className="text-sm font-semibold tabular-nums w-12 text-right">{projectedScore}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ReputationCard() {
  const [showAllEvents, setShowAllEvents] = useState(false)

  const { data, loading, error } = useApi(() => reputationApi.getMy(), [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data?.data) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Unable to load reputation data. Please refresh.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const { reputation, events, projections } = data.data
  const tier = getReputationTier(reputation.reputation_score)
  const progressPct = scoreProgressPercent(reputation.reputation_score)
  const visibleEvents = showAllEvents ? events : events.slice(0, 5)

  // Total repaid (any finished payment event)
  const totalRepaid = (reputation.on_time_payments || 0) +
    (reputation.early_payments || 0) +
    (reputation.late_payments_minor || 0) +
    (reputation.late_payments_major || 0) +
    (reputation.late_payments_severe || 0)

  const onTimeRate = totalRepaid > 0
    ? Math.round(((reputation.on_time_payments + reputation.early_payments) / totalRepaid) * 100)
    : null

  return (
    <div className="space-y-4">
      {/* ── Score Overview Card ── */}
      <Card className={`border ${tier.borderColor} ${tier.bgColor}`}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Reputation Score</CardTitle>
              <CardDescription>Your credit history at a glance</CardDescription>
            </div>
            <Badge variant="secondary" className={`${tier.color} text-sm font-semibold`}>
              {tier.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <span className={`text-6xl font-extrabold tabular-nums ${tier.color}`}>
              {reputation.reputation_score}
            </span>
            <span className="text-muted-foreground mb-2">/ 1000</span>
          </div>

          {/* Progress bar spanning 300–1000 */}
          <div className="space-y-1">
            <Progress value={progressPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>300 · Building</span>
              <span>550 · Fair</span>
              <span>700 · Good</span>
              <span>1000 · Excellent</span>
            </div>
          </div>

          {/* Quick stat pills */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="text-center p-3 rounded-lg bg-background/60 border border-border">
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {(reputation.on_time_payments || 0) + (reputation.early_payments || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">On-time</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/60 border border-border">
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {(reputation.late_payments_minor || 0) + (reputation.late_payments_major || 0) + (reputation.late_payments_severe || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Late</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/60 border border-border">
              <div className="text-xl font-bold text-primary">
                {onTimeRate !== null ? `${onTimeRate}%` : '—'}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Success rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs: History + Projections ── */}
      <Tabs defaultValue="projections" className="space-y-3">
        <TabsList className="w-full">
          <TabsTrigger value="projections" className="flex-1">
            <Zap className="h-3 w-3 mr-1" />
            Score Projections
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <Clock className="h-3 w-3 mr-1" />
            History
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex-1">
            <Star className="h-3 w-3 mr-1" />
            Breakdown
          </TabsTrigger>
        </TabsList>

        {/* ── Projections tab ── */}
        <TabsContent value="projections" className="space-y-3">
          {projections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No active credits to project</p>
                <p className="text-xs mt-1">Accept credits to see how payments affect your score</p>
              </CardContent>
            </Card>
          ) : (
            projections.map((proj: any) => (
              <Card key={proj.credit_id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">
                    {proj.description || 'Credit entry'} — {formatNPR(proj.credit_amount)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Due {formatDateNP(proj.due_date)} · Paying changes your score from{' '}
                    <strong>{reputation.reputation_score}</strong> to:
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {proj.scenarios.map((s: any) => (
                    <ProjectionRow key={s.scenario} {...s} />
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── History tab ── */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Score History</CardTitle>
              <CardDescription className="text-xs">
                Every event that affected your reputation
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events yet</p>
              ) : (
                <div className="space-y-0">
                  {visibleEvents.map((ev: any, i: number) => (
                    <div key={ev.id} className={`flex items-start gap-3 py-3 ${i < visibleEvents.length - 1 ? 'border-b border-border' : ''}`}>
                      <div className="mt-0.5"><EventIcon type={ev.event_type} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{ev.description || ev.event_type}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(ev.created_at).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                          &nbsp;·&nbsp;{ev.score_before} → {ev.score_after}
                        </p>
                      </div>
                      <div className="shrink-0">{scoreDeltaLabel(ev.score_change)}</div>
                    </div>
                  ))}
                  {events.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-muted-foreground"
                      onClick={() => setShowAllEvents(!showAllEvents)}
                    >
                      {showAllEvents ? (
                        <><ChevronUp className="h-3 w-3 mr-1" /> Show less</>
                      ) : (
                        <><ChevronDown className="h-3 w-3 mr-1" /> Show {events.length - 5} more events</>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Breakdown tab ── */}
        <TabsContent value="breakdown">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">What builds your score</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Pay >7 days early', value: '+40 pts', good: true },
                  { label: 'Pay 1–7 days early', value: '+25 pts', good: true },
                  { label: 'Pay on time', value: '+20 pts', good: true },
                  { label: 'Accept a credit', value: '+5 pts', good: true },
                  { label: 'Milestone: 1st repaid', value: '+30 pts', good: true },
                  { label: 'Milestone: 5 repaid', value: '+50 pts', good: true },
                  { label: 'Citizenship verified', value: '+50 pts (once)', good: true },
                  { label: '1–7 days late', value: '−15 pts', good: false },
                  { label: '8–30 days late', value: '−40 pts', good: false },
                  { label: '30+ days late', value: '−80 pts', good: false },
                  { label: 'Weekly overdue', value: '−10 pts/wk', good: false },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-xs font-semibold ml-2 shrink-0 ${item.good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Score range: 300 (minimum) – 1000 (maximum). New borrowers start at 600.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
