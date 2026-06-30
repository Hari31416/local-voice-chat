import { ArrowUpRight } from 'lucide-react'
import type { LoadProgress, SetupPhase } from '@/lib/voice-agent-types'
import type { UserPreferences } from '@/lib/user-preferences'
import { cn } from '@/lib/utils'

const SAMPLE_QUERIES = [
  {
    label: 'How it works',
    query: 'How does running AI entirely in the browser work?',
  },
  {
    label: 'Creative',
    query: 'Tell me a two-sentence story about the ocean.',
  },
  {
    label: 'Get started',
    query: 'What can you help me with today?',
  },
  {
    label: 'Explain',
    query: 'Summarize the benefits of on-device AI in three bullet points.',
  },
] as const

interface ChatEmptyStateProps {
  setupPhase: SetupPhase
  prefs: UserPreferences
  isCallActive: boolean
  statusMessage: string
  activeLoadProgress: LoadProgress | null
  onSampleQuery?: (query: string) => void
}

function getSubtitle(
  setupPhase: SetupPhase,
  isCallActive: boolean,
  prefs: UserPreferences,
): string {
  if (setupPhase === 'loading') return 'Loading models…'
  if (isCallActive) return 'Start speaking…'
  if (prefs.sttEnabled && prefs.ttsEnabled) return 'Click the phone to start a call, or try a prompt below'
  if (prefs.sttEnabled) return 'Click the mic to speak, or try a prompt below'
  return 'Type a message to begin, or try a prompt below'
}

export function ChatEmptyState({
  setupPhase,
  prefs,
  isCallActive,
  statusMessage,
  activeLoadProgress,
  onSampleQuery,
}: ChatEmptyStateProps) {
  const subtitle =
    setupPhase === 'loading' ? statusMessage : getSubtitle(setupPhase, isCallActive, prefs)
  const showSamples = setupPhase === 'ready' && !isCallActive && onSampleQuery

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        'min-h-[calc(100dvh-13rem)] sm:min-h-[calc(100dvh-12rem)]',
        'px-2 py-8',
      )}
    >
      <div className="animate-hero-title space-y-3 max-w-lg">
        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          WebVoice
        </h1>
        <p className="text-zinc-500 text-sm sm:text-base leading-relaxed animate-hero-desc">
          {subtitle}
        </p>
      </div>

      {setupPhase === 'loading' && activeLoadProgress && (
        <div className="mt-8 w-64 max-w-full animate-fade-up">
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            {activeLoadProgress.progress > 0 ? (
              <div
                className={cn(
                  'h-full transition-all duration-300 rounded-full',
                  activeLoadProgress.color,
                )}
                style={{ width: `${activeLoadProgress.progress}%` }}
              />
            ) : (
              <div className={cn('h-full w-1/3 animate-pulse rounded-full', activeLoadProgress.color)} />
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            {activeLoadProgress.label}:{' '}
            {activeLoadProgress.progress > 0
              ? `${Math.round(activeLoadProgress.progress)}%`
              : 'starting…'}
          </p>
        </div>
      )}

      {showSamples && (
        <div className="mt-10 w-full max-w-xl animate-fade-up stagger-group">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-3">
            Try asking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {SAMPLE_QUERIES.map((sample, index) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => onSampleQuery(sample.query)}
                className={cn(
                  'stagger-item card-selectable group text-left rounded-xl border border-white/[0.08]',
                  'bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/25',
                  'px-4 py-3.5 transition-all cursor-pointer',
                  `stagger-${index + 1}`,
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80 mb-1">
                      {sample.label}
                    </p>
                    <p className="text-sm text-zinc-300 leading-snug group-hover:text-white transition-colors">
                      {sample.query}
                    </p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-emerald-400 transition-colors mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
