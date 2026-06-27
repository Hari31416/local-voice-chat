/**
 * Hook for browser-based TTS (Supertonic 3 or Piper via ONNX Runtime Web)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  loadTTSEngine,
  loadVoice,
  synthesizeSpeech,
  unloadAllTTS,
  type TTSEngine,
  type TTSLanguage,
  type TTSVoice,
} from "@/lib/tts"
import { getDefaultVoiceForEngine } from "@/lib/tts-voices"
import type { SynthesisResult } from "@/lib/tts-types"

export type TTSStatus = "idle" | "loading" | "ready" | "synthesizing" | "speaking" | "error"
export type { TTSVoice, TTSLanguage, TTSEngine }

interface UseTTSOptions {
  engine: TTSEngine
  voice: string
  language?: TTSLanguage
  onStatusChange?: (status: TTSStatus) => void
  onError?: (error: Error) => void
}

export function useTTS(options: UseTTSOptions) {
  const { engine, voice, language: initialLanguage = "auto", onStatusChange, onError } = options

  const [status, setStatus] = useState<TTSStatus>("idle")
  const [loadProgress, setLoadProgress] = useState(0)
  const [synthesisProgress, setSynthesisProgress] = useState(0)
  const [backend, setBackend] = useState<"webgpu" | "wasm" | null>(null)

  const readyRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const playbackQueueRef = useRef<{ audio: Float32Array; samplingRate: number }[]>([])
  const isPlayingQueueRef = useRef(false)
  const stoppedRef = useRef(false)
  const drainResolveRef = useRef<(() => void) | null>(null)
  const [muted, setMutedState] = useState(false)
  const [language, setLanguageState] = useState<TTSLanguage>(initialLanguage)
  const [activeVoice, setActiveVoice] = useState(voice)
  const [activeEngine, setActiveEngine] = useState(engine)

  const engineRef = useRef(engine)
  const voiceRef = useRef(voice)
  const languageRef = useRef(initialLanguage)

  const updateStatus = useCallback(
    (newStatus: TTSStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModels = useCallback(async (override?: { engine?: TTSEngine; voice?: string }) => {
    if (readyRef.current && (!override || (override.engine === engineRef.current && override.voice === voiceRef.current))) {
      return
    }

    const activeEngine = override?.engine ?? engineRef.current
    const activeVoice = override?.voice ?? voiceRef.current
    engineRef.current = activeEngine
    voiceRef.current = activeVoice
    setActiveEngine(activeEngine)
    setActiveVoice(activeVoice)

    updateStatus("loading")
    setLoadProgress(0)

    try {
      const { backend: activeBackend } = await loadTTSEngine(
        activeEngine,
        activeVoice,
        (info) => {
          setLoadProgress(info.progress)
        },
      )

      setBackend(activeBackend)
      readyRef.current = true
      updateStatus("ready")
    } catch (error) {
      console.error("TTS load error:", error)
      updateStatus("error")
      onError?.(error as Error)
    }
  }, [updateStatus, onError])

  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") {
      await ctx.resume()
    }

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain()
      gainNodeRef.current.connect(ctx.destination)
    }

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser()
      analyserRef.current.fftSize = 256
      analyserRef.current.connect(gainNodeRef.current)
    }

    return ctx
  }, [])

  const playNextInQueue = useCallback(async () => {
    if (stoppedRef.current) {
      playbackQueueRef.current = []
      isPlayingQueueRef.current = false
      drainResolveRef.current?.()
      drainResolveRef.current = null
      return
    }

    const next = playbackQueueRef.current.shift()
    if (!next) {
      isPlayingQueueRef.current = false
      updateStatus("ready")
      drainResolveRef.current?.()
      drainResolveRef.current = null
      return
    }

    try {
      const ctx = await ensureAudioContext()
      updateStatus("speaking")

      const audioBuffer = ctx.createBuffer(1, next.audio.length, next.samplingRate)
      audioBuffer.getChannelData(0).set(next.audio)

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyserRef.current!)
      sourceNodeRef.current = source

      await new Promise<void>((resolve) => {
        source.onended = () => {
          sourceNodeRef.current = null
          resolve()
        }
        source.start()
      })
    } catch (error) {
      console.error("TTS playback error:", error)
      onError?.(error as Error)
    }

    await playNextInQueue()
  }, [ensureAudioContext, updateStatus, onError])

  const enqueuePCM = useCallback(
    (audio: Float32Array, samplingRate: number) => {
      if (stoppedRef.current) return
      playbackQueueRef.current.push({ audio, samplingRate })
      if (!isPlayingQueueRef.current) {
        isPlayingQueueRef.current = true
        void playNextInQueue()
      }
    },
    [playNextInQueue],
  )

  const waitUntilDone = useCallback((): Promise<void> => {
    if (!isPlayingQueueRef.current && playbackQueueRef.current.length === 0) {
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      drainResolveRef.current = resolve
    })
  }, [])

  const playPCM = useCallback(
    async (audio: Float32Array, samplingRate: number): Promise<void> => {
      stoppedRef.current = false
      playbackQueueRef.current = []
      enqueuePCM(audio, samplingRate)
      await waitUntilDone()
    },
    [enqueuePCM, waitUntilDone],
  )

  const synthesize = useCallback(
    async (
      text: string,
      options?: { forQueue?: boolean; live?: boolean },
    ): Promise<SynthesisResult> => {
      if (!readyRef.current) {
        throw new Error("TTS not loaded")
      }

      setSynthesisProgress(0)
      updateStatus("synthesizing")

      try {
        const result = await synthesizeSpeech(engineRef.current, text, voiceRef.current, {
          language: languageRef.current,
          live: options?.live,
          onProgress: (step, total) => {
            setSynthesisProgress(Math.round((step / total) * 100))
          },
        })

        setSynthesisProgress(100)
        if (!options?.forQueue) {
          updateStatus("ready")
        }
        return result
      } catch (error) {
        console.error("TTS synthesize error:", error)
        if (!options?.forQueue) {
          updateStatus("ready")
        }
        onError?.(error as Error)
        throw error
      }
    },
    [updateStatus, onError],
  )

  const speak = useCallback(
    async (text: string): Promise<void> => {
      const result = await synthesize(text)
      await playPCM(result.audio, result.sampling_rate)
    },
    [synthesize, playPCM],
  )

  const stop = useCallback(() => {
    stoppedRef.current = true
    playbackQueueRef.current = []
    isPlayingQueueRef.current = false
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current = null
    }
    drainResolveRef.current?.()
    drainResolveRef.current = null
    updateStatus("ready")
  }, [updateStatus])

  const setMuted = useCallback((muted: boolean) => {
    setMutedState(muted)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : 1
    }
  }, [])

  const changeVoice = useCallback(
    async (newVoice: string) => {
      voiceRef.current = newVoice
      setActiveVoice(newVoice)
      if (readyRef.current) {
        await loadVoice(engineRef.current, newVoice, (info) => {
          setLoadProgress(info.progress)
        })
      }
    },
    [],
  )

  const changeLanguage = useCallback((newLanguage: TTSLanguage) => {
    languageRef.current = newLanguage
    setLanguageState(newLanguage)
  }, [])

  const reset = useCallback(async () => {
    stop()
    await unloadAllTTS()
    readyRef.current = false
    setBackend(null)
    setLoadProgress(0)
    setSynthesisProgress(0)
    updateStatus("idle")
  }, [stop, updateStatus])

  useEffect(() => {
    engineRef.current = engine
    setActiveEngine(engine)
  }, [engine])

  useEffect(() => {
    voiceRef.current = voice
    setActiveVoice(voice)
  }, [voice])

  useEffect(() => {
    languageRef.current = initialLanguage
    setLanguageState(initialLanguage)
  }, [initialLanguage])

  useEffect(() => {
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  return {
    status,
    loadProgress,
    synthesisProgress,
    engine: activeEngine,
    voice: activeVoice,
    setVoice: changeVoice,
    language,
    setLanguage: changeLanguage,
    backend,
    loadModels,
    speak,
    synthesize,
    playPCM,
    enqueuePCM,
    waitUntilDone,
    analyser: analyserRef.current,
    stop,
    reset,
    muted,
    setMuted,
    isReady: status === "ready",
    isLoading: status === "loading",
    isSynthesizing: status === "synthesizing",
    isSpeaking: status === "speaking",
  }
}

export function getDefaultTTSVoice(engine: TTSEngine): string {
  return getDefaultVoiceForEngine(engine)
}
