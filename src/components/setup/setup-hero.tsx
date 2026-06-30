import type { ReactNode } from 'react'
import { StudioPageHeader } from '@/components/studio-page-header'

interface SetupHeroProps {
  subtitle?: string
}

export function SetupHero({ subtitle }: SetupHeroProps) {
  return (
    <div className="shrink-0 pt-2 sm:pt-6 pb-3 sm:pb-6">
      <StudioPageHeader
        eyebrow="Voice Agent"
        title="Configure session"
        description={
          subtitle ?? 'Choose how you want to interact, pick a performance tier, then launch.'
        }
        accent="emerald"
      />
    </div>
  )
}

export function SetupShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-full flex-1 max-w-6xl mx-auto w-full text-left px-4 sm:px-6 pb-6 sm:pb-8 animate-fade-up">
      {children}
    </div>
  )
}
