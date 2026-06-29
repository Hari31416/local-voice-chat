import type { ChatMessage } from '@/lib/voice-agent-types'

export function revokeMessageAudioUrls(messages: readonly ChatMessage[]): void {
  for (const message of messages) {
    if (message.audioUrl) {
      URL.revokeObjectURL(message.audioUrl)
    }
  }
}
