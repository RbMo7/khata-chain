'use client'

import React from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronRight, 
  Coins, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  ArrowLeft,
  Zap,
  Star,
  ShieldCheck,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import { reputationApi, borrowerApi } from '@/lib/api-client'
import { LoyaltyBadge } from '@/components/LoyaltyBadge'

const REWARD_ROADMAP = [
  {
    key: 'on_time_1',
    label: 'Welcome Bonus',
    milestone: 1,
    type: 'payment',
    rewardSol: 0.001,
    description: 'Complete your very first on-time repayment.'
  },
  {
    key: 'on_time_5',
    label: 'Consistency King',
    milestone: 5,
    type: 'payment',
    rewardSol: 0.005,
    description: 'Build a streak of 5 on-time repayments.'
  },
  {
    key: 'on_time_10',
    label: 'Trusted Legend',
    milestone: 10,
    type: 'payment',
    rewardSol: 0.01,
    description: 'Reach double digits with 10 on-time repayments.'
  },
  {
    key: 'score_800',
    label: 'Elite Reputation',
    milestone: 800,
    type: 'score',
    rewardSol: 0.015,
    description: 'Reach a reputation score of 800 or higher.'
  }
]

export default function LoyaltyRoadmapPage() {
  const { data: repData, loading: repLoading } = useApi(() => reputationApi.getMy(), [])
  const { data: statsData, loading: statsLoading } = useApi(() => borrowerApi.getStats(), [])

  const reputation = repData?.data?.reputation
  const currentScore = reputation?.reputation_score || 0
  const onTimeCount = (reputation?.on_time_payments || 0) + (reputation?.early_payments || 0)
  const totalEarned = Number(statsData?.data?.totalRewardsEarned || 0)

  const isCompleted = (item: typeof REWARD_ROADMAP[0]) => {
    if (item.type === 'payment') return onTimeCount >= item.milestone
    if (item.type === 'score') return currentScore >= item.milestone
    return false
  }

  const getProgress = (item: typeof REWARD_ROADMAP[0]) => {
    if (isCompleted(item)) return 100
    if (item.type === 'payment') return Math.min(100, (onTimeCount / item.milestone) * 100)
    if (item.type === 'score') {
      // Scale from 300 to milestone
      const progress = ((currentScore - 300) / (item.milestone - 300)) * 100
      return Math.max(0, Math.min(100, progress))
    }
    return 0
  }

  return (
    <DashboardLayout userType="borrower">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/borrower/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loyalty Rewards</h1>
            <p className="text-muted-foreground">Your roadmap to earning SOL by building trust</p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Coins className="h-8 w-8 text-amber-600 mb-1" />
                <span className="text-2xl font-bold">{totalEarned.toFixed(4)} SOL</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold">Total SOL Earned</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <Trophy className="h-8 w-8 text-primary mb-1" />
                <span className="text-2xl font-bold">{onTimeCount}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold">On-Time Payments</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-2">
                <TrendingUp className="h-8 w-8 text-emerald-600 mb-1" />
                <span className="text-2xl font-bold">{currentScore}</span>
                <span className="text-xs text-muted-foreground uppercase font-semibold">Trust Score</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Earning Roadmap
          </h2>
          
          <div className="space-y-4 relative">
            {/* Vertical connector line */}
            <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-muted hidden md:block" />

            {REWARD_ROADMAP.map((item, index) => {
              const completed = isCompleted(item)
              const progress = getProgress(item)

              return (
                <Card key={item.key} className={`relative overflow-hidden ${completed ? 'border-emerald-500/30 bg-emerald-50/5' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                      {/* Milestone Icon/Number */}
                      <div className={`
                        shrink-0 h-14 w-14 rounded-full border-4 flex items-center justify-center z-10
                        ${completed ? 'bg-emerald-500 border-emerald-100 text-white' : 'bg-background border-muted text-muted-foreground'}
                      `}>
                        {completed ? <CheckCircle2 className="h-8 w-8" /> : <span className="text-xl font-bold">{index + 1}</span>}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              {item.label}
                              {completed && <Badge className="bg-emerald-500 hover:bg-emerald-600">Claimed</Badge>}
                            </h3>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
                            <Coins className="h-4 w-4 text-amber-600" />
                            <span className="font-bold text-amber-700 dark:text-amber-400">+{item.rewardSol} SOL</span>
                          </div>
                        </div>

                        {/* Progress */}
                        {!completed && (
                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">
                                {item.type === 'payment' 
                                  ? `${onTimeCount} / ${item.milestone} payments` 
                                  : `Score: ${currentScore} / ${item.milestone}`}
                              </span>
                              <span className="font-medium text-primary">{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tips / Info */}
        <Card className="bg-slate-50 dark:bg-slate-900 border-none shadow-none">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              How to ensure your rewards?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p>• Only credits above 0.01 SOL qualify for loyalty bonuses.</p>
            <p>• Payments must be made on-time or early to count towards milestones.</p>
            <p>• Rewards are sent automatically to your connected wallet address.</p>
            <p>• Fraudulent or suspicious activity will result in disqualification from the loyalty program.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
