import { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Gauge,
  Download,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AudioWaveformPlayerProps {
  src: string
  variant?: "chat" | "studio"
  isGlobalPlaying?: boolean
  globalAnalyser?: AnalyserNode | null
}

export function AudioWaveformPlayer({
  src,
  variant = "studio",
  isGlobalPlaying = false,
  globalAnalyser = null,
}: AudioWaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const isChat = variant === "chat"

  // Web Audio refs for local playback
  const localAudioContextRef = useRef<AudioContext | null>(null)
  const localSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const localAnalyserRef = useRef<AnalyserNode | null>(null)

  // Initialize Web Audio for local playback on user gesture
  const initLocalAnalyser = () => {
    if (!audioRef.current || localSourceNodeRef.current) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass()
      localAudioContextRef.current = ctx

      const source = ctx.createMediaElementSource(audioRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256

      source.connect(analyser)
      analyser.connect(ctx.destination)

      localSourceNodeRef.current = source
      localAnalyserRef.current = analyser
    } catch (e) {
      console.error("Local Web Audio Analyser setup failed:", e)
    }
  }

  // Handle source changes and load audio metadata
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load()
      audioRef.current.playbackRate = playbackRate
      audioRef.current.volume = volume
      audioRef.current.muted = isMuted

      // If we were playing locally, reset local state
      if (!isGlobalPlaying) {
        setIsPlaying(false)
        setCurrentTime(0)
      }
    }
  }, [src])

  // Sync state when global playback (voice assistant speaking) changes
  useEffect(() => {
    let interval: number | null = null

    if (isGlobalPlaying) {
      setIsPlaying(true)
      const startTime = performance.now() - currentTime * 1000

      interval = window.setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000
        if (duration > 0 && elapsed >= duration) {
          setCurrentTime(duration)
          if (interval) clearInterval(interval)
        } else {
          setCurrentTime(elapsed)
        }
      }, 50)
    } else {
      // When global speaking stops, reset the playing state and reset time back to 0
      setIsPlaying(false)
      setCurrentTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGlobalPlaying, duration])

  // Cleanup local audio context
  useEffect(() => {
    return () => {
      if (localAudioContextRef.current) {
        localAudioContextRef.current.close().catch((e) => console.error("AudioContext close failed:", e))
      }
    }
  }, [])

  // Dynamic canvas drawing loop (Dot-Matrix LED Visualizer)
  useEffect(() => {
    let animationId: number

    const render = () => {
      const canvas = canvasRef.current
      if (!canvas) {
        animationId = requestAnimationFrame(render)
        return
      }

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        animationId = requestAnimationFrame(render)
        return
      }

      // Handle dynamic high-DPI scaling (Retina displays)
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const expectedWidth = rect.width * dpr
      const expectedHeight = rect.height * dpr

      if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) {
        canvas.width = expectedWidth
        canvas.height = expectedHeight
        ctx.scale(dpr, dpr)
      }

      const width = rect.width
      const height = rect.height

      ctx.clearRect(0, 0, width, height)

      // Choose correct analyser (global during active calls, local during replay)
      const activeAnalyser = isGlobalPlaying ? globalAnalyser : localAnalyserRef.current
      const barCount = isChat ? 24 : 40
      const dotRadius = isChat ? 1.5 : 2
      const dotGap = isChat ? 1.5 : 2.5
      const dotSize = dotRadius * 2

      let frequencies = new Uint8Array(barCount)
      if (isPlaying && activeAnalyser) {
        const bufferLength = activeAnalyser.frequencyBinCount
        const tempArray = new Uint8Array(bufferLength)
        activeAnalyser.getByteFrequencyData(tempArray)

        // Map vocals frequencies logarithmicly/linearly
        for (let i = 0; i < barCount; i++) {
          const binIndex = Math.min(
            bufferLength - 1,
            Math.floor((i / barCount) * 45) // Vocal frequencies reside mostly in first 45 bins
          )
          frequencies[i] = tempArray[binIndex]
        }
      } else {
        // Quiet baseline preview envelope (using a sinusoidal matrix wave shape)
        for (let i = 0; i < barCount; i++) {
          const norm = i / (barCount - 1)
          const baseline = Math.sin(norm * Math.PI) * 12 + Math.cos(norm * Math.PI * 4) * 3 + 6
          frequencies[i] = baseline
        }
      }

      // Draw horizontal color gradient (Green -> Cyan -> Green)
      const gradient = ctx.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, "#22c55e")   // Green
      gradient.addColorStop(0.3, "#10b981") // Emerald
      gradient.addColorStop(0.5, "#06b6d4") // Cyan
      gradient.addColorStop(0.7, "#10b981") // Emerald
      gradient.addColorStop(1, "#22c55e")   // Green
      ctx.fillStyle = gradient

      const barWidth = width / barCount
      const centerY = height / 2
      const maxDots = Math.floor(height / (dotSize + dotGap))

      const progressPercent = duration ? (currentTime / duration) * 100 : 0

      for (let i = 0; i < barCount; i++) {
        const x = i * barWidth + barWidth / 2
        const amp = frequencies[i] / 255
        const dotsToDraw = Math.max(1, Math.round(amp * maxDots))

        // Dim bars ahead of the current playing scrubber time
        const barProgress = (i / barCount) * 100
        const isPastProgress = progressPercent >= barProgress
        ctx.globalAlpha = isPastProgress ? 1.0 : 0.25

        for (let j = 0; j < dotsToDraw; j++) {
          const offset = j * (dotSize + dotGap)

          // Top dot
          ctx.beginPath()
          ctx.arc(x, centerY - offset, dotRadius, 0, Math.PI * 2)
          ctx.fill()

          // Bottom dot (prevent overlapping dot at center)
          if (j > 0) {
            ctx.beginPath()
            ctx.arc(x, centerY + offset, dotRadius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Reset transparency
      ctx.globalAlpha = 1.0
      animationId = requestAnimationFrame(render)
    }

    animationId = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isPlaying, isGlobalPlaying, globalAnalyser, currentTime, duration, isChat])

  // Audio element events
  const handleTimeUpdate = () => {
    if (audioRef.current && !isGlobalPlaying) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleEnded = () => {
    if (!isGlobalPlaying) {
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }

  // Playback actions
  const togglePlay = () => {
    if (!audioRef.current || isGlobalPlaying) return

    initLocalAnalyser()
    if (localAudioContextRef.current?.state === "suspended") {
      localAudioContextRef.current.resume()
    }

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().catch((err) => console.error("Playback failed:", err))
      setIsPlaying(true)
    }
  }

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioRef.current || duration === 0 || isGlobalPlaying) return

    const rect = canvasRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percentage * duration

    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const skipBackward = () => {
    if (!audioRef.current || isGlobalPlaying) return
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5)
  }

  const skipForward = () => {
    if (!audioRef.current || isGlobalPlaying) return
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 5)
  }

  const changeSpeed = () => {
    if (!audioRef.current || isGlobalPlaying) return
    const rates = [1, 1.25, 1.5, 2]
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIndex]
    audioRef.current.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  const toggleMute = () => {
    if (!audioRef.current || isGlobalPlaying) return
    audioRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current || isGlobalPlaying) return
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

  if (isChat) {
    // Chat bubble compact waveform player view
    return (
      <div className="flex items-center gap-2 bg-zinc-950/50 border border-zinc-800/60 py-2.5 px-3 rounded-2xl w-full max-w-[360px]">
        {/* Hidden Audio */}
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          className="hidden"
        />

        {/* Play/Pause icon */}
        <Button
          onClick={togglePlay}
          disabled={isGlobalPlaying}
          size="icon"
          className="h-8 w-8 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white shadow-md shrink-0 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-white" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-white ml-0.5" />
          )}
        </Button>

        {/* Skip Backward */}
        <Button
          onClick={skipBackward}
          disabled={isGlobalPlaying}
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 shrink-0 cursor-pointer disabled:pointer-events-none"
          title="Rewind 5s"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        {/* Skip Forward */}
        <Button
          onClick={skipForward}
          disabled={isGlobalPlaying}
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-850 shrink-0 cursor-pointer disabled:pointer-events-none"
          title="Forward 5s"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </Button>

        {/* Real-Time Canvas Waveform */}
        <div className="flex flex-col flex-grow min-w-0 gap-0.5">
          <canvas
            ref={canvasRef}
            onClick={handleWaveformClick}
            className="h-8 w-full cursor-pointer"
          />

          {/* Time markers */}
          <div className="flex justify-between text-[8px] font-mono text-zinc-500">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed toggle */}
        <button
          onClick={changeSpeed}
          disabled={isGlobalPlaying}
          type="button"
          className="flex-shrink-0 text-[9px] font-extrabold px-1.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700/40 text-zinc-300 hover:text-white hover:bg-zinc-750 transition-all cursor-pointer disabled:pointer-events-none"
          title="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    )
  }

  // Full sandbox studio player view
  return (
    <div className="bg-zinc-950/60 border border-zinc-850 p-5 rounded-2xl flex flex-col gap-4">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Large visual interactive CSS Waveform */}
      <div className="flex items-center gap-3 w-full">
        <span className="text-[10px] font-mono text-zinc-500 w-10 text-right">
          {formatTime(currentTime)}
        </span>

        <canvas
          ref={canvasRef}
          onClick={handleWaveformClick}
          className="flex-grow h-14 cursor-pointer"
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
            href={src}
            download={`synthesis_output.wav`}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/30 hover:border-teal-500/50 hover:bg-gradient-to-r hover:from-teal-500/20 hover:to-emerald-500/20 text-teal-300 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-md"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download WAV</span>
          </a>
        </div>
      </div>
    </div>
  )
}
