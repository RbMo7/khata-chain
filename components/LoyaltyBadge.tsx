'use client'

import React from 'react'
import { Award, ShieldCheck, Shield, Crown, Medal } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type BadgeTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

interface LoyaltyBadgeProps {
  tier: BadgeTier
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const TIER_CONFIG = {
  Bronze: {
    label: 'Building',
    icon: Shield,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100 dark:bg-slate-900',
    borderColor: 'border-slate-200 dark:border-slate-800',
    description: 'Starting your credit journey (300-549)'
  },
  Silver: {
    label: 'Fair',
    icon: Medal,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Demonstrating consistent repayment (550-699)'
  },
  Gold: {
    label: 'Good',
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Highly reliable and trusted borrower (700-849)'
  },
  Platinum: {
    label: 'Excellent',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Elite credit history with maximum trust (850-1000)'
  }
}

export function LoyaltyBadge({ tier, showLabel = true, size = 'md' }: LoyaltyBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.Bronze
  const Icon = config.icon

  const sizeClasses = {
    sm: 'h-6 w-6 p-1',
    md: 'h-10 w-10 p-2',
    lg: 'h-16 w-16 p-3'
  }

  const iconSizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-6 w-6',
    lg: 'h-10 w-10'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-2">
            <div className={`
              rounded-full border-2 flex items-center justify-center
              ${config.bgColor} ${config.borderColor} ${config.color}
              ${sizeClasses[size]}
              shadow-sm transition-transform hover:scale-110
            `}>
              <Icon className={iconSizeClasses[size]} />
            </div>
            {showLabel && (
              <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
                {tier}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px] text-center">
          <p className="font-bold">{tier} Status</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
