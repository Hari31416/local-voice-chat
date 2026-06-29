import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DEFAULT_LLM_ID, LLM_OPTIONS } from "@/lib/llm-models"
import { STT_OPTIONS } from "@/lib/stt-models"
import type { STTModelOption } from "@/lib/stt-models"
import type { TTSEngine, TTSLanguage } from "@/lib/tts-types"
import {
  getDefaultVoiceForEngine,
  PIPER_VOICES,
  SUPERTRONIC_VOICES,
  TTS_ENGINE_OPTIONS,
} from "@/lib/tts-voices"
import { cn } from "@/lib/utils"
import { defaultHindiTypingForLanguage } from "@/lib/user-preferences"
import { RotateCcw } from "lucide-react"

// ── STT grouping helpers ──────────────────────────────────────────────────────

const STT_ENGINE_GROUP_LABELS: Record<string, string> = {
  whisper: 'Whisper',
  distil: 'Distil-Whisper',
  moonshine: 'Moonshine',
  wav2vec2: 'Wav2Vec2 / MMS',
}

function getModelGroup(opt: STTModelOption): string {
  if (opt.id.startsWith('distil')) return 'distil'
  if (opt.id.startsWith('whisper')) return 'whisper'
  if (opt.id.startsWith('moonshine')) return 'moonshine'
  if (opt.id.startsWith('wav2vec2')) return 'wav2vec2'
  return 'other'
}

function groupSTTOptions(options: STTModelOption[]): { label: string; opts: STTModelOption[] }[] {
  const map = new Map<string, STTModelOption[]>()
  for (const opt of options) {
    const key = getModelGroup(opt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(opt)
  }
  return Array.from(map.entries()).map(([key, opts]) => ({
    label: STT_ENGINE_GROUP_LABELS[key] ?? key,
    opts,
  }))
}

function sttOptionLabel(opt: STTModelOption): string {
  return `${opt.name} (${opt.sizeLabel})`
}

const SUPERTRONIC_LANGUAGES: { id: TTSLanguage; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "na", label: "Hinglish" },
]

export interface SetupSelection {
  llmId: string
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  hindiTypingEnabled: boolean
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
  const [sttEnabled, setSttEnabled] = useStateSelection(initial.sttEnabled)
  const [sttModelId, setSttModelId] = useStateSelection(initial.sttModelId)
  const [ttsEnabled, setTtsEnabled] = useStateSelection(initial.ttsEnabled)
  const [ttsEngine, setTtsEngine] = useStateSelection<TTSEngine>(initial.ttsEngine)
  const [ttsVoice, setTtsVoice] = useStateSelection(initial.ttsVoice)
  const [ttsLanguage, setTtsLanguage] = useStateSelection<TTSLanguage>(initial.ttsLanguage)
  const [hindiTypingEnabled, setHindiTypingEnabled] = useStateSelection(
    initial.hindiTypingEnabled ?? defaultHindiTypingForLanguage(initial.ttsLanguage),
  )

  const selectedLlm = LLM_OPTIONS.find((o) => o.id === llmId) || LLM_OPTIONS[0]
  const selectedTtsEngine = TTS_ENGINE_OPTIONS.find((o) => o.id === ttsEngine)!
  const voices = ttsEngine === "supertonic" ? SUPERTRONIC_VOICES : PIPER_VOICES
  const selectedVoice = voices.find((v) => v.id === ttsVoice) || voices[0]

  const handleEngineChange = (engine: TTSEngine) => {
    setTtsEngine(engine)
    setTtsVoice(getDefaultVoiceForEngine(engine))
  }

  const handleTtsLanguageChange = (language: TTSLanguage) => {
    setTtsLanguage(language)
    if (defaultHindiTypingForLanguage(language)) {
      setHindiTypingEnabled(true)
    }
  }

  const estimatedDownload = (() => {
    const selectedStt = STT_OPTIONS.find((s) => s.id === sttModelId) || STT_OPTIONS[2]
    const stt = sttEnabled ? selectedStt.sizeLabel : null
    const llm = selectedLlm.sizeLabel
    const tts = !ttsEnabled
      ? null
      : ttsEngine === "supertonic"
        ? "~400 MB"
        : "sizeLabel" in selectedVoice
          ? selectedVoice.sizeLabel
          : "~60 MB"
    return { stt, tts, llm }
  })()

