import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERACTION_MODES } from './constants'
import type { InteractionMode } from './types'

interface InteractionModePickerProps {
  activeMode: InteractionMode
  onChange: (mode: InteractionMode) => void
  variant?: 'list' | 'grid'
}

export function InteractionModePicker({
  activeMode,
  onChange,
  variant = 'list',
}: InteractionModePickerProps) {
  return (
    <div className={cn(variant === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-2')}>
      {INTERACTION_MODES.map((mode) => {
        const isActive = activeMode === mode.id
        const Icon = mode.icon

        return (
          <button
            key={mode.id}
            id={`mode-${mode.id}`}
            type="button"
            onClick={() => onChange(mode.id)}
            className={cn(
              'w-full rounded-xl border text-left flex transition-all duration-150 cursor-pointer select-none',
              variant === 'grid' ? 'p-4 flex-col gap-3' : 'p-3 items-center gap-3',
              isActive
                ? 'border-emerald-500/40 bg-emerald-500/8'
                : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]',
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className={cn(
                  'p-2 rounded-lg flex-shrink-0 transition-colors',
                  isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.04] text-zinc-500',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white text-xs sm:text-sm">{mode.label}</div>
                <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">{mode.desc}</p>
              </div>
              {isActive && <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export function getInteractionModeLabel(mode: InteractionMode): string {
  return INTERACTION_MODES.find((m) => m.id === mode)?.label ?? mode
}
