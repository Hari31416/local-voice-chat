import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { LLMModelSelector } from '@/components/llm-model-selector'
import { getLLMOption, getLLMVariant } from '@/lib/llm-models'
import {
  getThinkingToggleHint,
  getToolsHint,
  variantSupportsExperimentalToolsToggle,
  variantSupportsThinkingToggle,
  variantSupportsToolsReliably,
} from '@/lib/llm/engine-features'
import { STT_OPTIONS } from '@/lib/stt-models'
import type { STTModelOption } from '@/lib/stt-models'
import type { TTSEngine, TTSLanguage } from '@/lib/tts-types'
import {
  getDefaultVoiceForEngine,
  PIPER_VOICES,
  SUPERTRONIC_VOICES,
  TTS_ENGINE_OPTIONS,
} from '@/lib/tts-voices'
import { cn } from '@/lib/utils'
import { defaultHindiTypingForLanguage } from '@/lib/user-preferences'
import {
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Brain,
  Check,
  PhoneCall,
  Mic,
  MessageSquare,
  ShieldCheck,
  Settings,
  Volume2,
} from 'lucide-react'

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
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'na', label: 'Hinglish' },
]

export interface SetupSelection {
  llmId: string
  variantId: string
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  hindiTypingEnabled: boolean
  useThinking: boolean
  experimentalToolsEnabled: boolean
}

interface SetupScreenProps {
  initial: SetupSelection
  isMobile: boolean
  hasSavedConfig: boolean
  onStart: (selection: SetupSelection) => void
  onReset?: () => void
}

// ── Setup Presets Definition ──────────────────────────────────────────────────

interface Preset {
  id: string
  name: string
  subtitle: string
  desc: string
  llmId: string
  variantId: string
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  useThinking: boolean
  experimentalToolsEnabled: boolean
  badge: string
  sizeLabel: string
  capabilities: string[]
  icon: typeof Zap | typeof Sparkles | typeof Brain
  gradient: string
}

