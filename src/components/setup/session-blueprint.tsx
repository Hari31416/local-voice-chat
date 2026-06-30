import { ShieldCheck } from 'lucide-react'
import { STT_OPTIONS } from '@/lib/stt-models'
import { cn } from '@/lib/utils'
import { SETUP_PRESETS } from './presets'
import { getInteractionModeLabel } from './interaction-mode-picker'
import type { SetupState } from './use-setup-state'

interface SessionBlueprintProps {
  state: SetupState
  className?: string
  showBar?: boolean
}

export function SessionBlueprint({ state, className, showBar = true }: SessionBlueprintProps) {
  const presetName =
    state.activePresetId === 'custom'
      ? 'Custom configuration'
      : SETUP_PRESETS.find((p) => p.id === state.activePresetId)?.name ?? 'Custom'

  const sttName = state.sttEnabled
    ? STT_OPTIONS.find((s) => s.id === state.sttModelId)?.name ?? state.sttModelId
    : null

  const barPercent = Math.min(100, Math.round((state.totalDownloadMb / 4096) * 100))

  return (
    <div className={cn('glass-panel rounded-2xl p-5 space-y-4', className)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Your session</p>
        <p className="font-display font-bold text-white text-lg">{presetName}</p>
      </div>

      <dl className="space-y-2.5 text-[11px]">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Mode</dt>
          <dd className="text-zinc-200 font-medium text-right">{getInteractionModeLabel(state.activeMode)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">LLM</dt>
          <dd className="text-zinc-200 font-medium text-right truncate max-w-[55%]">{state.selectedLlm.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Speech recognition</dt>
          <dd className="text-zinc-200 font-medium text-right">{sttName ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">Text-to-speech</dt>
          <dd className="text-zinc-200 font-medium text-right">
            {state.ttsEnabled ? state.selectedTtsEngine.name : '—'}
          </dd>
        </div>
        {state.ttsEnabled && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Voice</dt>
            <dd className="text-zinc-200 font-medium text-right truncate max-w-[55%]">{state.selectedVoice.name}</dd>
          </div>
        )}
        {state.useThinking && (
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500">Reasoning</dt>
            <dd className="text-amber-400 font-medium">Enabled</dd>
          </div>
        )}
      </dl>

      <div className="pt-3 border-t border-white/[0.06] space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-zinc-500">Download estimate</span>
          <span className="font-display font-bold text-emerald-400 text-xl">{state.totalDownloadSizeLabel}</span>
        </div>

        {showBar && (
          <div className="space-y-1">
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  barPercent >= 75 ? 'bg-amber-500' : barPercent >= 40 ? 'bg-cyan-500' : 'bg-emerald-500',
                )}
                style={{ width: `${Math.max(barPercent, 6)}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-600">Relative to ~4 GB reference size</p>
          </div>
        )}

        <div className="space-y-1 pt-1">
          {state.estimatedDownload.stt && (
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>STT</span>
              <span className="font-mono text-zinc-400">{state.estimatedDownload.stt}</span>
            </div>
          )}
          {state.estimatedDownload.tts && (
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>TTS</span>
              <span className="font-mono text-zinc-400">{state.estimatedDownload.tts}</span>
            </div>
          )}
          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>LLM</span>
            <span className="font-mono text-zinc-400">{state.estimatedDownload.llm}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 text-[10px] text-zinc-600">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/70 flex-shrink-0 mt-0.5" />
        <span>Models cache locally. Nothing leaves your device.</span>
      </div>
    </div>
  )
}
