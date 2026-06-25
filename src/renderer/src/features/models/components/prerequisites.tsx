import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Terminal,
  RefreshCw,
  Cpu,
  Code2,
  Video,
  Zap,
  Package
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DesktopApi, PrerequisiteCheckStatus } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'

const prerequisitesCaptions = captions.models.prerequisites
type PrerequisiteId = (typeof prerequisitesCaptions.items)[number]['id']
type PrerequisiteStatus = PrerequisiteCheckStatus | 'checking'
type PrerequisiteItem = {
  id: PrerequisiteId
  name: string
  required: string
  installed: string | null
  status: PrerequisiteStatus
  desc: string
}

interface PrerequisitesProps {
  desktop: DesktopApi
}

const prerequisiteIcons: Record<PrerequisiteId, LucideIcon> = {
  python: Code2,
  ffmpeg: Video,
  cuda: Cpu,
  'faster-whisper': Package,
  ctranslate2: Zap,
  torch: Terminal
}

const statusConfig = {
  ok: {
    icon: CheckCircle2,
    color: 'text-success',
    bg: 'bg-success/10',
    label: prerequisitesCaptions.status.ok
  },
  missing: {
    icon: AlertCircle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: prerequisitesCaptions.status.missing
  },
  checking: {
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: prerequisitesCaptions.status.checking
  }
} satisfies Record<
  PrerequisiteStatus,
  { icon: LucideIcon; color: string; bg: string; label: string }
>

const initialItems = prerequisitesCaptions.items.map((item) => ({
  ...item,
  installed: null,
  status: 'checking'
})) satisfies PrerequisiteItem[]

export default function Prerequisites({ desktop }: PrerequisitesProps) {
  const [items, setItems] = useState<PrerequisiteItem[]>(() => initialItems.map((item) => ({ ...item })))
  const [isChecking, setIsChecking] = useState(true)

  const refreshPrerequisites = useCallback(async (): Promise<void> => {
    setIsChecking(true)
    setItems((prev) => prev.map((item) => ({ ...item, status: 'checking' })))

    try {
      const checks = await desktop.getPrerequisites()

      setItems((prev) =>
        prev.map((item) => {
          const check = checks.find((candidate) => candidate.id === item.id)

          return {
            ...item,
            installed: check?.installed ?? null,
            status: check?.status ?? 'missing'
          }
        })
      )
    } finally {
      setIsChecking(false)
    }
  }, [desktop])

  useEffect(() => {
    void refreshPrerequisites()
  }, [refreshPrerequisites])

  const installedCount = items.filter((p) => p.status === 'ok').length

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{prerequisitesCaptions.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {installedCount} {prerequisitesCaptions.summary.of} {items.length}{' '}
            {prerequisitesCaptions.summary.suffix}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void refreshPrerequisites()}
          disabled={isChecking}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />{' '}
          {prerequisitesCaptions.actions.checkAll}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item, i) => {
          const cfg = statusConfig[item.status]
          const StatusIcon = cfg.icon
          const ItemIcon = prerequisiteIcons[item.id]
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border/40 bg-card p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-9 h-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}
                >
                  <ItemIcon className={`w-4 h-4 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-medium font-mono truncate">{item.name}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1 text-[11px] font-medium ${cfg.color}`}>
                    <StatusIcon
                      className={`w-3 h-3 ${item.status === 'checking' ? 'animate-spin' : ''}`}
                    />
                    {cfg.label}
                  </span>
                </div>
                <div className="text-right">
                  {item.installed ? (
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {prerequisitesCaptions.versionPrefix}
                      {item.installed}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground/60">
                      {prerequisitesCaptions.requiredPrefix}
                      {item.required}
                    </span>
                  )}
                </div>
              </div>

            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
