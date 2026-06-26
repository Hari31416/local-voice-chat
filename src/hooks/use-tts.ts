/**
 * Hook for browser-based TTS using Supertonic 3 (ONNX Runtime Web)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  loadEngine,
  loadVoice,
  synthesizeSpeech,
  type TTSVoice,
  type TTSLanguage,
} from "@/lib/tts"

export type TTSStatus = "idle" | "loading" | "ready" | "speaking" | "error"
export type { TTSVoice, TTSLanguage }

interface UseTTSOptions {
  onStatusChange?: (status: TTSStatus) => void
  onError?: (error: Error) => void
}

export function useTTS(options: UseTTSOptions = {}) {
  const { onStatusChange, onError } = options

  const [status, setStatus] = useState<TTSStatus>("idle")
  const [loadProgress, setLoadProgress] = useState(0)
  const [voice, setVoice] = useState<TTSVoice>("F1")
  const [language, setLanguage] = useState<TTSLanguage>("auto")
  const [backend, setBackend] = useState<"webgpu" | "wasm" | null>(null)

  const readyRef = useRef(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const [muted, setMutedState] = useState(false)
  const voiceRef = useRef<TTSVoice>("F1")
  const languageRef = useRef<TTSLanguage>("auto")

  const updateStatus = useCallback(
    (newStatus: TTSStatus) => {
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModels = useCallback(async () => {
    if (readyRef.current) return

    updateStatus("loading")

    try {
      const { backend: activeBackend } = await loadEngine((info) => {
        setLoadProgress(Math.round((info.current / info.total) * 100))
      })

      await loadVoice(voiceRef.current)

      setBackend(activeBackend)
      readyRef.current = true
      updateStatus("ready")
    } catch (error) {
      console.error("TTS load error:", error)
      updateStatus("error")
      onError?.(error as Error)
    }
  }, [updateStatus, onError])

  const speak = useCallback(
    async (text: string): Promise<void> => {
      if (!readyRef.current) {
        throw new Error("TTS not loaded")
      }

      updateStatus("speaking")

      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext()
        }
        const ctx = audioContextRef.current
        if (ctx.state === "suspended") {
          await ctx.resume()
        }

        const result = await synthesizeSpeech(text, voiceRef.current, {
          language: languageRef.current,
        })

        console.debug("[TTS] Supertonic 3:", {
          voice: voiceRef.current,
          language: result.language,
          samples: result.audio.length,
          sampleRate: result.sampling_rate,
        })

        const audioBuffer = ctx.createBuffer(1, result.audio.length, result.sampling_rate)
        audioBuffer.getChannelData(0).set(result.audio)

        if (!gainNodeRef.current) {
          gainNodeRef.current = ctx.createGain()
          gainNodeRef.current.connect(ctx.destination)
        }

        const source = ctx.createBufferSource()
        source.buffer = audioBuffer
        source.connect(gainNodeRef.current)
        sourceNodeRef.current = source

        await new Promise<void>((resolve) => {
          source.onended = () => {
            sourceNodeRef.current = null
            resolve()
          }
          source.start()
        })

        updateStatus("ready")
      } catch (error) {
        console.error("TTS speak error:", error)
        updateStatus("ready")
        onError?.(error as Error)
      }
    },
    [updateStatus, onError],
  )

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current = null
    }
    updateStatus("ready")
  }, [updateStatus])

  const setMuted = useCallback((muted: boolean) => {
    setMutedState(muted)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : 1
    }
  }, [])

  const changeVoice = useCallback(async (newVoice: TTSVoice) => {
    voiceRef.current = newVoice
    setVoice(newVoice)
    if (readyRef.current) {
      await loadVoice(newVoice)
    }
  }, [])

  const changeLanguage = useCallback((newLanguage: TTSLanguage) => {
    languageRef.current = newLanguage
    setLanguage(newLanguage)
  }, [])

  useEffect(() => {
    voiceRef.current = voice
  }, [voice])

  useEffect(() => {
    languageRef.current = language
  }, [language])

  useEffect(() => {
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  return {
    status,
    loadProgress,
    voice,
    setVoice: changeVoice,
    language,
    setLanguage: changeLanguage,
    backend,
    loadModels,
    speak,
    stop,
    muted,
    setMuted,
    isReady: status === "ready",
    isLoading: status === "loading",
    isSpeaking: status === "speaking",
  }
}
