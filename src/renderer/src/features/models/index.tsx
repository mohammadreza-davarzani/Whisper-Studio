import { useCallback, useEffect, useState } from 'react'
import { Boxes, HardDrive, Cpu, AlertCircle, RefreshCw } from 'lucide-react'
import type {
  AppApi,
  ModelApi,
  DownloadedWhisperModelsResult,
  WhisperModelDownloadProgress
} from '@shared/ipc'
import { formatBytes } from '@/lib/utils'
import { captions } from '@/lib/strings'
import ModelsCatalog from './components/models-catalog'
import { Button } from '@/components/ui/button'

interface ModelsProps {
  desktop: AppApi & ModelApi
}

export default function Models({ desktop }: ModelsProps) {
  const modelsCaptions = captions.models
  const [runtimeReady, setRuntimeReady] = useState(false)
  const [isCheckingRuntime, setIsCheckingRuntime] = useState(true)
  const [runtimeCheckFailed, setRuntimeCheckFailed] = useState(false)
  const [downloadedModels, setDownloadedModels] = useState<DownloadedWhisperModelsResult>({
    models: [],
    totalSizeBytes: 0
  })
  const [downloadProgress, setDownloadProgress] = useState<
    Record<string, WhisperModelDownloadProgress>
  >({})
  const refreshDownloadedModels = useCallback(async (): Promise<void> => {
    setDownloadedModels(await desktop.getDownloadedModels())
  }, [desktop])

  const deleteDownloadedModel = useCallback(
    async (id: string): Promise<void> => {
      const result = await desktop.deleteModel(id)

      if (!result.ok) {
        throw new Error(result.stderr || 'Failed to delete model')
      }

      await refreshDownloadedModels()
    },
    [desktop, refreshDownloadedModels]
  )

  const downloadAvailableModel = useCallback(
    async (repoId: string): Promise<void> => {
      const result = await desktop.downloadModel(repoId)

      if (!result.ok) {
        throw new Error(result.stderr || 'Failed to download model')
      }

      await refreshDownloadedModels()
    },
    [desktop, refreshDownloadedModels]
  )

  useEffect(() => {
    void refreshDownloadedModels()
  }, [refreshDownloadedModels])

  const refreshRuntimeStatus = useCallback(async (): Promise<void> => {
    setIsCheckingRuntime(true)
    setRuntimeCheckFailed(false)

    try {
      const runtime = await desktop.getRuntimeStatus()
      setRuntimeReady(runtime.state === 'ready')
    } catch {
      setRuntimeReady(false)
      setRuntimeCheckFailed(true)
    } finally {
      setIsCheckingRuntime(false)
    }
  }, [desktop])

  useEffect(() => {
    void refreshRuntimeStatus()
  }, [refreshRuntimeStatus])

  useEffect(() => {
    return desktop.onModelDownloadProgress((progress) => {
      setDownloadProgress((prev) => ({ ...prev, [progress.repoId]: progress }))
    })
  }, [desktop])

  const downloadedCount = downloadedModels.models.length

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 p-8">
      {/* Hero header — matches the visual language used by the other top-level pages. */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-primary/10 via-card to-card p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-chart-2/5 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Boxes className="h-4 w-4 text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-primary">
                {modelsCaptions.header.eyebrow}
              </span>
            </div>
            <h1 className="mb-1 text-3xl font-semibold tracking-tight">
              {modelsCaptions.header.title}
            </h1>
            <p className="text-sm text-muted-foreground">{modelsCaptions.header.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex min-w-32 items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {modelsCaptions.header.modelsLabel}
                </p>
                <p className="text-xs font-mono font-semibold">
                  {downloadedCount} {modelsCaptions.header.modelCountSuffix}
                </p>
              </div>
            </div>
            <div className="flex min-w-32 items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
                <HardDrive className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {modelsCaptions.header.storageLabel}
                </p>
                <p className="text-xs font-mono font-semibold">
                  {downloadedModels.totalSizeBytes === 0
                    ? captions.models.header.emptyStorageValue
                    : formatBytes(downloadedModels.totalSizeBytes)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {!isCheckingRuntime && runtimeCheckFailed && (
        <div className="flex flex-col gap-4 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">{modelsCaptions.runtime.checkFailedTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {modelsCaptions.runtime.checkFailedSubtitle}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshRuntimeStatus()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {modelsCaptions.runtime.retry}
          </Button>
        </div>
      )}
      {!isCheckingRuntime && !runtimeCheckFailed && !runtimeReady && (
        <div className="flex flex-col gap-4 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div>
              <p className="text-sm font-medium">{modelsCaptions.runtime.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {modelsCaptions.runtime.subtitle}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshRuntimeStatus()}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {modelsCaptions.runtime.retry}
          </Button>
        </div>
      )}
      <ModelsCatalog
        canDownload={!runtimeCheckFailed && runtimeReady}
        downloadProgress={downloadProgress}
        downloadedModels={downloadedModels.models}
        isCheckingRuntime={isCheckingRuntime}
        onDelete={deleteDownloadedModel}
        onDownload={downloadAvailableModel}
        totalSizeBytes={downloadedModels.totalSizeBytes}
      />
    </div>
  )
}
