import { useEffect, useState } from 'react'
import { Cpu, FolderOpen, Loader2, Trash2 } from 'lucide-react'
import type { AppApi, RuntimeInstallProgress, RuntimeStatus } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/features/settings/components/settings-card'
import { SettingRow } from '@/features/settings/components/setting-row'
import { formatBytes } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function RuntimeSettingsCard({ desktop }: { desktop: AppApi }): JSX.Element {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [progress, setProgress] = useState<RuntimeInstallProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    void desktop
      .getRuntimeStatus()
      .then(setStatus)
      .catch(() => setError('Could not read Runtime status.'))
    return desktop.onRuntimeInstallProgress(setProgress)
  }, [desktop])

  const remove = async (): Promise<void> => {
    setConfirmOpen(false)
    setBusy(true)
    const result = await desktop.removeRuntime()
    setStatus(result.status)
    setBusy(false)
    if (result.ok) window.location.reload()
    else setError(result.stderr ?? 'Could not remove Runtime.')
  }

  const active = status?.active
  const detail = active
    ? `${active.platform} ${active.arch} · ${active.accelerator.toUpperCase()} · ${formatBytes(active.sizeBytes)}`
    : 'Runtime is not installed'

  return (
    <>
      {confirmOpen && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-background/80 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-runtime-title"
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 id="remove-runtime-title" className="text-base font-semibold text-foreground">
                  Remove Whisper Runtime?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This deletes the Runtime files from disk. You will need to download or reinstall
                  it before transcribing again.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => void remove()}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove Runtime
              </Button>
            </div>
          </div>
        </div>
      )}

      <SettingsCard icon={<Cpu className="h-4 w-4 text-primary" />} title="Whisper Runtime">
        <SettingRow
          label={active ? `Runtime ${active.version}` : 'Runtime unavailable'}
          description={detail}
          last
        >
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="sm" onClick={() => void desktop.openRuntimeFolder()}>
                  <FolderOpen className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open runtime folder</TooltipContent>
            </Tooltip>

            {active && (
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </SettingRow>
        {(progress || error) && (
          <div className="border-t border-border/40 px-6 py-3 text-xs text-muted-foreground">
            {error || progress?.message}
          </div>
        )}
      </SettingsCard>
    </>
  )
}
