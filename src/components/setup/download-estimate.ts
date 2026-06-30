import { STT_OPTIONS } from '@/lib/stt-models'
import type { TTSEngine } from '@/lib/tts-types'
import type { DownloadBreakdown } from './types'

export function parseSizeLabel(label: string): number {
  const val = parseFloat(label.replace(/[~ MBGB]/g, '').trim())
  if (label.includes('GB')) return val * 1024
  return val
}

export function computeDownloadBreakdown(input: {
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  selectedVoiceSizeLabel?: string
  llmSizeLabel: string
}): DownloadBreakdown {
  const selectedStt = STT_OPTIONS.find((s) => s.id === input.sttModelId) || STT_OPTIONS[2]
  const stt = input.sttEnabled ? selectedStt.sizeLabel : null
  const llm = input.llmSizeLabel
  const tts = !input.ttsEnabled
    ? null
    : input.ttsEngine === 'supertonic'
      ? '~400 MB'
      : input.selectedVoiceSizeLabel ?? '~60 MB'
  return { stt, tts, llm }
}

export function computeTotalDownloadMb(input: {
  sttEnabled: boolean
  sttModelId: string
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  selectedVoiceSizeLabel?: string
  llmSizeLabel: string
}): number {
  let mb = 0
  if (input.sttEnabled) {
    const selectedStt = STT_OPTIONS.find((s) => s.id === input.sttModelId) || STT_OPTIONS[2]
    mb += parseSizeLabel(selectedStt.sizeLabel)
  }
  if (input.ttsEnabled) {
    if (input.ttsEngine === 'supertonic') {
      mb += 400
    } else {
      mb += parseSizeLabel(input.selectedVoiceSizeLabel ?? '~60 MB')
    }
  }
  mb += parseSizeLabel(input.llmSizeLabel)
  return mb
}

export function formatDownloadSize(mb: number): string {
  return mb >= 1000 ? `~${(mb / 1024).toFixed(1)} GB` : `~${mb} MB`
}
