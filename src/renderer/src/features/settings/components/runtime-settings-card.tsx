import { useEffect, useState } from 'react'
import { Cpu, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import type { AppApi, RuntimeInstallProgress, RuntimeStatus } from '@shared/ipc'
import { Button } from '@/components/ui/button'
import { SettingsCard } from '@/features/settings/components/settings-card'
import { SettingRow } from '@/features/settings/components/setting-row'
import { formatBytes } from '@/lib/utils'

export function RuntimeSettingsCard({ desktop }: { desktop: AppApi }): JSX.Element {
  const [status, setStatus] = useState<RuntimeStatus | null>(null)
  const [progress, setProgress] = useState<RuntimeInstallProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void desktop
      .getRuntimeStatus()
      .then(setStatus)
      .catch(() => setError('Could not read Runtime status.'))
    return desktop.onRuntimeInstallProgress(setProgress)
  }, [desktop])

  const repair = async (): Promise<void> => {
    setBusy(true)
    setError('')
    const result = await desktop.installRuntime(status?.active?.id ?? status?.recommended?.id)
    setStatus(result.status)
    setBusy(false)
    if (!result.ok) setError(result.stderr ?? 'Runtime installation failed.')
  }

  const remove = async (): Promise<void> => {
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
    <SettingsCard icon={<Cpu className="h-4 w-4 text-primary" />} title="Whisper Runtime">
      <SettingRow
        label={active ? `Runtime ${active.version}` : 'Runtime unavailable'}
        description={detail}
        last
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !status}
            onClick={() => void repair()}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {active ? 'Repair' : 'Install'}
          </Button>
          {active && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void remove()}>
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
  )
}