const PRESETS: Preset[] = [
  {
    id: 'fast',
    name: 'Fast & Light',
    subtitle: 'Speed Optimized',
    desc: 'Optimized for lightning-fast replies on older devices.',
    llmId: 'lfm2-230m',
    variantId: 'lfm2-230m',
    sttEnabled: true,
    sttModelId: 'whisper-tiny',
    ttsEnabled: true,
    ttsEngine: 'piper',
    ttsVoice: 'en_US-lessac-medium',
    ttsLanguage: 'auto',
    useThinking: false,
    experimentalToolsEnabled: false,
    badge: 'Ultra Fast',
    sizeLabel: '~365 MB',
    capabilities: ['Text-Only LLM', 'Tiny STT', 'Piper TTS'],
    icon: Zap,
    gradient: 'from-cyan-500/10 to-blue-500/5 hover:from-cyan-500/15 hover:to-blue-500/10',
  },
  {
    id: 'balanced',
    name: 'Balanced Setup',
    subtitle: 'Recommended',
    desc: 'Perfect blend of speed, vision support, and natural voice.',
    llmId: 'qwen35-0.8b',
    variantId: 'qwen35-0.8b',
    sttEnabled: true,
    sttModelId: 'whisper-base',
    ttsEnabled: true,
    ttsEngine: 'supertonic',
    ttsVoice: 'F1',
    ttsLanguage: 'auto',
    useThinking: false,
    experimentalToolsEnabled: false,
    badge: 'Fast & Versatile',
    sizeLabel: '~1.3 GB',
    capabilities: ['Vision Support', 'Base STT', 'Supertonic Voice'],
    icon: Sparkles,
    gradient: 'from-violet-500/10 to-fuchsia-500/5 hover:from-violet-500/15 hover:to-fuchsia-500/10',
  },
  {
    id: 'flagship',
    name: 'Powerhouse',
    subtitle: 'Deep Intelligence',
    desc: 'Maximum reasoning accuracy, advanced features, and tools.',
    llmId: 'gemma-4-e2b',
    variantId: 'gemma-4-e2b-kernel',
    sttEnabled: true,
    sttModelId: 'whisper-base',
    ttsEnabled: true,
    ttsEngine: 'supertonic',
    ttsVoice: 'F1',
    ttsLanguage: 'auto',
    useThinking: true,
    experimentalToolsEnabled: true,
    badge: 'Flagship Model',
    sizeLabel: '~3.7 GB',
    capabilities: ['Deep Reasoning', 'Tool Calling', 'Supertonic Voice'],
    icon: Brain,
    gradient: 'from-amber-500/10 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/10',
  },
]

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
  const [variantId, setVariantId] = useStateSelection(initial.variantId || initial.llmId)
  const [sttEnabled, setSttEnabled] = useStateSelection(initial.sttEnabled)
  const [sttModelId, setSttModelId] = useStateSelection(initial.sttModelId)
  const [ttsEnabled, setTtsEnabled] = useStateSelection(initial.ttsEnabled)
  const [ttsEngine, setTtsEngine] = useStateSelection<TTSEngine>(initial.ttsEngine)
  const [ttsVoice, setTtsVoice] = useStateSelection(initial.ttsVoice)
  const [ttsLanguage, setTtsLanguage] = useStateSelection<TTSLanguage>(initial.ttsLanguage)
  const [hindiTypingEnabled, setHindiTypingEnabled] = useStateSelection(
    initial.hindiTypingEnabled ?? defaultHindiTypingForLanguage(initial.ttsLanguage),
  )
  const [useThinking, setUseThinking] = useStateSelection(initial.useThinking ?? true)
  const [experimentalToolsEnabled, setExperimentalToolsEnabled] = useStateSelection(
    initial.experimentalToolsEnabled ?? false,
  )

  const [showAdvanced, setShowAdvanced] = useState(false)

  const selectedLlm = getLLMOption(variantId)
  const selectedVariant = getLLMVariant(variantId)
  const thinkingHint = getThinkingToggleHint(selectedVariant)
  const toolsHint = getToolsHint(selectedVariant, experimentalToolsEnabled)
  const selectedTtsEngine = TTS_ENGINE_OPTIONS.find((o) => o.id === ttsEngine)!
  const voices = ttsEngine === 'supertonic' ? SUPERTRONIC_VOICES : PIPER_VOICES
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

  // ── Preset Selection Synchronizer ───────────────────────────────────────────

  const handleSelectPreset = (preset: Preset) => {
    setVariantId(preset.variantId)
    setSttModelId(preset.sttModelId)
    setTtsEngine(preset.ttsEngine)

    const targetVoices = preset.ttsEngine === 'supertonic' ? SUPERTRONIC_VOICES : PIPER_VOICES
    const defaultVoice = targetVoices.find((v) => v.id === preset.ttsVoice) || targetVoices[0]
    setTtsVoice(defaultVoice.id)

    setTtsLanguage(preset.ttsLanguage)
    setUseThinking(preset.useThinking)
    setExperimentalToolsEnabled(preset.experimentalToolsEnabled)
    setSttEnabled(preset.sttEnabled)
    setTtsEnabled(preset.ttsEnabled)
  }

  const activePresetId = useMemo(() => {
    for (const p of PRESETS) {
      if (
        variantId === p.variantId &&
        sttModelId === p.sttModelId &&
        ttsEngine === p.ttsEngine &&
        useThinking === p.useThinking &&
        experimentalToolsEnabled === p.experimentalToolsEnabled &&
        sttEnabled === p.sttEnabled &&
        ttsEnabled === p.ttsEnabled
      ) {
        return p.id
      }
    }
    return 'custom'
  }, [
    variantId,
    sttModelId,
    ttsEngine,
    useThinking,
    experimentalToolsEnabled,
    sttEnabled,
    ttsEnabled,
  ])

  // ── Interaction Modes ───────────────────────────────────────────────────────

  const activeMode: 'call' | 'voice-to-text' | 'text-to-voice' | 'text' = useMemo(() => {
    if (sttEnabled && ttsEnabled) return 'call'
    if (sttEnabled) return 'voice-to-text'
    if (ttsEnabled) return 'text-to-voice'
    return 'text'
  }, [sttEnabled, ttsEnabled])

  const handleModeChange = (mode: 'call' | 'voice-to-text' | 'text-to-voice' | 'text') => {
    if (mode === 'call') {
      setSttEnabled(true)
      setTtsEnabled(true)
    } else if (mode === 'voice-to-text') {
      setSttEnabled(true)
      setTtsEnabled(false)
    } else if (mode === 'text-to-voice') {
      setSttEnabled(false)
      setTtsEnabled(true)
    } else {
      setSttEnabled(false)
      setTtsEnabled(false)
    }
  }

  const INTERACTION_MODES = [
    {
      id: 'call' as const,
      label: 'Full Voice Call',
      desc: 'Speak naturally, listen to replies. Complete hands-free experience.',
      icon: PhoneCall,
    },
    {
      id: 'voice-to-text' as const,
      label: 'Voice to Text',
      desc: 'Speak to send inputs, but read text replies. Great for quiet environments.',
      icon: Mic,
    },
    {
      id: 'text-to-voice' as const,
      label: 'Text to Voice',
      desc: 'Type messages to send, but hear replies spoken aloud.',
      icon: Volume2,
    },
    {
      id: 'text' as const,
      label: 'Text Only Chat',
      desc: 'Standard typing chat. Local STT and TTS engines will not be loaded.',
      icon: MessageSquare,
    },
  ]

  // ── Estimated Size calculation ──────────────────────────────────────────────

  const estimatedDownload = useMemo(() => {
    const selectedStt = STT_OPTIONS.find((s) => s.id === sttModelId) || STT_OPTIONS[2]
    const stt = sttEnabled ? selectedStt.sizeLabel : null
    const llm = selectedLlm.sizeLabel
    const tts = !ttsEnabled
      ? null
      : ttsEngine === 'supertonic'
        ? '~400 MB'
        : 'sizeLabel' in selectedVoice
          ? selectedVoice.sizeLabel
          : '~60 MB'
    return { stt, tts, llm }
  }, [sttEnabled, sttModelId, ttsEnabled, ttsEngine, selectedVoice, selectedLlm])

  const parseSizeLabel = (label: string): number => {
    const val = parseFloat(label.replace(/[~ MBGB]/g, '').trim())
    if (label.includes('GB')) return val * 1024
    return val
  }

  const totalDownloadSizeLabel = useMemo(() => {
    let mb = 0
    if (sttEnabled) {
      const selectedStt = STT_OPTIONS.find((s) => s.id === sttModelId) || STT_OPTIONS[2]
      mb += parseSizeLabel(selectedStt.sizeLabel)
    }
    if (ttsEnabled) {
      if (ttsEngine === 'supertonic') {
        mb += 400
      } else {
        const sz = 'sizeLabel' in selectedVoice ? selectedVoice.sizeLabel : '~60 MB'
        mb += parseSizeLabel(sz)
      }
    }
    mb += parseSizeLabel(selectedLlm.sizeLabel)
    return mb >= 1000 ? `~${(mb / 1024).toFixed(1)} GB` : `~${mb} MB`
  }, [sttEnabled, sttModelId, ttsEnabled, ttsEngine, selectedVoice, selectedLlm])

  return (
    <div className="flex flex-col min-h-full flex-1 space-y-6 max-w-4xl mx-auto w-full text-left">
      <div className="text-center shrink-0">
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
          WebVoice Studio
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          Choose a private performance preset to run 100% private, local voice AI directly in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 items-start">
        {/* Left Column: Preset Setup */}
        <div className="md:col-span-7 space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
                1. Choose Setup Preset
              </h2>
              {activePresetId === 'custom' && (
                <span className="text-[10px] bg-zinc-800 text-zinc-300 font-semibold px-2 py-0.5 rounded-full border border-zinc-700/80">
                  🔧 Custom Config Active
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    id={`preset-${preset.id}`}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      'relative p-4 rounded-xl border text-left transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between h-[175px] select-none hover:-translate-y-0.5 hover:shadow-lg',
                      isActive
                        ? 'bg-gradient-to-br from-zinc-900 to-zinc-950 border-violet-500 shadow-lg shadow-violet-950/20 ring-1 ring-violet-500'
                        : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                    )}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-100 pointer-events-none" />
                    )}

                    {isActive && (
                      <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('h-4 w-4', isActive ? 'text-violet-400' : 'text-zinc-400')} />
                        <span className="font-bold text-white text-xs leading-none">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                        {preset.subtitle}
                      </p>
                    </div>

                    <p className="text-[10px] text-zinc-500 leading-normal line-clamp-3">
                      {preset.desc}
                    </p>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-800/50">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold text-zinc-300">{preset.badge}</span>
                        <span className="text-zinc-400 font-semibold">{preset.sizeLabel}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Advanced Accordion Toggle */}
          <div className="border-t border-zinc-900 pt-4">
            <button
              id="advanced-settings-toggle"
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer select-none"
            >
              <Settings className={cn('h-3.5 w-3.5 transition-transform duration-200', showAdvanced && 'rotate-45')} />
              <span>Customize models & engines (Advanced)</span>
              {showAdvanced ? (
                <ChevronUp className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Language Model Customization</h3>
                  <p className="text-[10px] text-zinc-500">Fine-tune variant, backend engines, and special capabilities.</p>
                </div>

                <div className="flex flex-col min-h-0 flex-1">
                  <LLMModelSelector
                    selectedId={variantId}
                    onSelect={setVariantId}
                    isMobile={isMobile}
                    variant="setup"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-900">
                  {variantSupportsThinkingToggle(selectedVariant) && (
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none text-xs">
                        <input
                          type="checkbox"
                          checked={useThinking}
                          onChange={(e) => setUseThinking(e.target.checked)}
                          className="rounded border-zinc-855 bg-zinc-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-zinc-900 cursor-pointer h-4 w-4"
                        />
                        <span>Enable model thinking / reasoning</span>
                      </label>
                      {thinkingHint && (
                        <p className="text-[10px] text-zinc-500 pl-6">{thinkingHint}</p>
                      )}
                    </div>
                  )}

                  {(variantSupportsExperimentalToolsToggle(selectedVariant) ||
                    variantSupportsToolsReliably(selectedVariant)) && (
                    <div className="flex flex-col gap-1">
                      {variantSupportsExperimentalToolsToggle(selectedVariant) && (
                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white select-none text-xs">
                          <input
                            type="checkbox"
                            checked={experimentalToolsEnabled}
                            onChange={(e) => setExperimentalToolsEnabled(e.target.checked)}
                            className="rounded border-zinc-855 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 cursor-pointer h-4 w-4"
                          />
                          <span>Enable experimental tool calling</span>
                        </label>
                      )}
                      {toolsHint && (
                        <p
                          className={cn(
                            'text-[10px] text-zinc-500',
                            variantSupportsExperimentalToolsToggle(selectedVariant) && 'pl-6'
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
        </div>

        {/* Right Column: Interaction Modes & Launch Summary */}
        <div className="md:col-span-5 space-y-6">
          <section className="space-y-3 bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl backdrop-blur-md">
            <h2 className="text-zinc-300 text-sm font-semibold uppercase tracking-wider">
              2. Interaction Mode
            </h2>

            <div className="grid grid-cols-1 gap-2.5">
              {INTERACTION_MODES.map((mode) => {
                const isActive = activeMode === mode.id
                const Icon = mode.icon
                return (
                  <button
                    key={mode.id}
                    id={`mode-${mode.id}`}
                    type="button"
                    onClick={() => handleModeChange(mode.id)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all duration-200 cursor-pointer select-none',
                      isActive
                        ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500'
                        : 'border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700'
                    )}
                  >
                    <div
                      className={cn(
                        'p-2 rounded-lg border flex-shrink-0 transition-colors',
                        isActive
                          ? 'bg-violet-600/20 border-violet-500/30 text-violet-400'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-white text-xs">{mode.label}</div>
                      <p className="text-[10px] text-zinc-400 leading-snug">{mode.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Voice Configuration options */}
            {(sttEnabled || ttsEnabled) && (
              <div className="space-y-3 pt-3 border-t border-zinc-800/60">
                <h3 className="text-zinc-300 text-xs font-semibold uppercase tracking-wider">Voice Configuration</h3>

                {sttEnabled && (
                  <div className="space-y-1">
                    <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Speech Recognition Model</label>
                    <select
                      id="stt-model-select"
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

                {ttsEnabled && (
                  <>
                    <div className="space-y-1">
                      <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Text-to-Speech Engine</label>
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
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {ttsEngine === 'supertonic' && (
                        <div className="space-y-1">
                          <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Language</label>
                          <select
                            id="tts-language-select"
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

                      <div className={cn('space-y-1', ttsEngine !== 'supertonic' && 'col-span-2')}>
                        <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Voice Speaker</label>
                        <select
                          id="tts-voice-select"
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
              </div>
            )}

            {sttEnabled && !ttsEnabled && (
              <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800 text-[10px] text-zinc-400">
                🎤 Speaking mode active. Your voice will be transcribed, but replies will be text-only.
              </div>
            )}
          </section>

          {/* Dynamic Download Size & Confirmation Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 space-y-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 mb-1">
              <span className="font-semibold text-zinc-200">Estimated download size</span>
              <span className="font-bold text-violet-400 text-sm">{totalDownloadSizeLabel}</span>
            </div>

            <div className="space-y-1.5">
              {estimatedDownload.stt && (
                <div className="flex justify-between text-[11px]">
                  <span>Speech recognition ({sttModelId})</span>
                  <span className="text-zinc-300 font-medium">{estimatedDownload.stt}</span>
                </div>
              )}
              {estimatedDownload.tts && (
                <div className="flex justify-between text-[11px]">
                  <span>TTS ({selectedTtsEngine.name})</span>
                  <span className="text-zinc-300 font-medium">{estimatedDownload.tts}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span>LLM ({selectedLlm.name})</span>
                <span className="text-zinc-300 font-medium">{estimatedDownload.llm}</span>
              </div>
            </div>

            <div className="flex items-start gap-1.5 text-[10px] text-zinc-500 pt-2.5 border-t border-zinc-800/50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>Models download once and cache locally in browser storage. Nothing is sent to external servers.</span>
            </div>
          </div>

          {/* Reasoning latency warning */}
          {activeMode === 'call' && useThinking && variantSupportsThinkingToggle(selectedVariant) && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Brain className="h-4 w-4" />
                <span>Reasoning may cause voice delays</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Model thinking/reasoning is enabled. In Full Voice Call mode, this will cause a 5-15 second delay before the assistant starts speaking.
              </p>
              <button
                type="button"
                onClick={() => setUseThinking(false)}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold py-1.5 px-3 rounded-lg border border-amber-500/30 text-center transition-colors cursor-pointer text-[11px]"
              >
                Turn off reasoning for faster replies
              </button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              id="btn-load-and-start"
              className="flex-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs py-2 h-10 rounded-lg transition-all duration-200 cursor-pointer shadow-lg hover:shadow-violet-600/10 active:scale-[0.98]"
              onClick={() =>
                onStart({
                  llmId: getLLMVariant(variantId).modelId,
                  variantId,
                  sttEnabled,
                  sttModelId,
                  ttsEnabled,
                  ttsEngine,
                  ttsVoice,
                  ttsLanguage: ttsEngine === 'supertonic' ? ttsLanguage : 'auto',
                  hindiTypingEnabled,
                  useThinking,
                  experimentalToolsEnabled,
                })
              }
            >
              {hasSavedConfig ? 'Load & start session' : 'Download & start session'}
            </Button>
            {hasSavedConfig && onReset && (
              <Button
                id="btn-reset-preferences"
                type="button"
                variant="ghost"
                onClick={onReset}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 text-xs px-3 h-10 gap-1.5 rounded-lg border border-transparent hover:border-zinc-850 cursor-pointer transition-colors"
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
