import { useState } from 'react'
import {
  HardDrive,
  CheckCircle2,
  Trash2,
  FileAudio,
  Cpu,
  Globe,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'

const downloadedCaptions = captions.models.downloaded
type DownloadedModel = (typeof downloadedCaptions.items)[number]
type DownloadedModelId = DownloadedModel['id']

export default function DownloadedModels() {
  const [models, setModels] = useState<DownloadedModel[]>(downloadedCaptions.items.slice())

  const handleDelete = (id: DownloadedModelId): void => {
    setModels(models.filter((m) => m.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-success" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">{downloadedCaptions.title}</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {models.length} {downloadedCaptions.summary.suffix}{' '}
              {downloadedCaptions.summary.separator} {downloadedCaptions.summary.storageUsed}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {models.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center">
            <FileAudio className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{downloadedCaptions.empty.title}</p>
            <p className="text-[11px] text-muted-foreground/60 mt-1">
              {downloadedCaptions.empty.subtitle}
            </p>
          </div>
        ) : (
          models.map((model, i) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-medium">{model.name}</h3>
                  <span className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-muted-foreground">
                    {model.precision}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {model.params}
                  </span>
                  <span className="text-muted-foreground/30">
                    {downloadedCaptions.detailSeparator}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {model.languages}{' '}
                    {downloadedCaptions.languageSuffix}
                  </span>
                  <span className="text-muted-foreground/30">
                    {downloadedCaptions.detailSeparator}
                  </span>
                  <span>{model.size}</span>
                  <span className="text-muted-foreground/30">
                    {downloadedCaptions.detailSeparator}
                  </span>
                  <span>{model.downloaded}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  title={downloadedCaptions.actions.more}
                  aria-label={downloadedCaptions.actions.more}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(model.id)}
                  title={downloadedCaptions.actions.delete}
                  aria-label={downloadedCaptions.actions.delete}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
