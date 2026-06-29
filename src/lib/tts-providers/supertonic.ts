import {
  detectLanguage,
  loadTextToSpeech,
  loadVoiceStyle,
  TextToSpeech,
  type Style,
  voiceStyleUrl,
  ONNX_DIR,
} from "@/lib/supertonic3/engine"
import type { LoadProgressCallback, SupertonicVoice, SynthesisResult, TTSLanguage } from "@/lib/tts-types"

const DEFAULT_QUALITY = 8
export const SUPERTRONIC_LIVE_QUALITY = 5
const DEFAULT_SPEED = 1.05

let enginePromise: Promise<{
  textToSpeech: TextToSpeech
  backend: "webgpu" | "wasm"
}> | null = null

let activeEngine: {
  textToSpeech: TextToSpeech
  backend: "webgpu" | "wasm"
} | null = null

const styleCache = new Map<SupertonicVoice, Style>()

export async function loadSupertonicEngine(progressCallback?: LoadProgressCallback) {
  if (enginePromise) return enginePromise

  enginePromise = loadTextToSpeech(ONNX_DIR, (info) => {
    progressCallback?.({
      model: info.model,
      progress: Math.round((info.current / info.total) * 100),
      backend: info.backend,
    })
  }).then((loaded) => {
    activeEngine = loaded
    return loaded
  })

  return enginePromise
}

export async function loadSupertonicVoice(voice: SupertonicVoice): Promise<Style> {
  const cached = styleCache.get(voice)
  if (cached) return cached

  const style = await loadVoiceStyle([voiceStyleUrl(voice)])
  styleCache.set(voice, style)
  return style
}

export async function synthesizeSupertonic(
  text: string,
  voice: SupertonicVoice,
  options: {
    language?: TTSLanguage
    quality?: number
    speed?: number
    live?: boolean
    onProgress?: (step: number, total: number) => void
  } = {},
): Promise<SynthesisResult> {
  const { textToSpeech } = await loadSupertonicEngine()
  const style = await loadSupertonicVoice(voice)

  const lang =
    options.language && options.language !== "auto" ? options.language : detectLanguage(text)

  const quality = options.quality ?? (options.live ? SUPERTRONIC_LIVE_QUALITY : DEFAULT_QUALITY)

  const { wav, duration } = await textToSpeech.call(
    text,
    lang,
    style,
    quality,
    options.speed ?? DEFAULT_SPEED,
    0.3,
    options.onProgress,
  )

  const wavLen = Math.floor(textToSpeech.sampleRate * duration[0])
  const trimmed = wav.slice(0, wavLen)

  return {
    audio: Float32Array.from(trimmed),
    sampling_rate: textToSpeech.sampleRate,
    language: lang,
  }
}

export async function unloadSupertonic(): Promise<void> {
  if (activeEngine) {
    try {
      await activeEngine.textToSpeech.release()
    } catch (error) {
      console.warn('[Supertonic] Failed to release ONNX sessions:', error)
    }
    activeEngine = null
  }
  enginePromise = null
  styleCache.clear()
}

export { detectLanguage }
