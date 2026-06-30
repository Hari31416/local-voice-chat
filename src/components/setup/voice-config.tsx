import { STT_OPTIONS } from '@/lib/stt-models'
import type { TTSEngine, TTSLanguage } from '@/lib/tts-types'
import { TTS_ENGINE_OPTIONS } from '@/lib/tts-voices'
import { cn } from '@/lib/utils'
import { SUPERTRONIC_LANGUAGES } from './constants'
import { groupSTTOptions, sttOptionLabel } from './stt-utils'

interface VoiceConfigProps {
  sttEnabled: boolean
  sttModelId: string
  onSttModelChange: (id: string) => void
  ttsEnabled: boolean
  ttsEngine: TTSEngine
  ttsVoice: string
  ttsLanguage: TTSLanguage
  voices: { id: string; name: string; desc: string; sizeLabel?: string }[]
  onEngineChange: (engine: TTSEngine) => void
  onVoiceChange: (voice: string) => void
  onLanguageChange: (language: TTSLanguage) => void
}

export function VoiceConfig({
  sttEnabled,
  sttModelId,
  onSttModelChange,
  ttsEnabled,
  ttsEngine,
  ttsVoice,
  ttsLanguage,
  voices,
  onEngineChange,
  onVoiceChange,
  onLanguageChange,
}: VoiceConfigProps) {
  if (!sttEnabled && !ttsEnabled) return null

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Voice settings</p>

      {sttEnabled && (
        <div className="space-y-1.5">
          <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">
            Speech recognition
          </label>
          <select
            id="stt-model-select"
            value={sttModelId}
            onChange={(e) => onSttModelChange(e.target.value)}
            className="studio-input w-full px-3 py-2 text-xs cursor-pointer"
          >
            {groupSTTOptions(STT_OPTIONS).map(({ label, opts }) => (
              <optgroup key={label} label={label}>
                {opts.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {sttOptionLabel(opt)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {ttsEnabled && (
        <>
          <div className="space-y-1.5">
            <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">TTS engine</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              {TTS_ENGINE_OPTIONS.map((opt) => {
                const selected = ttsEngine === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onEngineChange(opt.id)}
                    className={cn(
                      'py-1.5 px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer',
                      selected ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300',
                    )}
                  >
                    {opt.name === 'Supertonic 3' ? 'Supertonic' : opt.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ttsEngine === 'supertonic' && (
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Language</label>
                <select
                  id="tts-language-select"
                  value={ttsLanguage}
                  onChange={(e) => onLanguageChange(e.target.value as TTSLanguage)}
                  className="studio-input w-full px-3 py-2 text-xs cursor-pointer"
                >
                  {SUPERTRONIC_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={cn('space-y-1.5', ttsEngine !== 'supertonic' && 'col-span-2')}>
              <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Voice speaker</label>
              <select
                id="tts-voice-select"
                value={ttsVoice}
                onChange={(e) => onVoiceChange(e.target.value)}
                className="studio-input w-full px-3 py-2 text-xs cursor-pointer"
              >
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.desc})
                    {voice.sizeLabel ? ` - ${voice.sizeLabel}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {sttEnabled && !ttsEnabled && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-300/80">
          Voice input active — replies will be text-only.
        </div>
      )}
    </div>
  )
}
