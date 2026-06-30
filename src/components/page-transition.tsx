import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  pageKey: string
  className?: string
  children: ReactNode
}

export function PageTransition({ pageKey, className, children }: PageTransitionProps) {
  return (
    <div key={pageKey} className={cn('page-enter', className)}>
      {children}
    </div>
  )
}

interface StaggerGroupProps {
  className?: string
  children: ReactNode
}

export function StaggerGroup({ className, children }: StaggerGroupProps) {
  return <div className={cn('stagger-group', className)}>{children}</div>
}

interface StaggerItemProps {
  index?: number
  className?: string
  children: ReactNode
}

export function StaggerItem({ index = 0, className, children }: StaggerItemProps) {
  const delayClass = index < 8 ? `stagger-${index + 1}` : 'stagger-8'
  return (
    <div className={cn('stagger-item', delayClass, className)}>
      {children}
    </div>
  )
}
