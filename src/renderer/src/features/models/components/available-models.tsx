import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Cpu, Zap, Star, Boxes, Languages, Search } from 'lucide-react'
import type { DownloadedWhisperModel, WhisperModelDownloadProgress } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { formatBytes, secondsToDisplay } from '@/lib/utils'
import { captions } from '@/lib/strings'

const availableCaptions = captions.models.available
type AvailableModel = (typeof availableCaptions.items)[number]
type AvailableModelId = AvailableModel['id']
type SortKey = 'recommended' | 'sizeAsc' | 'sizeDesc' | 'speed' | 'accuracy'

const speedColor: Record<AvailableModel['speed'], string> = {
  Fastest: 'text-success',
  'Very Fast': 'text-success',
  Fast: 'text-chart-2',
  Medium: 'text-warning',
  Slow: 'text-muted-foreground'
}

// Higher rank = faster, used for "Fastest first" sorting.
const speedRank: Record<AvailableModel['speed'], number> = {
  Fastest: 5,
  'Very Fast': 4,
  Fast: 3,
  Medium: 2,
  Slow: 1
}

// Higher rank = more accurate, used for "Most accurate first" sorting.
const accuracyRank: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Highest: 4
}

interface AvailableModelsProps {
  canDownload: boolean
  downloadProgress: Record<string, WhisperModelDownloadProgress>
  downloadedModels: DownloadedWhisperModel[]
  onDownload: (repoId: string) => Promise<void>
}

function normalizeModelName(value: string): string {
  return value.toLowerCase()
}

function parseSize(size: string): number {
  const match = size.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i)

  if (!match) {
    return 0
  }

  const value = Number(match[1])
  const unit = match[2].toUpperCase()
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4
  }

  return value * multipliers[unit]
}

