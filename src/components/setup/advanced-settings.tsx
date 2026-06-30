import { useState } from 'react'
import { ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { LLMModelSelector } from '@/components/llm-model-selector'
import {
  variantSupportsExperimentalToolsToggle,
  variantSupportsThinkingToggle,
  variantSupportsToolsReliably,
} from '@/lib/llm/engine-features'
import { cn } from '@/lib/utils'
import type { SetupState } from './use-setup-state'

interface AdvancedSettingsProps {
  state: SetupState
  isMobile: boolean
  defaultOpen?: boolean
}

export function AdvancedSettings({ state, isMobile, defaultOpen = false }: AdvancedSettingsProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { selectedVariant, thinkingHint, toolsHint } = state

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <button
        id="advanced-settings-toggle"
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <Settings2
            className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-90 text-emerald-400')}
          />
          <span>Customize models & engines</span>
          <span className="text-[10px] text-zinc-600 font-normal">Advanced</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 opacity-50" /> : <ChevronDown className="h-4 w-4 opacity-50" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06] animate-fade-up">
          <div className="pt-4">
            <p className="text-xs font-semibold text-zinc-300 mb-0.5">Language model</p>
            <p className="text-[11px] text-zinc-600 mb-3">Fine-tune variant, backend engines, and capabilities.</p>
            <LLMModelSelector
              selectedId={state.variantId}
              onSelect={state.setVariantId}
              isMobile={isMobile}
              variant="setup"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/[0.06]">
            {variantSupportsThinkingToggle(selectedVariant) && (
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white select-none text-xs">
                  <input
                    type="checkbox"
                    checked={state.useThinking}
                    onChange={(e) => state.setUseThinking(e.target.checked)}
                    className="rounded border-white/20 bg-white/[0.04] text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer h-4 w-4"
                  />
                  <span>Enable model thinking / reasoning</span>
                </label>
                {thinkingHint && <p className="text-[10px] text-zinc-600 pl-6">{thinkingHint}</p>}
              </div>
            )}

            {(variantSupportsExperimentalToolsToggle(selectedVariant) ||
              variantSupportsToolsReliably(selectedVariant)) && (
              <div className="flex flex-col gap-1">
                {variantSupportsExperimentalToolsToggle(selectedVariant) && (
                  <label className="flex items-center gap-2.5 cursor-pointer text-zinc-300 hover:text-white select-none text-xs">
                    <input
                      type="checkbox"
                      checked={state.experimentalToolsEnabled}
                      onChange={(e) => state.setExperimentalToolsEnabled(e.target.checked)}
                      className="rounded border-white/20 bg-white/[0.04] text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer h-4 w-4"
                    />
                    <span>Enable experimental tool calling</span>
                  </label>
                )}
                {toolsHint && (
                  <p
                    className={cn(
                      'text-[10px] text-zinc-600',
                      variantSupportsExperimentalToolsToggle(selectedVariant) && 'pl-6',
                    )}
                  >
                    {toolsHint}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
