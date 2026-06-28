import type { TranscriptionApi } from '@shared/ipc'
import TranscriptionGrid from './components/transcription-grid'
import WelcomeHeader from './components/welcome-header'

interface DashboardProps {
  desktop: TranscriptionApi
}

export default function Dashboard({ desktop }: DashboardProps) {
  return (
    <div className="p-8 max-w-[1280px] mx-auto space-y-6">
      <WelcomeHeader />
      <TranscriptionGrid desktop={desktop} />
    </div>
  )
}
