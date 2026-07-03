import { useEffect } from 'react'
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, ChevronDown, Wrench } from 'lucide-react'
import type { AppApi } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { captions } from '@/lib/strings'
import { usePrerequisites } from './use-prerequisites'
import PrerequisiteCard from './prerequisite-card'

const prerequisitesCaptions = captions.models.prerequisites

interface PrerequisitesProps {
  desktop: AppApi
  onReadyChange?: (ready: boolean) => void
}

export default function Prerequisites({ desktop, onReadyChange }: PrerequisitesProps) {
  const {
    visibleItems,
    isChecking,
    isBusy,
    expanded,
    setExpanded,
    installProgress,
    installedCount,
    pythonOk,
    whisperOk,
    torchOk,
    hasProblems,
    showDetails,
    refreshPrerequisites,
    handleInstall,
    handleFixAll
  } = usePrerequisites(desktop)

  useEffect(() => {
    onReadyChange?.(pythonOk && whisperOk && torchOk)
  }, [onReadyChange, pythonOk, whisperOk, torchOk])

  const StatusBarIcon = isChecking ? Loader2 : hasProblems ? AlertCircle : CheckCircle2
  const statusBarColor = isChecking ? 'text-primary' : hasProblems ? 'text-warning' : 'text-success'

  return (
    <div className="rounded-xl border border-border/40 bg-card">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              hasProblems ? 'bg-warning/10' : 'bg-success/10'
            }`}
          >
            <StatusBarIcon
              className={`w-4 h-4 ${statusBarColor} ${isChecking ? 'animate-spin' : ''}`}
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">
              {hasProblems ? prerequisitesCaptions.title : prerequisitesCaptions.ready.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {hasProblems
                ? `${installedCount} ${prerequisitesCaptions.summary.of} ${visibleItems.length} ${prerequisitesCaptions.summary.suffix}`
                : prerequisitesCaptions.ready.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasProblems && (
            <Button
              variant="default"
              size="sm"
              onClick={() => void handleFixAll()}
              disabled={isBusy}
              className="gap-1.5 text-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              {prerequisitesCaptions.actions.fixAll}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshPrerequisites()}
            disabled={isBusy}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{prerequisitesCaptions.actions.checkAll}</span>
          </Button>
          {!hasProblems && !isBusy && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded((v) => !v)}
              aria-label={
                expanded
                  ? prerequisitesCaptions.actions.collapse
                  : prerequisitesCaptions.actions.expand
              }
              className="h-8 w-8 text-muted-foreground"
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </Button>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="border-t border-border/40 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleItems.map((item) => (
              <PrerequisiteCard
                key={item.id}
                item={item}
                isBusy={isBusy}
                pythonOk={pythonOk}
                installProgress={installProgress[item.id]}
                onInstall={handleInstall}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
