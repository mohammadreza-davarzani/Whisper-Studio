import { useState } from 'react'
import { Download, Loader2, Check, Cpu, Globe, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from '@/lib/motion'
import { captions } from '@/captions'

const availableCaptions = captions.models.available
type AvailableModel = (typeof availableCaptions.items)[number]
type AvailableModelId = AvailableModel['id']

const speedColor: Record<AvailableModel['speed'], string> = {
  Fastest: 'text-success',
  'Very Fast': 'text-success',
  Fast: 'text-chart-2',
  Medium: 'text-warning',
  Slow: 'text-muted-foreground'
}

export default function AvailableModels() {
  const [downloading, setDownloading] = useState<Partial<Record<AvailableModelId, number>>>({})
  const [downloaded, setDownloaded] = useState<Set<AvailableModelId>>(() => new Set())

  const handleDownload = (id: AvailableModelId): void => {
    setDownloading((prev) => ({ ...prev, [id]: 0 }))
    const interval = setInterval(() => {
      setDownloading((prev) => {
        const next = (prev[id] || 0) + Math.random() * 18
        if (next >= 100) {
          clearInterval(interval)
          setDownloaded((d) => new Set([...d, id]))
          const { [id]: completedProgress, ...rest } = prev
          void completedProgress
          return rest
        }
        return { ...prev, [id]: next }
      })
    }, 400)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{availableCaptions.title}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {availableCaptions.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableCaptions.items.map((model, i) => {
          const isDownloading = downloading[model.id] !== undefined
          const isDownloaded = downloaded.has(model.id)
          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`relative flex flex-col rounded-2xl border bg-card p-5 transition-all ${
                model.recommended ? 'border-primary/30' : 'border-border/40 hover:border-border/70'
              }`}
            >
              {model.recommended && (
                <div className="absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium">
                  <Star className="w-2.5 h-2.5" /> {availableCaptions.recommended}
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[14px] font-semibold font-mono">{model.name}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{model.size}</p>
                </div>
                <span className={`text-[10px] font-medium ${speedColor[model.speed]}`}>
                  {model.speed}
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1">
                {model.desc}
              </p>

              <div className="flex items-center gap-3 mb-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Cpu className="w-3 h-3" /> {model.params}
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {availableCaptions.languageCount}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {model.accuracy}
                </span>
              </div>

              {isDownloading ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 text-[11px] text-primary">
                      <Loader2 className="w-3 h-3 animate-spin" />{' '}
                      {availableCaptions.actions.downloading}
                    </span>
                    <span className="text-[11px] font-mono text-primary">
                      {Math.round(downloading[model.id] ?? 0)}
                      {availableCaptions.progressSuffix}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-chart-2 rounded-full"
                      animate={{ width: `${downloading[model.id] ?? 0}%` }}
                    />
                  </div>
                </div>
              ) : isDownloaded ? (
                <Button variant="secondary" size="sm" disabled className="w-full gap-1.5 text-xs">
                  <Check className="w-3.5 h-3.5" /> {availableCaptions.actions.downloaded}
                </Button>
              ) : (
                <Button
                  variant={model.recommended ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDownload(model.id)}
                  className="w-full gap-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> {availableCaptions.actions.download}
                </Button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
