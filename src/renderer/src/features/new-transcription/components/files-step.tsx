import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type DragEvent,
  type SetStateAction
} from 'react'
import { Upload, FileAudio, FileVideo, X, Clock, HardDrive } from 'lucide-react'
import type { AppApi } from '@shared/ipc'
import { formatBytes } from '@/lib/utils'
import { captions } from '@/lib/strings'

export interface TranscriptionFile {
  duration: string
  name: string
  path: string
  sizeBytes: number
  type: 'audio' | 'video'
}

interface StepFilesProps {
  desktop: AppApi
  file: TranscriptionFile | null
  setFile: Dispatch<SetStateAction<TranscriptionFile | null>>
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'avi', 'mov', 'webm', 'mpeg', 'mpg', 'm4v'])

function getMediaType(raw: File): 'audio' | 'video' {
  if (raw.type.startsWith('video/')) return 'video'
  if (raw.type.startsWith('audio/')) return 'audio'
  const ext = raw.name.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.has(ext) ? 'video' : 'audio'
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function loadMediaDuration(raw: File): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(raw)
    const type = getMediaType(raw)
    const el = document.createElement(type === 'video' ? 'video' : 'audio')
    el.preload = 'metadata'
    el.src = url
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(formatDuration(el.duration))
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      resolve('—')
    }
  })
}

async function buildTranscriptionFile(raw: File, desktop: AppApi): Promise<TranscriptionFile> {
  const duration = await loadMediaDuration(raw)
  const filePath = desktop.getFilePath(raw)

  return {
    duration,
    name: raw.name,
    path: filePath || raw.name,
    sizeBytes: raw.size,
    type: getMediaType(raw)
  }
}

export default function StepFiles({ desktop, file, setFile }: StepFilesProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileCaptions = captions.newTranscription.files

  const processFile = useCallback(
    async (raw: File): Promise<void> => {
      setIsLoading(true)
      try {
        setFile(await buildTranscriptionFile(raw, desktop))
      } finally {
        setIsLoading(false)
      }
    },
    [desktop, setFile]
  )

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>, over: boolean) => {
    e.preventDefault()
    setIsDragOver(over)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const raw = e.dataTransfer.files[0]
      if (raw) void processFile(raw)
    },
    [processFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.files?.[0]
      if (raw) void processFile(raw)
      e.target.value = ''
    },
    [processFile]
  )

  const FileIcon = file?.type === 'video' ? FileVideo : FileAudio

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={handleInputChange}
      />

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={fileCaptions.dropZone.title}
          className={`rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
            ${
              isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-border/60 hover:border-muted-foreground/40 hover:bg-secondary/20'
            }`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={(e) => handleDrag(e, true)}
          onDragEnter={(e) => handleDrag(e, true)}
          onDragLeave={(e) => handleDrag(e, false)}
          onDrop={handleDrop}
        >
          <div className="py-16 text-center">
            <div
              className={`w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-secondary'}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <Upload
                  className={`w-5 h-5 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`}
                />
              )}
            </div>
            <p className="text-sm font-medium mb-1">{fileCaptions.dropZone.title}</p>
            <p className="text-xs text-muted-foreground">{fileCaptions.dropZone.formats}</p>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-xl p-5 space-y-4">
          {/* File row */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <FileIcon
                className={`w-5 h-5 ${file.type === 'video' ? 'text-primary' : 'text-chart-2'}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium truncate">{file.name}</p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                {file.path}
              </p>
            </div>
            <button
              onClick={() => setFile(null)}
              aria-label="Remove file"
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Attributes grid */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/40">
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <Clock className="w-3 h-3" /> Duration
              </span>
              <p className="text-[13px] font-mono font-medium">{file.duration}</p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <HardDrive className="w-3 h-3" /> Size
              </span>
              <p className="text-[13px] font-mono font-medium">{formatBytes(file.sizeBytes)}</p>
            </div>
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                <FileIcon className="w-3 h-3" /> Type
              </span>
              <p className="text-[13px] font-medium capitalize">{file.type}</p>
            </div>
          </div>

          {/* Replace */}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            Choose a different file
          </button>
        </div>
      )}
    </div>
  )
}
