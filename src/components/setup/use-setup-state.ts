import { useEffect, useMemo, useState } from 'react'
import { getLLMOption, getLLMVariant } from '@/lib/llm-models'
import {
  getThinkingToggleHint,
  getToolsHint,
} from '@/lib/llm/engine-features'
import type { TTSEngine, TTSLanguage } from '@/lib/tts-types'
import {
  getDefaultVoiceForEngine,
  PIPER_VOICES,
  SUPERTRONIC_VOICES,
  TTS_ENGINE_OPTIONS,
} from '@/lib/tts-voices'
import { defaultHindiTypingForLanguage } from '@/lib/user-preferences'
import { SETUP_PRESETS } from './presets'
import type { SetupPreset } from './presets'
import {
  computeDownloadBreakdown,
  computeTotalDownloadMb,
  formatDownloadSize,
} from './download-estimate'
import type { InteractionMode, SetupSelection } from './types'

function useStateSelection<T>(initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    setValue(initial)
  }, [initial])
  return [value, setValue]
}

export function useSetupState(initial: SetupSelection) {
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

  const handleSelectPreset = (preset: SetupPreset) => {
    setVariantId(preset.variantId)
    setSttModelId(preset.sttModelId)
    setTtsEngine(preset.ttsEngine)

    const targetVoices = preset.ttsEngine === 'supertonic' ? SUPERTRONIC_VOICES : PIPER_VOICES
    const defaultVoice = targetVoices.find((v) => v.id === preset.ttsVoice) || targetVoices[0]
    setTtsVoice(defaultVoice.id)

    setTtsLanguage(preset.ttsLanguage)
    setUseThinking(preset.useThinking)
    setExperimentalToolsEnabled(preset.experimentalToolsEnabled)
    // Do not override interaction mode — presets configure models only.
    // sttEnabled/ttsEnabled stay as set in step 1 (wizard) or the mode picker (blueprint).
  }

  const activePresetId = useMemo(() => {
    for (const p of SETUP_PRESETS) {
      if (variantId !== p.variantId) continue
      if (useThinking !== p.useThinking) continue
      if (experimentalToolsEnabled !== p.experimentalToolsEnabled) continue
      if (sttEnabled && sttModelId !== p.sttModelId) continue
      if (ttsEnabled && ttsEngine !== p.ttsEngine) continue
      return p.id
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

  const activeMode: InteractionMode = useMemo(() => {
    if (sttEnabled && ttsEnabled) return 'call'
    if (sttEnabled) return 'voice-to-text'
    if (ttsEnabled) return 'text-to-voice'
    return 'text'
  }, [sttEnabled, ttsEnabled])

  const handleModeChange = (mode: InteractionMode) => {
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

  const voiceSizeLabel =
    'sizeLabel' in selectedVoice ? (selectedVoice as { sizeLabel: string }).sizeLabel : '~60 MB'

  const estimatedDownload = useMemo(
    () =>
      computeDownloadBreakdown({
        sttEnabled,
        sttModelId,
        ttsEnabled,
        ttsEngine,
        selectedVoiceSizeLabel: voiceSizeLabel,
        llmSizeLabel: selectedLlm.sizeLabel,
      }),
    [sttEnabled, sttModelId, ttsEnabled, ttsEngine, voiceSizeLabel, selectedLlm.sizeLabel],
  )

  const totalDownloadMb = useMemo(
    () =>
      computeTotalDownloadMb({
        sttEnabled,
        sttModelId,
        ttsEnabled,
        ttsEngine,
        selectedVoiceSizeLabel: voiceSizeLabel,
        llmSizeLabel: selectedLlm.sizeLabel,
      }),
    [sttEnabled, sttModelId, ttsEnabled, ttsEngine, voiceSizeLabel, selectedLlm.sizeLabel],
  )

  const totalDownloadSizeLabel = formatDownloadSize(totalDownloadMb)

  const buildSelection = (): SetupSelection => ({
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

  return {
    variantId,
    setVariantId,
    sttEnabled,
    setSttEnabled,
    sttModelId,
    setSttModelId,
    ttsEnabled,
    setTtsEnabled,
    ttsEngine,
    setTtsEngine,
    ttsVoice,
    setTtsVoice,
    ttsLanguage,
    setTtsLanguage,
    hindiTypingEnabled,
    setHindiTypingEnabled,
    useThinking,
    setUseThinking,
    experimentalToolsEnabled,
    setExperimentalToolsEnabled,
    selectedLlm,
    selectedVariant,
    thinkingHint,
    toolsHint,
    selectedTtsEngine,
    voices,
    selectedVoice,
    handleEngineChange,
    handleTtsLanguageChange,
    handleSelectPreset,
    activePresetId,
    activeMode,
    handleModeChange,
    estimatedDownload,
    totalDownloadMb,
    totalDownloadSizeLabel,
    buildSelection,
  }
}

export type SetupState = ReturnType<typeof useSetupState>
