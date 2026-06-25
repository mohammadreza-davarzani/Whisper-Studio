import type { ComponentType, ReactNode } from 'react'
import { Star } from 'lucide-react'

import { cn } from '@/lib/utils'

interface BannerProps {
  className?: string
  detail: ReactNode
  emphasis: ReactNode
  icon?: ComponentType<{ className?: string }>
}

export function Banner({
  className,
  detail,
  emphasis,
  icon: Icon = Star
}: BannerProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/5 px-4 py-3',
        className
      )}
    >
      <Icon className="w-4 h-4 shrink-0 text-warning" />
      <p className="text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">{emphasis}</span> {detail}
      </p>
    </div>
  )
}
