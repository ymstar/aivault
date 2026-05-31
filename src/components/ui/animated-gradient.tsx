'use client'

import { cn } from '@/lib/utils'

interface AnimatedGradientProps {
  className?: string
  children?: React.ReactNode
}

export function AnimatedGradient({ className, children }: AnimatedGradientProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 -z-10">
        <div className="absolute -left-1/4 -top-1/4 h-96 w-96 animate-pulse rounded-full bg-indigo-500/20 blur-3xl [animation-duration:8s]" />
        <div className="absolute -right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl [animation-duration:10s]" />
        <div className="absolute -bottom-1/4 left-1/3 h-96 w-96 animate-pulse rounded-full bg-blue-500/15 blur-3xl [animation-duration:12s]" />
      </div>
      {children}
    </div>
  )
}
