import type { TTSLanguage } from "@/lib/tts-types"

export const IS_IOS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

export const SUPERTRONIC_LANGUAGES: { id: TTSLanguage; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
  { id: "na", label: "Hinglish" },
]
