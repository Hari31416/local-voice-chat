import { Check } from 'lucide-react'
import { StaggerGroup, StaggerItem } from '@/components/page-transition'
import { cn } from '@/lib/utils'
import { PRESET_ACCENTS, SETUP_PRESETS } from './presets'
import type { SetupPreset } from './presets'

interface PresetPickerProps {
  activePresetId: string
  onSelect: (preset: SetupPreset) => void
  layout?: 'grid' | 'stack'
}

export function PresetPicker({ activePresetId, onSelect, layout = 'grid' }: PresetPickerProps) {
  return (
    <StaggerGroup
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-1 sm:grid-cols-3 gap-3'
          : 'grid grid-cols-1 gap-2',
      )}
    >
      {SETUP_PRESETS.map((preset, index) => {
        const isActive = activePresetId === preset.id
        const Icon = preset.icon
        const accent = PRESET_ACCENTS[preset.accent]

        return (
          <StaggerItem key={preset.id} index={index}>
          <button
            id={`preset-${preset.id}`}
            type="button"
            onClick={() => onSelect(preset)}
            className={cn(
              'card-selectable relative w-full p-4 rounded-xl border text-left cursor-pointer overflow-hidden flex flex-col gap-3 select-none',
              layout === 'stack' && 'sm:flex-row sm:items-center sm:gap-4',
              isActive
                ? cn('card-selected', accent.border, accent.bg, 'shadow-lg', accent.glow)
                : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]',
            )}
          >
            <div className={cn('flex items-start justify-between gap-2', layout === 'stack' && 'sm:items-center sm:flex-shrink-0')}>
              <div
                className={cn(
                  'p-2 rounded-lg border border-white/[0.08]',
                  isActive ? accent.bg : 'bg-white/[0.03]',
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? accent.icon : 'text-zinc-500')} />
              </div>
              {isActive && (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center animate-check-pop">
                  <Check className="h-3 w-3 text-emerald-950" />
                </div>
              )}
            </div>

            <div className={cn('min-w-0', layout === 'stack' && 'sm:flex-1')}>
              <p className="font-display font-bold text-white text-sm">{preset.name}</p>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">
                {preset.subtitle}
              </p>
              <p className="text-[11px] text-zinc-500 leading-snug mt-1">{preset.desc}</p>
            </div>

            <div
              className={cn(
                'flex items-center justify-between pt-2 border-t border-white/[0.06]',
                layout === 'stack' && 'sm:border-t-0 sm:pt-0 sm:flex-col sm:items-end sm:gap-1 sm:flex-shrink-0',
              )}
            >
              <span className="text-[10px] font-semibold text-zinc-400">{preset.badge}</span>
              <span className="text-[11px] font-bold text-zinc-300 font-mono">{preset.sizeLabel}</span>
            </div>
          </button>
          </StaggerItem>
        )
      })}
    </StaggerGroup>
  )
}
