import { useState, useEffect } from "react"
import { Play, Square, Sparkles, AudioLines, Settings2, Type } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { useTTS } from "@/hooks/use-tts"
import { PIPER_VOICES, SUPERTRONIC_VOICES, TTS_ENGINE_OPTIONS } from "@/lib/tts-voices"
import { pcmToWav } from "@/lib/piper/wav"
import { cn } from "@/lib/utils"
import { AudioWaveformPlayer } from "@/components/audio-waveform-player"
import { StaggerGroup, StaggerItem } from "@/components/page-transition"
import { StudioPageHeader, studioPageClass } from "@/components/studio-page-header"

interface TTSStudioProps {
  tts: ReturnType<typeof useTTS>
}

export function TTSStudio({ tts }: TTSStudioProps) {
  const [text, setText] = useState("Hello! This is a completely local Text-to-Speech sandbox running directly in your browser. Type anything here and click Synthesize to hear the voice.")
  const [engine, setEngine] = useState(tts.engine)
  const [voice, setVoice] = useState(tts.voice)
  const [wavUrl, setWavUrl] = useState<string | null>(null)

  const voices = engine === "supertonic" ? SUPERTRONIC_VOICES : PIPER_VOICES

  useEffect(() => {
    if (tts.engine !== engine) {
      setEngine(tts.engine)
    }
    if (tts.voice !== voice) {
      setVoice(tts.voice)
    }
  }, [tts.engine, tts.voice])

  const handleEngineChange = (newEngine: typeof tts.engine) => {
    setEngine(newEngine)
    const defaultVoice = newEngine === "supertonic" ? "F1" : "en_US-amy-medium"
    setVoice(defaultVoice)
  }

  const handleLoadModel = async () => {
    await tts.loadModels({ engine, voice })
  }

  const handleSynthesize = async () => {
    try {
      if (wavUrl) {
        URL.revokeObjectURL(wavUrl)
        setWavUrl(null)
      }

      await tts.loadModels({ engine, voice })

      const result = await tts.synthesize(text)

      const wavBytes = pcmToWav(result.audio, result.sampling_rate)
      const blob = new Blob([wavBytes], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)

      setWavUrl(url)
    } catch (err) {
      console.error("Synthesis failed:", err)
    }
  }

  return (
    <div className={studioPageClass}>
      <StudioPageHeader
        eyebrow="Text-to-Speech"
        title="TTS Studio"
        description="Generate natural speech in your browser. Offline, private, no API keys."
        accent="cyan"
      />

      <StaggerGroup className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Config panel */}
        <StaggerItem index={0} className="lg:col-span-2">
        <div className="glass-panel glass-panel-animated rounded-2xl p-4 sm:p-5 space-y-4 sm:space-y-5 h-full">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Settings2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">Voice configuration</p>
              <p className="text-[11px] text-zinc-600">Engine & speaker model</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Engine</label>
            <div className="grid grid-cols-2 gap-2">
              {TTS_ENGINE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEngineChange(opt.id as typeof tts.engine)}
                  className={cn(
                    "p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 text-center cursor-pointer card-selectable",
                    engine === opt.id
                      ? "card-selected border-cyan-500/40 bg-cyan-500/8 text-cyan-300"
                      : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300",
                  )}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Voice model</label>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
              {voices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoice(v.id)}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all duration-200 flex flex-col gap-0.5 cursor-pointer card-selectable",
                    voice === v.id
                      ? "card-selected border-cyan-500/40 bg-cyan-500/8"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
                  )}
                >
                  <span className="text-xs font-semibold text-white">{v.name}</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1">{v.desc}</span>
                  {"sizeLabel" in v && (
                    <span className="text-[9px] font-mono font-bold text-cyan-500/70 mt-0.5">{(v as { sizeLabel: string }).sizeLabel}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1">
            {tts.isReady && tts.engine === engine && tts.voice === voice ? (
              <div className="text-center text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 py-2.5 rounded-xl">
                Model ready in memory
              </div>
            ) : (
              <Button
                onClick={handleLoadModel}
                disabled={tts.isLoading}
                variant="ghost"
                className="w-full border border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white text-xs py-5 font-semibold cursor-pointer rounded-xl"
              >
                {tts.isLoading ? "Loading..." : "Pre-load model"}
              </Button>
            )}
          </div>
        </div>
        </StaggerItem>

        {/* Input + synthesize */}
        <StaggerItem index={1} className="lg:col-span-3 space-y-4">
          <div className="glass-panel glass-panel-animated rounded-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-400">
                  <Type className="h-4 w-4" />
                </div>
                <span className="font-semibold text-white text-sm">Text input</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-600 bg-white/[0.04] px-2 py-1 rounded-md">{text.length} chars</span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text to synthesize..."
              rows={7}
              disabled={tts.isSynthesizing}
              className="studio-input w-full p-4 text-sm resize-none min-h-[160px]"
            />

            {(tts.isLoading || tts.isSynthesizing) && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-500">
                    {tts.isLoading ? "Downloading model weights..." : "Synthesizing voice..."}
                  </span>
                  <span className="text-cyan-400 font-mono">
                    {tts.isLoading ? `${tts.loadProgress}%` : `${tts.synthesisProgress}%`}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
                    style={{ width: `${tts.isLoading ? tts.loadProgress : tts.synthesisProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSynthesize}
                disabled={tts.isSynthesizing || tts.isLoading || !text.trim()}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-bold py-5 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all animate-cta-glow-cyan"
              >
                {tts.isSynthesizing ? (
                  <>
                    <AudioLines className="h-4 w-4 animate-pulse" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Synthesize & Play</span>
                  </>
                )}
              </Button>

              {tts.isSynthesizing && (
                <Button
                  onClick={tts.stop}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-500 text-white font-semibold py-5 rounded-xl flex-shrink-0 cursor-pointer px-4"
                >
                  <Square className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {wavUrl && (
            <div className="glass-panel glass-panel-animated rounded-2xl p-5 space-y-4 animate-fade-up overflow-hidden min-w-0">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white text-sm">Generated audio</span>
              </div>
              <AudioWaveformPlayer src={wavUrl} variant="studio" />
            </div>
          )}
        </StaggerItem>
      </StaggerGroup>
    </div>
  )
}
