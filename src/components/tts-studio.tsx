import { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  Square,
  Download,
  Sparkles,
  AudioLines,
  Settings,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { useTTS } from "@/hooks/use-tts"
import { PIPER_VOICES, SUPERTRONIC_VOICES, TTS_ENGINE_OPTIONS } from "@/lib/tts-voices"
import { pcmToWav } from "@/lib/piper/wav"
import { cn } from "@/lib/utils"

interface TTSStudioProps {
  tts: ReturnType<typeof useTTS>
}

export function TTSStudio({ tts }: TTSStudioProps) {
  const [text, setText] = useState("Hello! This is a completely local Text-to-Speech sandbox running directly in your browser. Type anything here and click Synthesize to hear the voice.")
  const [engine, setEngine] = useState(tts.engine)
  const [voice, setVoice] = useState(tts.voice)
  const [wavUrl, setWavUrl] = useState<string | null>(null)

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

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

  // Sync properties whenever source audio wavUrl changes
  useEffect(() => {
    if (audioRef.current && wavUrl) {
      audioRef.current.load()
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.error("Audio auto-playback failed:", err)
          setIsPlaying(false)
        })
      }
    }
  }, [wavUrl])

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

      setIsPlaying(true) // Triggers playing state when wavUrl changes
      setWavUrl(url)
    } catch (err) {
      console.error("Synthesis failed:", err)
      setIsPlaying(false)
    }
  }

  // Audio Event Handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  // Audio Actions
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch((err) => console.error("Playback failed:", err))
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
  }

  const skipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5)
  }

  const changeSpeed = () => {
    if (!audioRef.current) return
    const rates = [1, 1.25, 1.5, 2]
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIndex]
    audioRef.current.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    const newVol = parseFloat(e.target.value)
    audioRef.current.volume = newVol
    setVolume(newVol)
    setIsMuted(newVol === 0)
    audioRef.current.muted = newVol === 0
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
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
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                    style={{ width: `${tts.isLoading ? tts.loadProgress : tts.synthesisProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSynthesize}
                disabled={tts.isSynthesizing || tts.isLoading || !text.trim()}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-5 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 cursor-pointer"
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

              {/* Premium Custom Audio Player Controls */}
              <div className="bg-zinc-950/60 border border-zinc-850 p-5 rounded-2xl flex flex-col gap-4">
                {/* Hidden Audio Element */}
                <audio
                  ref={audioRef}
                  src={wavUrl}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleEnded}
                  className="hidden"
                />

                {/* Timeline slider and seek */}
                <div className="flex items-center gap-3 w-full">
                  <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.05}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-grow h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                    style={{
                      background: `linear-gradient(to right, oklch(0.612 0.185 249.7) ${duration ? (currentTime / duration) * 100 : 0
                        }%, oklch(0.269 0 0) ${duration ? (currentTime / duration) * 100 : 0}%)`,
                    }}
                  />
                  <span className="text-[10px] font-mono text-zinc-500 w-10 text-left">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Control bar buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  {/* Playback Controls (Play/Pause, Rewind, Fast Forward) */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={skipBackward}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      title="Rewind 5 seconds"
                    >
                      <RotateCcw className="h-4.5 w-4.5" />
                    </Button>

                    <Button
                      onClick={togglePlay}
                      size="icon"
                      className="h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 cursor-pointer"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-white" />
                      ) : (
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      )}
                    </Button>

                    <Button
                      onClick={skipForward}
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                      title="Forward 5 seconds"
                    >
                      <RotateCw className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  {/* Settings Controls (Playback speed, Volume slider, WAV download) */}
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    {/* Playback speed trigger */}
                    <button
                      onClick={changeSpeed}
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Playback Speed"
                    >
                      <Gauge className="h-3.5 w-3.5 text-blue-400" />
                      <span>{playbackRate}x</span>
                    </button>

                    {/* Volume and Mute toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        type="button"
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="h-4 w-4" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                        style={{
                          background: `linear-gradient(to right, oklch(0.612 0.185 249.7) ${(isMuted ? 0 : volume) * 100
                            }%, oklch(0.269 0 0) ${(isMuted ? 0 : volume) * 100}%)`,
                        }}
                      />
                    </div>

                    {/* Download WAV button */}
                    <a
                      href={wavUrl}
                      download={`synthesis_${engine}_${voice}.wav`}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 hover:border-teal-500/50 hover:bg-gradient-to-r hover:from-teal-500/20 hover:to-emerald-500/20 text-teal-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download WAV</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
