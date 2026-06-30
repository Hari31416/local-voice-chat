import { STT_OPTIONS } from '@/lib/stt-models'
import type { STTModelOption } from '@/lib/stt-models'

const STT_ENGINE_GROUP_LABELS: Record<string, string> = {
  whisper: 'Whisper',
  distil: 'Distil-Whisper',
  moonshine: 'Moonshine',
  wav2vec2: 'Wav2Vec2 / MMS',
}

function getModelGroup(opt: STTModelOption): string {
  if (opt.id.startsWith('distil')) return 'distil'
  if (opt.id.startsWith('whisper')) return 'whisper'
  if (opt.id.startsWith('moonshine')) return 'moonshine'
  if (opt.id.startsWith('wav2vec2')) return 'wav2vec2'
  return 'other'
}

export function groupSTTOptions(options: STTModelOption[] = STT_OPTIONS): { label: string; opts: STTModelOption[] }[] {
  const map = new Map<string, STTModelOption[]>()
  for (const opt of options) {
    const key = getModelGroup(opt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(opt)
  }
  return Array.from(map.entries()).map(([key, opts]) => ({
    label: STT_ENGINE_GROUP_LABELS[key] ?? key,
    opts,
  }))
}

export function sttOptionLabel(opt: STTModelOption): string {
  return `${opt.name} (${opt.sizeLabel})`
}