  return (
    <div className="text-left space-y-5 max-w-3xl mx-auto w-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">
          WebVoice
        </h1>
        <p className="text-zinc-400 text-xs">
          Select your local models. Everything runs offline in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
        {/* Left Column: LLM Selection */}
        <section className="sm:col-span-7 space-y-2.5">
          <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Language model</h2>
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
            {LLM_OPTIONS.map((opt) => {
              const isRecommended = opt.id === DEFAULT_LLM_ID
              const sizeInGB = parseFloat(opt.sizeLabel.replace(/[~ GB]/g, ''))
              const isHeavyForMobile = isMobile && sizeInGB >= 1.5
              const selected = llmId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLlmId(opt.id)}
                  className={cn(
                    'w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer',
                    selected
                      ? 'bg-zinc-800/80 border-zinc-500 ring-1 ring-zinc-500/25'
                      : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700',
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white text-xs">{opt.name}</span>
                      <div className="flex items-center gap-1">
                        {isRecommended && (
                          <span className="bg-zinc-800 text-zinc-300 text-[8px] font-bold px-1 py-0.5 rounded border border-zinc-700">
                            Rec
                          </span>
                        )}
                        {opt.supportsVision && (
                          <span className="bg-zinc-800 text-zinc-300 text-[8px] font-medium px-1 py-0.5 rounded border border-zinc-700">
                            Vision
                          </span>
                        )}
                        {isHeavyForMobile && (
                          <span className="bg-red-955/40 text-red-400 text-[8px] font-bold px-1 py-0.5 rounded border border-red-900/30">
                            Heavy
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 line-clamp-1">
                      {opt.backend === 'gemma4'
                        ? 'Multimodal WebGPU model with vision'
                        : opt.backend === 'lfm2'
                          ? 'Optimized Liquid hybrid model (extreme speed)'
                          : 'Optimized text-only WebLLM'}
                    </p>
                  </div>
                  <div className="text-[11px] font-bold text-zinc-400">{opt.sizeLabel}</div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Right Column: Voice I/O & Launch */}
        <div className="sm:col-span-5 space-y-4">
          <section className="space-y-2">
            <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Voice input & output</h2>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSttEnabled(!sttEnabled)}
                className={cn(
                  'p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer',
                  sttEnabled
                    ? 'bg-zinc-800/80 border-zinc-500 ring-1 ring-zinc-500/25'
                    : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 opacity-70',
                )}
              >
                <div className="font-semibold text-white text-xs">Speech recognition</div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {sttEnabled
                    ? `On · ${STT_OPTIONS.find((s) => s.id === sttModelId)?.sizeLabel ?? '~150 MB'}`
                    : 'Skipped · text input only'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={cn(
                  'p-2.5 rounded-lg border text-left transition-all duration-150 cursor-pointer',
                  ttsEnabled
                    ? 'bg-zinc-800/80 border-zinc-500 ring-1 ring-zinc-500/25'
                    : 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 opacity-70',
                )}
              >
                <div className="font-semibold text-white text-xs">Text-to-speech</div>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {ttsEnabled ? 'On · spoken replies' : 'Skipped · text replies only'}
                </p>
              </button>
            </div>
            {sttEnabled && (
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Speech recognition model</label>
                <select
                  value={sttModelId}
                  onChange={(e) => setSttModelId(e.target.value)}
                  className="w-full bg-zinc-905 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-zinc-700 focus:border-zinc-600 transition-colors"
                >
                  {groupSTTOptions(STT_OPTIONS).map(({ label, opts }) => (
                    <optgroup key={label} label={label} className="bg-zinc-950">
                      {opts.map((opt) => (
                        <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
                          {sttOptionLabel(opt)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
            {sttEnabled && !ttsEnabled && (
              <p className="text-[10px] text-zinc-500">
                Mic button will be used for voice input without call mode.
              </p>
            )}
            {sttEnabled && ttsEnabled && (
              <p className="text-[10px] text-zinc-500">
                Full call mode with continuous voice conversation.
              </p>
            )}
          </section>

          {ttsEnabled && (
            <>
          <section className="space-y-2">
            <h2 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Text-to-speech engine</h2>
            <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-850">
              {TTS_ENGINE_OPTIONS.map((opt) => {
                const selected = ttsEngine === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleEngineChange(opt.id)}
                    className={cn(
                      'py-1 px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer truncate',
                      selected
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    {opt.name === 'Supertonic 3' ? 'Supertonic' : opt.name}
                  </button>
                )
              })}
            </div>
          </section>

          <div className={cn(
            'grid gap-3',
            ttsEngine === 'supertonic' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          )}>
            {ttsEngine === 'supertonic' && (
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Language</label>
                <select
                  value={ttsLanguage}
                  onChange={(e) => handleTtsLanguageChange(e.target.value as TTSLanguage)}
                  className="w-full bg-zinc-905 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-zinc-700 focus:border-zinc-600 transition-colors"
                >
                  {SUPERTRONIC_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id} className="bg-zinc-950 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Voice</label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="w-full bg-zinc-905 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-zinc-700 focus:border-zinc-600 transition-colors"
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id} className="bg-zinc-950 text-white">
                    {voice.name} ({voice.desc}){'sizeLabel' in voice ? ` - ${voice.sizeLabel}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
            </>
          )}

          <div className="bg-zinc-900/60 border border-zinc-850 rounded-lg p-2.5 text-[10px] text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-300 text-xs mb-1.5">Estimated download</div>
            {estimatedDownload.stt && (
            <div className="flex justify-between">
              <span>Speech recognition</span>
              <span className="text-zinc-300 font-medium">{estimatedDownload.stt}</span>
            </div>
            )}
            {estimatedDownload.tts && (
            <div className="flex justify-between">
              <span>TTS ({selectedTtsEngine.name})</span>
              <span className="text-zinc-300 font-medium">{estimatedDownload.tts}</span>
            </div>
            )}
            <div className="flex justify-between">
              <span>LLM ({selectedLlm.name})</span>
              <span className="text-zinc-300 font-medium">{estimatedDownload.llm}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 h-9 rounded-lg transition-colors cursor-pointer"
              onClick={() =>
                onStart({
                  llmId,
                  sttEnabled,
                  sttModelId,
                  ttsEnabled,
                  ttsEngine,
                  ttsVoice,
                  ttsLanguage: ttsEngine === 'supertonic' ? ttsLanguage : 'auto',
                  hindiTypingEnabled,
                })
              }
            >
              {hasSavedConfig ? 'Load & start' : 'Load models'}
            </Button>
            {hasSavedConfig && onReset && (
              <Button
                type="button"
                variant="ghost"
                onClick={onReset}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 text-xs px-2.5 h-9 gap-1.5 rounded-lg cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
