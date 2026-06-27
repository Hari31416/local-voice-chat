import type { SupertonicLang } from "@/lib/supertonic3/engine"

export type TTSEngine = "supertonic" | "piper"
export type SupertonicVoice = "F1" | "F2" | "F3" | "F4" | "F5" | "M1" | "M2" | "M3" | "M4" | "M5"
export type TTSVoice = SupertonicVoice | string
export type TTSLanguage = "auto" | SupertonicLang

export interface SynthesisResult {
  audio: Float32Array
  sampling_rate: number
  language?: SupertonicLang | string
}

export type LoadProgressCallback = (info: {
  model: string
  progress: number
  backend?: "webgpu" | "wasm"
}) => void

export interface SupertonicVoiceOption {
  id: SupertonicVoice
  name: string
  desc: string
}

export interface PiperVoiceOption {
  id: string
  name: string
  desc: string
  language: string
  sizeLabel: string
  /** Relative path under rhasspy/piper-voices when not in the Piper library catalog */
  rhasspyPath?: string
}
