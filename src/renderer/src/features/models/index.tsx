import { Boxes, HardDrive, Cpu } from 'lucide-react'
import type { DesktopApi } from '@shared/ipc'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'
import DownloadedModels from './components/dowanload-models'
import AvailableModels from './components/available-models'
import Prerequisites from './components/prerequisites'

interface ModelsProps {
  desktop: DesktopApi
}

export default function Models({ desktop }: ModelsProps) {
  const modelsCaptions = captions.models

  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
              {modelsCaptions.header.eyebrow}
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{modelsCaptions.header.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{modelsCaptions.header.subtitle}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-card">
            <HardDrive className="w-3.5 h-3.5 text-success" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {modelsCaptions.header.storageLabel}
              </p>
              <p className="text-[12px] font-mono font-semibold">
                {modelsCaptions.header.storageValue}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/40 bg-card">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {modelsCaptions.header.activeLabel}
              </p>
              <p className="text-[12px] font-mono font-semibold">
                {modelsCaptions.header.activeValue}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <Prerequisites desktop={desktop} />
      <DownloadedModels />
      <AvailableModels />
    </div>
  )
}
