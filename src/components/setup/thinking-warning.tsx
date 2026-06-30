import { Brain } from 'lucide-react'
import { variantSupportsThinkingToggle } from '@/lib/llm/engine-features'
import type { InteractionMode } from './types'
import type { SetupState } from './use-setup-state'

interface ThinkingWarningProps {
  state: SetupState
  activeMode: InteractionMode
}

export function ThinkingWarning({ state, activeMode }: ThinkingWarningProps) {
  if (
    activeMode !== 'call' ||
    !state.useThinking ||
    !variantSupportsThinkingToggle(state.selectedVariant)
  ) {
    return null
  }

  return (
    <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl p-4 space-y-2.5">
      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
        <Brain className="h-4 w-4" />
        <span>Reasoning may delay voice replies</span>
      </div>
      <p className="text-zinc-500 text-[11px] leading-relaxed">
        Thinking is enabled — expect 5–15s before the assistant speaks in call mode.
      </p>
      <button
        type="button"
        onClick={() => state.setUseThinking(false)}
        className="w-full bg-amber-500/10 hover:bg-amber-500/15 text-amber-300 font-semibold py-2 px-3 rounded-lg border border-amber-500/20 text-center transition-colors cursor-pointer text-[11px]"
      >
        Disable reasoning for faster replies
      </button>
    </div>
  )
}
