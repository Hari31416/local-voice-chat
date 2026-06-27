import type { PiperVoiceOption, SupertonicVoiceOption } from "@/lib/tts-types"

export const SUPERTRONIC_VOICES: SupertonicVoiceOption[] = [
  { id: "F1", name: "Female 1", desc: "Calm, steady" },
  { id: "F2", name: "Female 2", desc: "Bright, cheerful" },
  { id: "F3", name: "Female 3", desc: "Professional" },
  { id: "F4", name: "Female 4", desc: "Confident" },
  { id: "F5", name: "Female 5", desc: "Gentle" },
  { id: "M1", name: "Male 1", desc: "Lively, upbeat" },
  { id: "M2", name: "Male 2", desc: "Deep, calm" },
  { id: "M3", name: "Male 3", desc: "Authoritative" },
  { id: "M4", name: "Male 4", desc: "Soft, friendly" },
  { id: "M5", name: "Male 5", desc: "Warm" },
]

/** Curated Piper voices from rhasspy/piper-voices (via @realtimex/piper-tts-web catalog + rhasspy-only) */
export const PIPER_VOICES: PiperVoiceOption[] = [
  {
    id: "en_US-lessac-medium",
    name: "Lessac",
    desc: "Clear American English, female",
    language: "English (US)",
    sizeLabel: "~60 MB",
  },
  {
    id: "en_US-hfc_female-medium",
    name: "HFC Female",
    desc: "Natural American English, female",
    language: "English (US)",
    sizeLabel: "~60 MB",
  },
  {
    id: "en_US-ryan-medium",
    name: "Ryan",
    desc: "American English, male",
    language: "English (US)",
    sizeLabel: "~60 MB",
  },
  {
    id: "en_US-amy-low",
    name: "Amy",
    desc: "Lightweight American English, female",
    language: "English (US)",
    sizeLabel: "~60 MB",
  },
  {
    id: "en_GB-cori-medium",
    name: "Cori",
    desc: "British English, female",
    language: "English (UK)",
    sizeLabel: "~61 MB",
  },
  {
    id: "hi_IN-pratham-medium",
    name: "Pratham",
    desc: "Hindi, male",
    language: "Hindi",
    sizeLabel: "~61 MB",
    rhasspyPath: "hi/hi_IN/pratham/medium/hi_IN-pratham-medium",
  },
  {
    id: "hi_IN-priyamvada-medium",
    name: "Priyamvada",
    desc: "Hindi, female",
    language: "Hindi",
    sizeLabel: "~61 MB",
    rhasspyPath: "hi/hi_IN/priyamvada/medium/hi_IN-priyamvada-medium",
  },
]

export const TTS_ENGINE_OPTIONS = [
  {
    id: "supertonic" as const,
    name: "Supertonic 3",
    desc: "Multilingual (31 languages incl. Hindi & Hinglish). Higher quality, larger download.",
    sizeLabel: "~400 MB",
  },
  {
    id: "piper" as const,
    name: "Piper",
    desc: "Lightweight per-voice models from rhasspy/piper-voices. One language per voice.",
    sizeLabel: "~15–75 MB per voice",
  },
]

export function getPiperVoice(voiceId: string): PiperVoiceOption | undefined {
  return PIPER_VOICES.find((v) => v.id === voiceId)
}

export function getSupertonicVoice(voiceId: string): SupertonicVoiceOption | undefined {
  return SUPERTRONIC_VOICES.find((v) => v.id === voiceId)
}

export function getDefaultVoiceForEngine(engine: "supertonic" | "piper"): string {
  return engine === "supertonic" ? "F1" : PIPER_VOICES[0].id
}

export type VoiceGender = "female" | "male"

export interface VoiceProfile {
  gender: VoiceGender
  label: string
}

export function getVoiceProfile(engine: "supertonic" | "piper", voiceId: string): VoiceProfile | null {
  if (engine === "supertonic") {
    const voice = getSupertonicVoice(voiceId)
    if (!voice) return null
    const gender: VoiceGender = voiceId.startsWith("M") ? "male" : "female"
    return { gender, label: voice.name }
  }

  const voice = getPiperVoice(voiceId)
  if (!voice) return null
  const desc = voice.desc.toLowerCase()
  if (desc.includes("female")) return { gender: "female", label: voice.name }
  if (desc.includes("male")) return { gender: "male", label: voice.name }
  return null
}
