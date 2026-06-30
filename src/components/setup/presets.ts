import { Brain, Sparkles, Zap } from 'lucide-react'
import type { TTSEngine, TTSLanguage } from '@/lib/tts-types'

export interface SetupPreset {
  id: string
  name: string
  subtitle: string
  desc: string
  llmId: string
  variantId: string
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  useThinking: boolean
  experimentalToolsEnabled: boolean
  badge: string
  sizeLabel: string
  icon: typeof Zap | typeof Sparkles | typeof Brain
  accent: string
}

export const SETUP_PRESETS: SetupPreset[] = [
  {
    id: 'fast',
    name: 'Fast & Light',
    subtitle: 'Speed Optimized',
    desc: 'Lightning-fast replies on older devices.',
    llmId: 'lfm2-230m',
    variantId: 'lfm2-230m',
    sttEnabled: true,
    sttModelId: 'whisper-tiny',
    ttsEnabled: true,
    ttsEngine: 'piper',
    ttsVoice: 'en_US-lessac-medium',
    ttsLanguage: 'auto',
    useThinking: false,
    experimentalToolsEnabled: false,
    badge: 'Ultra Fast',
    sizeLabel: '~365 MB',
    icon: Zap,
    accent: 'cyan',
  },
  {
    id: 'balanced',
    name: 'Balanced',
    subtitle: 'Recommended',
    desc: 'Speed, vision support, and natural voice.',
    llmId: 'qwen35-0.8b',
    variantId: 'qwen35-0.8b',
    sttEnabled: true,
    sttModelId: 'whisper-base',
    ttsEnabled: true,
    ttsEngine: 'supertonic',
    ttsVoice: 'F1',
    ttsLanguage: 'auto',
    useThinking: false,
    experimentalToolsEnabled: false,
    badge: 'Versatile',
    sizeLabel: '~1.3 GB',
    icon: Sparkles,
    accent: 'emerald',
  },
  {
    id: 'flagship',
    name: 'Powerhouse',
    subtitle: 'Deep Intelligence',
    desc: 'Maximum reasoning, tools, and features.',
    llmId: 'gemma-4-e2b',
    variantId: 'gemma-4-e2b-kernel',
    sttEnabled: true,
    sttModelId: 'whisper-base',
    ttsEnabled: true,
    ttsEngine: 'supertonic',
    ttsVoice: 'F1',
    ttsLanguage: 'auto',
    useThinking: true,
    experimentalToolsEnabled: true,
    badge: 'Flagship',
    sizeLabel: '~3.7 GB',
    icon: Brain,
    accent: 'amber',
  },
]

export const PRESET_ACCENTS: Record<string, { border: string; bg: string; icon: string; glow: string }> = {
  cyan: {
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-500/8',
    icon: 'text-cyan-400',
    glow: 'shadow-cyan-500/15',
  },
  emerald: {
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/8',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/15',
  },
  amber: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-500/8',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/15',
  },
}
