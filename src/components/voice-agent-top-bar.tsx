import { useEffect, useRef, useState } from "react"
import { RotateCcw, Settings, X } from "lucide-react"
import type { useTTS } from "@/hooks/use-tts"
import { isCrossOriginIsolated } from "@/lib/ort-config"
import { IS_IOS } from "@/lib/voice-agent-constants"
import { getLLMVariant } from "@/lib/llm-models"
import {
  getThinkingToggleHint,
  getToolsHint,
  variantSupportsExperimentalToolsToggle,
  variantSupportsThinkingToggle,
  variantSupportsToolsReliably,
} from "@/lib/llm/engine-features"
import type { DebugInfo, SetupPhase } from "@/lib/voice-agent-types"
import type { UserPreferences } from "@/lib/user-preferences"
import { cn } from "@/lib/utils"

interface VoiceAgentTopBarProps {
  hasMessages: boolean
  setupPhase: SetupPhase
  selectedLLMId: string
  selectedVariantId: string
  prefs: UserPreferences
  debugInfo: DebugInfo
  tts: ReturnType<typeof useTTS>
  onClearConversation: () => void
  onResetPreferences: () => void
  onToggleThinking?: (enabled: boolean) => void
  onToggleExperimentalTools?: (enabled: boolean) => void
}

export function VoiceAgentTopBar({
  hasMessages,
  setupPhase,
  selectedLLMId,
  selectedVariantId,
  prefs,
  debugInfo,
  tts,
  onClearConversation,
  onResetPreferences,
  onToggleThinking,
  onToggleExperimentalTools,
}: VoiceAgentTopBarProps) {
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const debugPanelRef = useRef<HTMLDivElement | null>(null)
  const debugToggleRef = useRef<HTMLButtonElement | null>(null)
  const selectedVariant = getLLMVariant(selectedVariantId)
  const thinkingHint = getThinkingToggleHint(selectedVariant)
  const toolsHint = getToolsHint(selectedVariant, prefs.experimentalToolsEnabled)
  const showThinkingToggle = variantSupportsThinkingToggle(selectedVariant)
  const showExperimentalToolsToggle = variantSupportsExperimentalToolsToggle(selectedVariant)
  const showToolsInfo =
    variantSupportsToolsReliably(selectedVariant) || showExperimentalToolsToggle

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showDebugPanel &&
        debugPanelRef.current &&
        !debugPanelRef.current.contains(target) &&
        debugToggleRef.current &&
        !debugToggleRef.current.contains(target)
      ) {
        setShowDebugPanel(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDebugPanel(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [showDebugPanel])

  return (
    <>
      {showDebugPanel && (
        <div
          ref={debugPanelRef}
          className="fixed top-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-xs font-mono z-50 min-w-[200px]"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-zinc-400 font-semibold">Debug Info</span>
            <button
              onClick={() => setShowDebugPanel(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1 text-zinc-300">
            <div>
              WebGPU:{" "}
              <span
                className={
                  debugInfo.webgpu === "available" ? "text-green-400" : "text-yellow-400"
                }
              >
                {debugInfo.webgpu}
              </span>
            </div>
            <div>
              COI:{" "}
              <span className={isCrossOriginIsolated() ? "text-green-400" : "text-yellow-400"}>
                {isCrossOriginIsolated()
                  ? "yes (WASM threads)"
                  : "no (single-thread WASM)"}
              </span>
            </div>
            <div>
              iOS:{" "}
              <span className={IS_IOS ? "text-yellow-400" : "text-green-400"}>
                {IS_IOS ? "yes" : "no"}
              </span>
            </div>
            <div>
              LLM ID: <span className="text-blue-400">{selectedLLMId}</span>
            </div>
            <hr className="border-zinc-700 my-2" />
            <div>
              VAD:{" "}
              {debugInfo.vadLoaded ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-zinc-500">○</span>
              )}
            </div>
            <div>
              STT:{" "}
              {debugInfo.sttLoaded ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-zinc-500">○</span>
              )}
            </div>
            <div>
              TTS:{" "}
              {debugInfo.ttsLoaded ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-zinc-500">○</span>
              )}{" "}
              {tts.backend && <span className="text-zinc-500">({tts.backend})</span>}
            </div>
            <div>
              TTS engine: <span className="text-blue-400">{prefs.ttsEngine}</span>
            </div>
            <div>
              TTS voice: <span className="text-blue-400">{prefs.ttsVoice}</span>
            </div>
            <div>
              LLM:{" "}
              {debugInfo.llmLoaded ? (
                <span className="text-green-400">✓</span>
              ) : (
                <span className="text-zinc-500">○</span>
              )}
            </div>
            {showThinkingToggle && (
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-zinc-800">
                <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={prefs.useThinking !== false}
                    onChange={(e) => onToggleThinking?.(e.target.checked)}
                    className="rounded border-zinc-750 bg-zinc-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-900 cursor-pointer h-3.5 w-3.5"
                  />
                  <span>Use model thinking</span>
                </label>
                {thinkingHint && (
                  <p className="text-[10px] text-zinc-500 pl-5">{thinkingHint}</p>
                )}
              </div>
            )}
            {showToolsInfo && (
              <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-zinc-800">
                {showExperimentalToolsToggle && (
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={prefs.experimentalToolsEnabled === true}
                      onChange={(e) => onToggleExperimentalTools?.(e.target.checked)}
                      className="rounded border-zinc-750 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 cursor-pointer h-3.5 w-3.5"
                    />
                    <span>Experimental tool calling</span>
                  </label>
                )}
                {toolsHint && (
                  <p
                    className={cn(
                      "text-[10px] text-zinc-500",
                      showExperimentalToolsToggle && "pl-5",
                    )}
                  >
                    {toolsHint}
                  </p>
                )}
              </div>
            )}
            {setupPhase === "ready" && (
              <button
                type="button"
                onClick={() => void onResetPreferences()}
                className="mt-3 w-full text-left px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center gap-2"
              >
                <RotateCcw className="h-3 w-3" />
                Reset model choices
              </button>
            )}
          </div>
        </div>
      )}

      <div className="fixed top-4 right-4 flex gap-2 z-40">
        {hasMessages && (
          <button
            onClick={onClearConversation}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          ref={debugToggleRef}
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
          title="Toggle debug panel"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </>
  )
}
