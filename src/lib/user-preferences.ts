import { DEFAULT_LLM_ID, LLM_OPTIONS } from "@/lib/llm-models"
import type { TTSEngine, TTSLanguage } from "@/lib/tts-types"
import { getDefaultVoiceForEngine, getPiperVoice, getSupertonicVoice } from "@/lib/tts-voices"

const STORAGE_KEY = "voice_agent_preferences"
const LEGACY_LLM_KEY = "voice_agent_selected_model"

export interface UserPreferences {
  llmId: string
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  configured: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  llmId: DEFAULT_LLM_ID,
  ttsEngine: "supertonic",
  ttsVoice: "F1",
  ttsLanguage: "auto",
  configured: false,
}

function normalizePreferences(partial: Partial<UserPreferences>): UserPreferences {
  const llmId = LLM_OPTIONS.some((o) => o.id === partial.llmId) ? partial.llmId! : DEFAULT_LLM_ID
  const ttsEngine: TTSEngine = partial.ttsEngine === "piper" ? "piper" : "supertonic"
  const defaultVoice = getDefaultVoiceForEngine(ttsEngine)
  const ttsVoice =
    ttsEngine === "piper"
      ? getPiperVoice(partial.ttsVoice ?? "")?.id ?? defaultVoice
      : getSupertonicVoice(partial.ttsVoice ?? "")?.id ?? defaultVoice

  return {
    llmId,
    ttsEngine,
    ttsVoice,
    ttsLanguage: partial.ttsLanguage ?? "auto",
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
