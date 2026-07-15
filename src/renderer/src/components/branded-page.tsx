import type { ReactNode } from 'react'
import { Heart } from 'lucide-react'
import flagUrl from '../../../../resources/National_flag_of_Iran.svg'
import { cn } from '@/lib/utils'

interface BrandedBackdropProps {
  className?: string
}

export function BrandedBackdrop({ className }: BrandedBackdropProps): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 splash-background', className)}
    />
  )
}

interface BrandFooterProps {
  className?: string
  version?: string
}

export function BrandFooter({ className, version }: BrandFooterProps): JSX.Element {
  return (
    <footer className={cn('text-center text-[10px] text-muted-foreground', className)}>
      <p>
        Whisper Studio is free and open source software. {version && <span>v{version}</span>}
      </p>
      <p className="mt-1 flex items-center justify-center gap-1">
        Built with <Heart className="h-3 w-3 fill-destructive text-destructive" /> under the same
        sky.
        <img src={flagUrl} className="h-3 w-3" alt="" />
      </p>
    </footer>
  )
}

interface BrandedPageProps {
  children: ReactNode
  className?: string
  contentClassName?: string
  version?: string
}

export function BrandedPage({
  children,
  className,
  contentClassName,
  version
}: BrandedPageProps): JSX.Element {
  return (
    <div className={cn('relative min-h-full overflow-hidden bg-background', className)}>
      <BrandedBackdrop />
      <div className="relative z-10 flex min-h-full flex-col">
        <div className={cn('flex-1', contentClassName)}>{children}</div>
        <BrandFooter className="mt-auto shrink-0 px-6 pb-4 pt-2" version={version} />
      </div>
    </div>
  )
}
