import type { Dispatch, SetStateAction } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { FolderOpen } from 'lucide-react'
import { FALLBACK_FORMAT_ICON, FORMAT_ICONS } from '@/lib/format-icons'
import { captions } from '@/lib/strings'
import { WHISPER_CATALOG_MODELS } from '@shared/constants'
import type { TranscriptionFile } from './files-step'
import type { TranscriptionSettings } from './settings-step'

const FORMATS = captions.newTranscription.output.formats.map((format) => ({
  ...format,
  icon: FORMAT_ICONS[format.value] ?? FALLBACK_FORMAT_ICON
}))
const ESTIMATE_CAPTIONS = captions.newTranscription.output.estimated
const estimatedBytesPerSecondByType = {
  audio: 16_000,
  video: 375_000
} as const

interface StepOutputProps {
  file: TranscriptionFile | null
  outputFormats: string[]
  setOutputFormats: Dispatch<SetStateAction<string[]>>
  settings: TranscriptionSettings
}

interface DurationEstimate {
  seconds: number | null
  source: 'file-size' | 'metadata' | 'none'
}

function parseDurationSeconds(duration: string): number | null {
  if (!duration || duration === '—') {
    return null
  }

  const parts = duration.split(':').map((part) => Number(part))

  if (parts.some((part) => !Number.isFinite(part))) {
    return null
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

function getDurationEstimate(file: TranscriptionFile | null): DurationEstimate {
  if (!file) {
    return { seconds: null, source: 'none' }
  }

  const metadataSeconds = parseDurationSeconds(file.duration)

  if (metadataSeconds) {
    return { seconds: metadataSeconds, source: 'metadata' }
  }

  if (file.sizeBytes <= 0) {
    return { seconds: null, source: 'none' }
  }

  return {
    seconds: Math.ceil(file.sizeBytes / estimatedBytesPerSecondByType[file.type]),
    source: 'file-size'
  }
}

function getModelDetails(modelName: string): (typeof WHISPER_CATALOG_MODELS)[number] | null {
  const normalizedName = modelName.toLowerCase()

  return (
    WHISPER_CATALOG_MODELS.find((model) => {
      const normalizedId = model.id.toLowerCase()
      return (
        normalizedName === normalizedId ||
        normalizedName.includes(`-${normalizedId}`) ||
        normalizedName.includes(normalizedId)
      )
    }) ?? null
  )
}

function getSpeedFactor(modelName: string): number | null {
  const model = getModelDetails(modelName)
  const speed = model?.speed.match(/(\d+(?:\.\d+)?)x/)

  if (!speed) {
    return null
  }

  return Number(speed[1])
}

function formatEstimateTime(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return ESTIMATE_CAPTIONS.unknownTimeValue
  }

  const minutes = Math.ceil(seconds / 60)

  if (minutes <= 1) {
    return ESTIMATE_CAPTIONS.lessThanMinute
  }

  if (minutes < 60) {
    return `~${minutes} ${ESTIMATE_CAPTIONS.minuteUnit}`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `~${hours}${ESTIMATE_CAPTIONS.hourUnit}`
  }

  return `~${hours}${ESTIMATE_CAPTIONS.hourUnit} ${remainingMinutes}${ESTIMATE_CAPTIONS.minuteUnit}`
}

function formatModelLabel(modelName: string): string {
  const model = getModelDetails(modelName)

  if (model) {
    return model.label
  }

  return modelName || ESTIMATE_CAPTIONS.unknownModelValue
}

export default function StepOutput({
  file,
  outputFormats,
  setOutputFormats,
  settings
}: StepOutputProps): JSX.Element {
  const toggleFormat = (value: string): void => {
    setOutputFormats(
      outputFormats.includes(value)
        ? outputFormats.filter((f) => f !== value)
        : [...outputFormats, value]
    )
  }
  const durationEstimate = getDurationEstimate(file)
  const speedFactor = getSpeedFactor(settings.model)
  const estimatedSeconds =
    durationEstimate.seconds && speedFactor
      ? Math.ceil(durationEstimate.seconds / speedFactor)
      : null
  const modelLabel = formatModelLabel(settings.model)
  const outputFileCount = outputFormats.length
  const outputFileSuffix =
    outputFileCount === 1 ? ESTIMATE_CAPTIONS.fileSuffix : ESTIMATE_CAPTIONS.filesSuffix

  return (
    <div className="space-y-6">
      {/* Output Formats */}
      <div>
        <h3 className="text-sm font-semibold mb-1">{captions.newTranscription.output.title}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {captions.newTranscription.output.description}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {FORMATS.map((format) => {
            const isSelected = outputFormats.includes(format.value)
            return (
              <button
                key={format.value}
                onClick={() => toggleFormat(format.value)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all text-left
                  ${
                    isSelected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border/50 bg-card/50 hover:bg-secondary/30 hover:border-muted-foreground/20'
                  }`}
              >
                <div className="absolute top-3 right-3">
                  <Checkbox checked={isSelected} />
                </div>
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary/10' : 'bg-secondary'}`}
                >
                  <format.icon
                    className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                </div>
                <div>
                  <p className="text-[13px] font-medium">{format.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{format.ext}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{format.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Output Path */}
      <div>
        <h3 className="text-sm font-semibold mb-1">
          {captions.newTranscription.output.outputFolder.title}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {captions.newTranscription.output.outputFolder.description}
        </p>
        <button className="flex items-center gap-3 w-full p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-secondary/30 transition-all text-left">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-[13px] font-mono text-muted-foreground">
            {captions.newTranscription.output.outputFolder.path}
          </span>
        </button>
      </div>

      {/* Estimated Processing */}
      <div className="glass-panel rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.timeLabel}
            </span>
            <span className="text-lg font-semibold font-mono">
              {formatEstimateTime(estimatedSeconds)}
            </span>
            {durationEstimate.source === 'file-size' && (
              <span className="block text-[10px] text-muted-foreground mt-0.5">
                {ESTIMATE_CAPTIONS.fileSizeEstimateNote}
              </span>
            )}
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.modelLabel}
            </span>
            <span className="text-[13px] font-medium">{modelLabel}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
              {captions.newTranscription.output.estimated.outputFilesLabel}
            </span>
            <span className="text-[13px] font-medium">
              {outputFileCount} {outputFileSuffix}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
