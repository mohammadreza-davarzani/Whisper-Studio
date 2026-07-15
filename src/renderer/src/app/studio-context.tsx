import { createContext, useContext, useState, type ReactNode } from 'react'
import type { TranscriptionRecord } from '@shared/ipc'

interface StudioContextValue {
  record: TranscriptionRecord | null
  setRecord: (record: TranscriptionRecord | null) => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: ReactNode }): JSX.Element {
  const [record, setRecord] = useState<TranscriptionRecord | null>(null)

  return <StudioContext.Provider value={{ record, setRecord }}>{children}</StudioContext.Provider>
}

export function useStudioContext(): StudioContextValue {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudioContext must be used within a StudioProvider')
  return ctx
}
