import type { TTSEngine, TTSLanguage } from '@/lib/tts-types'

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

export type InteractionMode = 'call' | 'voice-to-text' | 'text-to-voice' | 'text'

export type SetupLayoutMode = 'wizard' | 'blueprint'

export interface SetupScreenProps {
  initial: SetupSelection
  isMobile: boolean
  hasSavedConfig: boolean
  onStart: (selection: SetupSelection) => void
  onReset?: () => void
}

export interface DownloadBreakdown {
  stt: string | null
  tts: string | null
  llm: string
}
