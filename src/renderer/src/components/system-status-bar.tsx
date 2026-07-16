import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpCircle, Box, Circle, Cpu, Download, Dot, HardDrive, Monitor } from 'lucide-react'
import type { SystemStatus, UpdateCheckResult } from '@shared/ipc'
import { captions } from '@/lib/strings'

const metricIconByLabel: Record<string, typeof Circle> = {
  cpu: Cpu,
  gpu: Monitor,
  memory: HardDrive,
  platform: Box
}

interface SystemStatusBarProps {
  appVersion?: string | null
  status: SystemStatus | null
  updateResult?: UpdateCheckResult | null
}

function UpdatePopover({
  result,
  anchorRef,
  onClose
}: {
  result: UpdateCheckResult
  anchorRef: React.RefObject<HTMLButtonElement>
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Compute position synchronously from the already-rendered trigger button.
  // useMemo runs during render, so anchorRef.current is always valid here
  // (the trigger is mounted before the popover ever appears).
  const pos = useMemo(() => {
    if (!anchorRef.current) return { bottom: 44, right: 12 }
    const rect = anchorRef.current.getBoundingClientRect()
    return {
      bottom: window.innerHeight - rect.top + 8,
      right: Math.max(8, window.innerWidth - rect.right)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — trigger position is stable while popover is open

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [anchorRef, onClose])

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Update available"
      style={{ position: 'fixed', bottom: pos.bottom, right: pos.right }}
      className="z-[10001] w-72 rounded-2xl border border-border bg-card p-4 shadow-xl"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-1.5 text-primary">
          <ArrowUpCircle className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">Update available</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{result.releaseName}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-secondary/40 p-3 text-xs">
        <div>
          <p className="text-muted-foreground">Current</p>
          <p className="mt-0.5 font-mono font-medium">v{result.currentVersion}</p>
        </div>
        <div>
          <p className="text-primary">Latest</p>
          <p className="mt-0.5 font-mono font-medium text-primary">v{result.latestVersion}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const url =
            result.releaseUrl ||
            `https://github.com/mohammadKarimi/Whisper-Studio/releases/tag/v${result.latestVersion}`
          window.open(url, '_blank')
          onClose()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Download className="h-3.5 w-3.5" />
        Download v{result.latestVersion}
      </button>
    </div>
  )
}

export function SystemStatusBar({
  appVersion,
  status,
  updateResult
}: SystemStatusBarProps): JSX.Element {
  const [showPopover, setShowPopover] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const displayStatus: SystemStatus = status ?? {
    ready: true,
    status: captions.statusBar.ready,
    metrics: captions.statusBar.metrics
  }
  const visibleMetrics = displayStatus.metrics.filter((metric) => {
    const isGpu = metric.label.toLowerCase() === 'gpu'
    const isUnknown = metric.value.trim().toLowerCase() === 'unknown'
    return !(isGpu && isUnknown)
  })

  return (
    <footer
      className="relative flex h-7 min-w-0 items-center justify-between gap-3 border-t border-sidebar-border bg-sidebar-background px-3 text-[11px] text-sidebar-foreground"
      aria-label={captions.statusBar.label}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="relative flex size-2 shrink-0">
          <span className="size-2 rounded-full bg-success" />
          {displayStatus.ready && (
            <span className="absolute inline-flex size-2 rounded-full bg-success opacity-60 animate-ping" />
          )}
        </span>
        <span className="truncate font-medium text-sidebar-accent-foreground">
          {displayStatus.status}
        </span>
        <Dot className="size-4 shrink-0 text-sidebar-foreground/40 -mx-1" />
        <span className="font-mono text-sidebar-foreground">v{appVersion}</span>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-3 overflow-hidden">
        {visibleMetrics.map((metric, index) => {
          const MetricIcon =
            metricIconByLabel[metric.label.toLowerCase()] ?? (index === 0 ? Cpu : Circle)

          return (
            <div key={metric.label} className="flex min-w-0 items-center gap-1.5">
              <MetricIcon className="size-3.5 shrink-0 text-sidebar-foreground/70" />
              <span className="hidden text-sidebar-foreground/70 sm:inline">{metric.label}</span>
              <span className="truncate font-mono text-sidebar-accent-foreground/90">
                {metric.value}
              </span>
            </div>
          )
        })}

        {updateResult?.hasUpdate && (
          <div className="relative shrink-0">
            <button
              ref={triggerRef}
              type="button"
              title={`Update available: v${updateResult.latestVersion}`}
              onClick={() => setShowPopover((v) => !v)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-primary transition-colors hover:bg-primary/10"
            >
              <ArrowUpCircle className="size-3.5" />
              <span className="font-medium">Update</span>
              <span className="flex size-1.5 rounded-full bg-primary animate-ping absolute -top-1 -right-2" />
              <span className="flex size-1.5 rounded-full bg-primary absolute -top-1 -right-2" />
            </button>

            {showPopover && (
              <UpdatePopover
                result={updateResult}
                anchorRef={triggerRef}
                onClose={() => setShowPopover(false)}
              />
            )}
          </div>
        )}
      </div>
    </footer>
  )
}
