import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import flagUrl from '../../../../resources/National_flag_of_Iran.svg'
import logoUrl from '../logo.svg'

const MIN_SPLASH_MS = 4500
const FADE_MS = 500

interface SplashScreenProps {
  ready: boolean
  version?: string
}

export function SplashScreen({ ready, version }: SplashScreenProps): JSX.Element | null {
  const [mounted, setMounted] = useState(true)
  const [isFading, setIsFading] = useState(false)
  const [startedAt] = useState(() => performance.now())
  useEffect(() => {
    document.getElementById('boot-splash')?.remove()
  }, [])

  useEffect(() => {
    if (!ready) {
      setMounted(true)
      setIsFading(false)
      return
    }

    const remainingMs = Math.max(0, MIN_SPLASH_MS - (performance.now() - startedAt))
    const fadeTimeout = window.setTimeout(() => setIsFading(true), remainingMs)
    const unmountTimeout = window.setTimeout(() => setMounted(false), remainingMs + FADE_MS)

    return () => {
      window.clearTimeout(fadeTimeout)
      window.clearTimeout(unmountTimeout)
    }
  }, [ready, startedAt])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[10000] grid place-items-center overflow-hidden bg-background text-foreground transition-opacity duration-500 ${
        isFading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="absolute inset-0 splash-background" />
      <div className="relative flex flex-col items-center gap-4 px-8 text-center">
        <img src={logoUrl} className="relative size-24" alt="" />

        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-normal">Whisper Studio</h1>
          <p className="text-xs text-muted-foreground">Starting local workspace</p>
        </div>

        <div className="h-1 w-56 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary via-chart-2 to-chart-3 animate-[splash-progress_1.3s_ease-in-out_infinite]" />
        </div>
      </div>

      <div className="absolute bottom-4 text-center w-full">
        <p className=" text-[10px] text-muted-foreground">
          Whisper Studio is free and open source software. {version && <span>v{version}</span>}
        </p>
        <p className="text-[10px] mt-1 text-muted-foreground flex items-center justify-center gap-1">
          Built with <Heart className="h-3 w-3 fill-destructive text-destructive" /> under the same
          sky.
          <img src={flagUrl} className="h-3 w-3" alt="" />
        </p>
      </div>
    </div>
  )
}
