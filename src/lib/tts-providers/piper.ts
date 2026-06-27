import { TtsSession } from "@realtimex/piper-tts-web"
import { decodeWavBlob } from "@/lib/piper/wav"
import { createRhasspyPiperSession, type PiperSession } from "@/lib/piper/rhasspy-session"
import type { LoadProgressCallback, SynthesisResult } from "@/lib/tts-types"
import { getPiperVoice } from "@/lib/tts-voices"

type ActiveSession =
  | (PiperSession & { kind: "rhasspy" })
  | { kind: "library"; session: TtsSession; backend: "wasm" }

let active: ActiveSession | null = null
let activeVoiceId: string | null = null

function toProgress(
  progressCallback: LoadProgressCallback | undefined,
  model: string,
  loaded: number,
  total: number,
  backend: "webgpu" | "wasm" = "wasm",
) {
  if (!progressCallback || total <= 0) return
  progressCallback({
    model,
    progress: Math.min(100, Math.round((loaded / total) * 100)),
    backend,
  })
}

export async function loadPiperVoice(
  voiceId: string,
  progressCallback?: LoadProgressCallback,
): Promise<{ backend: "webgpu" | "wasm" }> {
  if (activeVoiceId === voiceId && active) {
    return {
      backend: active.kind === "rhasspy" ? active.backend : active.backend,
    }
  }

  await unloadPiper()

  const voice = getPiperVoice(voiceId)
  if (!voice) {
    throw new Error(`Unknown Piper voice: ${voiceId}`)
  }

  if (voice.rhasspyPath) {
    const session = await createRhasspyPiperSession(voice.rhasspyPath, progressCallback)
    active = { ...session, kind: "rhasspy" }
    activeVoiceId = voiceId
    return { backend: session.backend }
  }

  const session = await TtsSession.create({
    voiceId: voiceId as Parameters<typeof TtsSession.create>[0]["voiceId"],
    progress: (p) => toProgress(progressCallback, "Piper voice model", p.loaded, p.total),
  })
  active = { kind: "library", session, backend: "wasm" }
  activeVoiceId = voiceId
  return { backend: "wasm" }
}

export async function synthesizePiper(text: string): Promise<SynthesisResult> {
  if (!active) {
    throw new Error("Piper TTS not loaded")
  }

  const voice = activeVoiceId ? getPiperVoice(activeVoiceId) : undefined

  if (active.kind === "rhasspy") {
    const { pcm, sampleRate } = await active.predictPcm(text)
    return {
      audio: Float32Array.from(pcm),
      sampling_rate: sampleRate,
      language: voice?.language,
    }
  }

  const blob = await active.session.predict(text)
  const { audio, sampling_rate } = await decodeWavBlob(blob)
  return {
    audio,
    sampling_rate,
    language: voice?.language,
  }
}

export async function unloadPiper(): Promise<void> {
  if (active?.kind === "rhasspy") {
    await active.unload()
  }
  active = null
  activeVoiceId = null
}

export function getActivePiperVoice(): string | null {
  return activeVoiceId
}
