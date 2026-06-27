import {
  loadPiperVoice,
  synthesizePiper,
  unloadPiper,
} from "@/lib/tts-providers/piper"
import {
  loadSupertonicEngine,
  loadSupertonicVoice,
  synthesizeSupertonic,
  unloadSupertonic,
} from "@/lib/tts-providers/supertonic"
import type {
  LoadProgressCallback,
  SupertonicVoice,
  SynthesisResult,
  TTSEngine,
  TTSLanguage,
} from "@/lib/tts-types"
import { getDefaultVoiceForEngine } from "@/lib/tts-voices"

export type { TTSEngine, TTSVoice, TTSLanguage, SupertonicVoice } from "@/lib/tts-types"
export { detectLanguage } from "@/lib/tts-providers/supertonic"

let activeEngine: TTSEngine | null = null

export async function loadTTSEngine(
  engine: TTSEngine,
  voice: string,
  progressCallback?: LoadProgressCallback,
): Promise<{ backend: "webgpu" | "wasm" }> {
  if (activeEngine && activeEngine !== engine) {
    await unloadTTSEngine(activeEngine)
  }

  activeEngine = engine

  if (engine === "supertonic") {
    const { backend } = await loadSupertonicEngine(progressCallback)
    await loadSupertonicVoice((voice || getDefaultVoiceForEngine("supertonic")) as SupertonicVoice)
    return { backend }
  }

  return loadPiperVoice(voice || getDefaultVoiceForEngine("piper"), progressCallback)
}

export async function loadVoice(
  engine: TTSEngine,
  voice: string,
  progressCallback?: LoadProgressCallback,
): Promise<void> {
  if (engine === "supertonic") {
    await loadSupertonicVoice(voice as SupertonicVoice)
    return
  }

  await loadPiperVoice(voice, progressCallback)
  activeEngine = engine
}

export async function synthesizeSpeech(
  engine: TTSEngine,
  text: string,
  voice: string,
  options: {
    language?: TTSLanguage
    quality?: number
    speed?: number
    live?: boolean
    onProgress?: (step: number, total: number) => void
  } = {},
): Promise<SynthesisResult> {
  if (engine === "supertonic") {
    return synthesizeSupertonic(text, voice as SupertonicVoice, options)
  }

  return synthesizePiper(text)
}

export async function unloadTTSEngine(engine: TTSEngine): Promise<void> {
  if (engine === "supertonic") {
    await unloadSupertonic()
  } else {
    await unloadPiper()
  }

  if (activeEngine === engine) {
    activeEngine = null
  }
}

export async function unloadAllTTS(): Promise<void> {
  await Promise.all([unloadSupertonic(), unloadPiper()])
  activeEngine = null
}

export function getActiveTTSEngine(): TTSEngine | null {
  return activeEngine
}