export default function AvailableModels({
  canDownload,
  downloadProgress,
  downloadedModels,
  onDownload
}: AvailableModelsProps) {
  const [downloading, setDownloading] = useState<Set<AvailableModelId>>(() => new Set())
  const [errorByModelId, setErrorByModelId] = useState<Partial<Record<AvailableModelId, string>>>(
    {}
  )
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('recommended')
  const [speedByRepo, setSpeedByRepo] = useState<Record<string, number>>({})
  // Tracks the last reported byte count and timestamp per download so we can
  // derive an estimated transfer speed (the IPC progress payload has no rate).
  const trackerRef = useRef<Record<string, { bytes: number; time: number; speed: number }>>({})

  useEffect(() => {
    const now = Date.now()
    const next: Record<string, number> = {}
    let changed = false

    for (const [repoId, progress] of Object.entries(downloadProgress)) {
      const tracker = trackerRef.current[repoId]
      let speed = tracker?.speed ?? 0

      if (tracker && progress.downloadedBytes > tracker.bytes) {
        const deltaTime = (now - tracker.time) / 1000

        if (deltaTime > 0) {
          const instant = (progress.downloadedBytes - tracker.bytes) / deltaTime
          // Exponential smoothing keeps the displayed speed from jumping around.
          speed = tracker.speed ? tracker.speed * 0.6 + instant * 0.4 : instant
        }
      }

      trackerRef.current[repoId] = { bytes: progress.downloadedBytes, time: now, speed }

      if (progress.state === 'active' && speed > 0) {
        next[repoId] = speed
        changed = true
      }
    }

    if (changed) {
      setSpeedByRepo((prev) => ({ ...prev, ...next }))
    }
  }, [downloadProgress])

  const downloadedModelNames = new Set(
    downloadedModels.flatMap((model) => [
      normalizeModelName(model.name),
      normalizeModelName(model.source.split('/').at(-1) ?? model.source)
    ])
  )

  const availableModels = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = availableCaptions.items.filter((model) => {
      if (downloadedModelNames.has(normalizeModelName(model.name))) {
        return false
      }

      if (!query) {
        return true
      }

      return model.name.toLowerCase().includes(query) || model.desc.toLowerCase().includes(query)
    })

    const sorted = [...filtered]

    switch (sortKey) {
      case 'sizeAsc':
        sorted.sort((a, b) => parseSize(a.size) - parseSize(b.size))
        break
      case 'sizeDesc':
        sorted.sort((a, b) => parseSize(b.size) - parseSize(a.size))
        break
      case 'speed':
        sorted.sort((a, b) => speedRank[b.speed] - speedRank[a.speed])
        break
      case 'accuracy':
        sorted.sort((a, b) => (accuracyRank[b.accuracy] ?? 0) - (accuracyRank[a.accuracy] ?? 0))
        break
      default:
        sorted.sort((a, b) => Number(b.recommended) - Number(a.recommended))
    }

    return sorted
    // downloadedModelNames is derived from props each render; depending on the
    // primitives that matter keeps the memo stable without re-creating the Set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sortKey, downloadedModels])

  const handleDownload = async (model: AvailableModel): Promise<void> => {
    setDownloading((prev) => new Set([...prev, model.id]))
    setErrorByModelId((prev) => {
      const { [model.id]: _removed, ...rest } = prev
      void _removed
      return rest
    })

    try {
      await onDownload(model.repoId)
    } catch (error) {
      setErrorByModelId((prev) => ({
        ...prev,
        [model.id]: error instanceof Error ? error.message : String(error)
      }))
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev)
        next.delete(model.id)
        return next
      })
    }
  }

  const sortLabels: Record<SortKey, string> = {
    recommended: availableCaptions.sort.recommended,
    sizeAsc: availableCaptions.sort.sizeAsc,
    sizeDesc: availableCaptions.sort.sizeDesc,
    speed: availableCaptions.sort.speed,
    accuracy: availableCaptions.sort.accuracy
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{availableCaptions.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{availableCaptions.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={availableCaptions.searchPlaceholder}
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {sortLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!canDownload && (
        <p className="mb-4 text-xs leading-snug text-warning">{availableCaptions.blockedHint}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {availableModels.length === 0 ? (
          <div className="glass-panel col-span-full rounded-2xl p-10 text-center">
            <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search.trim() ? availableCaptions.noSearchResults : availableCaptions.empty.title}
            </p>
            {!search.trim() && (
              <p className="text-xs text-muted-foreground/60 mt-1">
                {availableCaptions.empty.subtitle}
              </p>
            )}
          </div>
        ) : (
          availableModels.map((model) => {
            const isDownloading = downloading.has(model.id)
            const progress = downloadProgress[model.repoId]
            const expectedSizeBytes = parseSize(model.size)
            const downloadedBytes = progress?.downloadedBytes ?? 0
            const progressPercent =
              expectedSizeBytes > 0
                ? Math.min(Math.round((downloadedBytes / expectedSizeBytes) * 100), 100)
                : 0
            const speed = speedByRepo[model.repoId] ?? 0
            const etaSeconds =
              speed > 0 && expectedSizeBytes > downloadedBytes
                ? (expectedSizeBytes - downloadedBytes) / speed
                : 0
            return (
              <div
                key={model.id}
                className={`relative flex flex-col rounded-2xl border bg-card p-5 transition-all ${
                  model.recommended
                    ? 'border-primary/30'
                    : 'border-border/40 hover:border-border/70'
                }`}
              >
                {model.recommended && (
                  <div className="absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                    <Star className="w-2.5 h-2.5" /> {availableCaptions.recommended}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold font-mono">{model.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{model.size}</p>
                  </div>
                  <span className={`text-xs font-medium ${speedColor[model.speed]}`}>
                    {model.speed}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                  {model.desc}
                </p>

                <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {model.params}
                  </span>
                  <span className="flex items-center gap-1">
                    <Languages className="w-3 h-3" /> {availableCaptions.languageCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {model.accuracy}
                  </span>
                </div>

                {isDownloading ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-xs text-primary">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {availableCaptions.actions.downloading}
                      </span>
                      <span className="text-xs font-mono text-primary">
                        {formatBytes(downloadedBytes)} / {model.size}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full"
                        style={{ width: `${Math.max(progressPercent, downloadedBytes ? 4 : 0)}%` }}
                      />
                    </div>
                    {speed > 0 && (
                      <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-muted-foreground">
                        <span>{formatBytes(speed)}/s</span>
                        {etaSeconds > 0 && (
                          <span>
                            {availableCaptions.etaPrefix} {secondsToDisplay(etaSeconds)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant={model.recommended ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => void handleDownload(model)}
                    disabled={!canDownload}
                    className="w-full gap-1.5 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {availableCaptions.actions.download}
                  </Button>
                )}
                {errorByModelId[model.id] && (
                  <p className="mt-2 text-xs leading-snug text-destructive">
                    {availableCaptions.actions.downloadFailed}: {errorByModelId[model.id]}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
