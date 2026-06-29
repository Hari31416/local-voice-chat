import { DEFAULT_LLM_ID, DEFAULT_VARIANT_ID, LLM_MODELS, getLLMModel, selectBestVariantForModel } from "@/lib/llm-models"
import { DEFAULT_STT_ID, STT_OPTIONS } from "@/lib/stt-models"
import type { TTSEngine, TTSLanguage } from "@/lib/tts-types"
import { getDefaultVoiceForEngine, getPiperVoice, getSupertonicVoice } from "@/lib/tts-voices"

const STORAGE_KEY = "voice_agent_preferences"
const LEGACY_LLM_KEY = "voice_agent_selected_model"

export interface UserPreferences {
  llmId: string
  variantId: string
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  /** Roman → Devanagari typing in the message box (Lipilekhika). */
  hindiTypingEnabled: boolean
  configured: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  llmId: DEFAULT_LLM_ID,
  variantId: DEFAULT_VARIANT_ID,
  sttEnabled: true,
  sttModelId: DEFAULT_STT_ID,
  ttsEnabled: true,
  ttsEngine: "supertonic",
  ttsVoice: "F1",
  ttsLanguage: "auto",
  hindiTypingEnabled: false,
  configured: false,
}

export function defaultHindiTypingForLanguage(language: TTSLanguage): boolean {
  return language === "hi" || language === "na"
}

function normalizePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const llmId = LLM_MODELS.some((m) => m.id === partial.llmId) ? partial.llmId! : DEFAULT_LLM_ID
  const model = getLLMModel(llmId)
  const variantId = (partial.variantId && model.variants.some((v) => v.id === partial.variantId))
    ? partial.variantId!
    : selectBestVariantForModel(model).id

  const sttModelId = STT_OPTIONS.some((o) => o.id === partial.sttModelId) ? partial.sttModelId! : DEFAULT_STT_ID
  const ttsEngine: TTSEngine = partial.ttsEngine === "piper" ? "piper" : "supertonic"
  const defaultVoice = getDefaultVoiceForEngine(ttsEngine)
  const ttsVoice =
    ttsEngine === "piper"
      ? getPiperVoice(partial.ttsVoice ?? "")?.id ?? defaultVoice
      : getSupertonicVoice(partial.ttsVoice ?? "")?.id ?? defaultVoice

  return {
    llmId,
    variantId,
    sttEnabled: partial.sttEnabled !== false,
    sttModelId,
    ttsEnabled: partial.ttsEnabled !== false,
    ttsEngine,
    ttsVoice,
    ttsLanguage: partial.ttsLanguage ?? "auto",
    hindiTypingEnabled: partial.hindiTypingEnabled === true,
    configured: partial.configured === true,
  }
}

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_PREFERENCES }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return normalizePreferences(JSON.parse(raw) as Partial<UserPreferences>)
    }
  } catch {
    // fall through to legacy migration
  }

  const legacyLlm = localStorage.getItem(LEGACY_LLM_KEY)
  if (legacyLlm) {
    return normalizePreferences({ llmId: legacyLlm, configured: true })
  }

  return { ...DEFAULT_PREFERENCES }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  localStorage.setItem(LEGACY_LLM_KEY, prefs.llmId)
}

export function clearPreferences(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(LEGACY_LLM_KEY)
}

