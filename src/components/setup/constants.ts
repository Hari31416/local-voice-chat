import { MessageSquare, Mic, PhoneCall, Volume2 } from 'lucide-react'
import type { TTSLanguage } from '@/lib/tts-types'
import type { InteractionMode } from './types'

export const INTERACTION_MODES: {
  id: InteractionMode
  label: string
  desc: string
  icon: typeof PhoneCall
}[] = [
  {
    id: 'call',
    label: 'Full Voice Call',
    desc: 'Speak naturally, hear replies. Hands-free.',
    icon: PhoneCall,
  },
  {
    id: 'voice-to-text',
    label: 'Voice to Text',
    desc: 'Speak inputs, read text replies.',
    icon: Mic,
  },
  {
    id: 'text-to-voice',
    label: 'Text to Voice',
    desc: 'Type messages, hear spoken replies.',
    icon: Volume2,
  },
  {
    id: 'text',
    label: 'Text Only',
    desc: 'Standard chat. No STT/TTS loaded.',
    icon: MessageSquare,
  },
]

export const SUPERTRONIC_LANGUAGES: { id: TTSLanguage; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'na', label: 'Hinglish' },
]

export const SETUP_LAYOUT_STORAGE_KEY = 'webvoice-setup-layout-mode'
