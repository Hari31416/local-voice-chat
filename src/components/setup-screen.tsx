import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DEFAULT_LLM_ID, LLM_OPTIONS } from "@/lib/llm-models"
import type { TTSEngine, TTSLanguage } from "@/lib/tts-types"
import {
  getDefaultVoiceForEngine,
  PIPER_VOICES,
  SUPERTRONIC_VOICES,
  TTS_ENGINE_OPTIONS,
} from "@/lib/tts-voices"
import { cn } from "@/lib/utils"
import { RotateCcw } from "lucide-react"

const SUPERTRONIC_LANGUAGES: { id: TTSLanguage; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "na", label: "Hinglish" },
]

export interface SetupSelection {
  llmId: string
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
}

interface SetupScreenProps {
  initial: SetupSelection
  isMobile: boolean
  hasSavedConfig: boolean
  onStart: (selection: SetupSelection) => void
  onReset?: () => void
}

function useStateSelection<T>(initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    setValue(initial)
  }, [initial])
  return [value, setValue]
}

export function SetupScreen({
  initial,
  isMobile,
  hasSavedConfig,
  onStart,
  onReset,
}: SetupScreenProps) {
  const [llmId, setLlmId] = useStateSelection(initial.llmId)
  const [ttsEngine, setTtsEngine] = useStateSelection<TTSEngine>(initial.ttsEngine)
  const [ttsVoice, setTtsVoice] = useStateSelection(initial.ttsVoice)
  const [ttsLanguage, setTtsLanguage] = useStateSelection<TTSLanguage>(initial.ttsLanguage)

  const selectedLlm = LLM_OPTIONS.find((o) => o.id === llmId) || LLM_OPTIONS[0]
  const selectedTtsEngine = TTS_ENGINE_OPTIONS.find((o) => o.id === ttsEngine)!
  const voices = ttsEngine === "supertonic" ? SUPERTRONIC_VOICES : PIPER_VOICES
  const selectedVoice = voices.find((v) => v.id === ttsVoice) || voices[0]

  const handleEngineChange = (engine: TTSEngine) => {
    setTtsEngine(engine)
    setTtsVoice(getDefaultVoiceForEngine(engine))
  }

  const estimatedDownload = (() => {
    const stt = "~150 MB"
    const llm = selectedLlm.sizeLabel
    const tts =
      ttsEngine === "supertonic"
        ? "~400 MB"
        : "sizeLabel" in selectedVoice
          ? selectedVoice.sizeLabel
          : "~60 MB"
    return { stt, tts, llm }
  })()

  return (
    <div className="text-left space-y-6 max-w-xl mx-auto w-full">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          WebVoice
        </h1>
        <p className="text-zinc-400 text-sm">
          Choose your models before anything downloads — everything runs locally in your browser.
        </p>
      </div>

      <section>
        <h2 className="text-zinc-300 text-sm font-semibold mb-2">Language model</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1">
          {LLM_OPTIONS.map((opt) => {
            const isRecommended = opt.id === DEFAULT_LLM_ID
            const sizeInGB = parseFloat(opt.sizeLabel.replace(/[~ GB]/g, ""))
            const isHeavyForMobile = isMobile && sizeInGB >= 1.5
            const selected = llmId === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setLlmId(opt.id)}
                className={cn(
                  "flex flex-col justify-between p-3 rounded-xl border text-left transition-all duration-200",
                  selected
                    ? "bg-purple-950/30 border-purple-500/60 ring-1 ring-purple-500/30"
                    : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700",
                  isRecommended && "sm:col-span-2",
                )}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{opt.name}</span>
                    <div className="flex items-center gap-1">
                      {isRecommended && (
                        <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                          Rec
                        </span>
                      )}
                      {opt.supportsVision && (
                        <span className="bg-green-500/10 text-green-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-green-500/20">
                          Vision
                        </span>
                      )}
                      {isHeavyForMobile && (
                        <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30">
                          Heavy
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal line-clamp-1">
                    {opt.backend === "gemma4"
                      ? "Multimodal WebGPU model with vision."
                      : "Browser-optimized text-only WebLLM."}
                  </p>
                </div>
                <div className="flex items-center justify-between w-full pt-1.5 border-t border-zinc-800/50 mt-2">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{opt.backend}</span>
                  <span className="text-[11px] font-bold text-zinc-300">{opt.sizeLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-zinc-300 text-sm font-semibold mb-2">Text-to-speech engine</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TTS_ENGINE_OPTIONS.map((opt) => {
            const selected = ttsEngine === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleEngineChange(opt.id)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  selected
                    ? "bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/30"
                    : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700",
                )}
              >
                <div className="font-semibold text-white text-sm mb-1">{opt.name}</div>
                <p className="text-[11px] text-zinc-400 leading-normal mb-2">{opt.desc}</p>
                <span className="text-[11px] font-bold text-zinc-300">{opt.sizeLabel}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-zinc-300 text-sm font-semibold">TTS voice</h2>
          {ttsEngine === "supertonic" && (
            <div className="flex gap-1">
              {SUPERTRONIC_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setTtsLanguage(lang.id)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
                    ttsLanguage === lang.id
                      ? "bg-zinc-700 border-zinc-600 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
          {voices.map((voice) => {
            const selected = ttsVoice === voice.id
            return (
              <button
                key={voice.id}
                type="button"
                onClick={() => setTtsVoice(voice.id)}
                className={cn(
                  "p-3 rounded-xl border text-left transition-all",
                  selected
                    ? "bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/30"
                    : "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700",
                )}
              >
                <div className="font-medium text-white text-sm">{voice.name}</div>
                <div className="text-[11px] text-zinc-500">{voice.desc}</div>
                {"sizeLabel" in voice && (
                  <div className="text-[10px] text-zinc-600 mt-1">{voice.sizeLabel}</div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1">
        <div className="font-semibold text-zinc-300 text-xs mb-1.5">Estimated first-time download</div>
        <div className="flex justify-between">
          <span>Speech recognition (Whisper + VAD)</span>
          <span className="text-zinc-300">{estimatedDownload.stt}</span>
        </div>
        <div className="flex justify-between">
          <span>TTS ({selectedTtsEngine.name})</span>
          <span className="text-zinc-300">{estimatedDownload.tts}</span>
        </div>
        <div className="flex justify-between">
          <span>LLM ({selectedLlm.name})</span>
          <span className="text-zinc-300">{estimatedDownload.llm}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold"
          onClick={() =>
            onStart({
              llmId,
              ttsEngine,
              ttsVoice,
              ttsLanguage: ttsEngine === "supertonic" ? ttsLanguage : "auto",
            })
          }
        >
          {hasSavedConfig ? "Load models & start" : "Load models"}
        </Button>
        {hasSavedConfig && onReset && (
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            className="text-zinc-400 hover:text-zinc-200 gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset choices
          </Button>
        )}
      </div>
    </div>
  )
}
