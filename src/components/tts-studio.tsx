import { useState, useEffect } from "react"
import { Play, Square, Sparkles, AudioLines, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { useTTS } from "@/hooks/use-tts"
import { PIPER_VOICES, SUPERTRONIC_VOICES, TTS_ENGINE_OPTIONS } from "@/lib/tts-voices"
import { pcmToWav } from "@/lib/piper/wav"
import { cn } from "@/lib/utils"
import { AudioWaveformPlayer } from "@/components/audio-waveform-player"

interface TTSStudioProps {
  tts: ReturnType<typeof useTTS>
}

export function TTSStudio({ tts }: TTSStudioProps) {
  const [text, setText] = useState("Hello! This is a completely local Text-to-Speech sandbox running directly in your browser. Type anything here and click Synthesize to hear the voice.")
  const [engine, setEngine] = useState(tts.engine)
  const [voice, setVoice] = useState(tts.voice)
  const [wavUrl, setWavUrl] = useState<string | null>(null)

  const voices = engine === "supertonic" ? SUPERTRONIC_VOICES : PIPER_VOICES

  // Sync state with shared tts when changed from outside
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
      
      // Load current chosen engine & voice
      await tts.loadModels({ engine, voice })
      
      const result = await tts.synthesize(text)
      
      // Encode PCM float32 to WAV
      const wavBytes = pcmToWav(result.audio, result.sampling_rate)
      const blob = new Blob([wavBytes], { type: "audio/wav" })
      const url = URL.createObjectURL(blob)
      
      setWavUrl(url)
    } catch (err) {
      console.error("Synthesis failed:", err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          TTS Studio
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          Generate natural speech completely in your browser, offline. No API keys required.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="md:col-span-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-zinc-300 font-semibold border-b border-zinc-800/80 pb-2">
            <Settings className="h-4.5 w-4.5 text-blue-400" />
            <span>Voice Configuration</span>
          </div>

          {/* Engine Select */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Engine</label>
            <div className="grid grid-cols-2 gap-2">
              {TTS_ENGINE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleEngineChange(opt.id as any)}
                  className={cn(
                    "p-2 rounded-xl border text-xs font-semibold transition-all duration-200 text-center cursor-pointer",
                    engine === opt.id
                      ? "bg-blue-950/30 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/20"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200"
                  )}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Select */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Voice Model</label>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {voices.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVoice(v.id)}
                  className={cn(
                    "w-full p-2.5 rounded-xl border text-left transition-all duration-200 flex flex-col gap-0.5 cursor-pointer",
                    voice === v.id
                      ? "bg-blue-950/20 border-blue-500/50 text-blue-200"
                      : "bg-zinc-900/40 border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900"
                  )}
                >
                  <span className="text-xs font-bold text-white">{v.name}</span>
                  <span className="text-[10px] text-zinc-500 line-clamp-1">{v.desc}</span>
                  {"sizeLabel" in v && (
                    <span className="text-[9px] font-bold text-blue-400/80 mt-0.5">{(v as any).sizeLabel}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Model Load Action */}
          <div className="pt-2">
            {tts.isReady && tts.engine === engine && tts.voice === voice ? (
              <div className="text-center text-[11px] font-semibold bg-green-500/10 border border-green-500/20 text-green-400 py-2 rounded-xl">
                Model Ready In Memory
              </div>
            ) : (
              <Button
                onClick={handleLoadModel}
                disabled={tts.isLoading}
                variant="ghost"
                className="w-full bg-zinc-950/40 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs py-5 font-semibold cursor-pointer"
              >
                {tts.isLoading ? "Loading..." : "Pre-load Model"}
              </Button>
            )}
          </div>
        </div>

        {/* Text Area and Synthesize Sandbox */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between text-zinc-300 border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4.5 w-4.5 text-cyan-400" />
                <span>Text input</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{text.length} chars</span>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your text to synthesize..."
              rows={6}
              disabled={tts.isSynthesizing}
              className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none resize-none focus:border-blue-500/50 transition-colors"
            />

            {/* Progress indicators */}
            {(tts.isLoading || tts.isSynthesizing) && (
              <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">
                    {tts.isLoading ? "Downloading model weights..." : "Synthesizing voice PCM..."}
                  </span>
                  <span className="text-blue-400 font-mono">
                    {tts.isLoading ? `${tts.loadProgress}%` : `${tts.synthesisProgress}%`}
                  </span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${tts.isLoading ? tts.loadProgress : tts.synthesisProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSynthesize}
                disabled={tts.isSynthesizing || tts.isLoading || !text.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-xl shadow border border-blue-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {tts.isSynthesizing ? (
                  <>
                    <AudioLines className="h-4.5 w-4.5 animate-pulse" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4.5 w-4.5" />
                    <span>Synthesize & Play</span>
                  </>
                )}
              </Button>
              
              {tts.isSynthesizing && (
                <Button
                  onClick={tts.stop}
                  variant="destructive"
                  className="bg-red-650 hover:bg-red-750 text-white font-semibold py-5 rounded-xl flex-shrink-0 cursor-pointer"
                >
                  <Square className="h-4.5 w-4.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Results/Playback panel */}
          {wavUrl && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4 backdrop-blur-xl animate-fade-in">
              <div className="text-zinc-300 font-semibold border-b border-zinc-800/80 pb-2 text-sm flex items-center gap-2">
                <AudioLines className="h-4.5 w-4.5 text-teal-400" />
                <span>Generated Audio Player</span>
              </div>
              
              <AudioWaveformPlayer src={wavUrl} variant="studio" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
