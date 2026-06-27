import { useState, useRef, useCallback, useEffect } from "react"
import type { SetupSelection } from "@/components/setup-screen"
import { useTTS } from "@/hooks/use-tts"
import { useGemma4 } from "@/hooks/use-gemma4"
import { useWebLLM } from "@/hooks/use-webllm"
import { DEFAULT_LLM_ID, LLM_OPTIONS } from "@/lib/llm-models"
import { buildSystemPrompt } from "@/lib/system-prompt"
import { IS_IOS } from "@/lib/voice-agent-constants"
import {
  type ChatMessage,
  type DebugInfo,
  type LoadProgress,
  type SetupPhase,
  type VoiceAgentStatus,
  INITIAL_DEBUG_INFO,
} from "@/lib/voice-agent-types"
import {
  clearPreferences,
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type UserPreferences,
} from "@/lib/user-preferences"
import { PIPER_VOICES, SUPERTRONIC_VOICES, TTS_ENGINE_OPTIONS } from "@/lib/tts-voices"
import { resizeImage } from "@/lib/utils"
import { pcmToWav } from "@/lib/piper/wav"

export function useVoiceAgent() {
  const [status, setStatus] = useState<VoiceAgentStatus>("idle")
  const [statusMessage, setStatusMessage] = useState("Choose your models to begin")
  const [setupPhase, setSetupPhase] = useState<SetupPhase>("selecting")
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [selectedLLMId, setSelectedLLMId] = useState<string>(
    () => loadPreferences().llmId || DEFAULT_LLM_ID,
  )
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [sttLoadProgress, setSttLoadProgress] = useState(0)
  const [sttTranscriptResult, setSttTranscriptResult] = useState<string | null>(null)
  const [sttTranscribing, setSttTranscribing] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>(INITIAL_DEBUG_INFO)
  const [isSecure, setIsSecure] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isCallActiveRef = useRef(false)
  const messagesRef = useRef<ChatMessage[]>([])
  const isProcessingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingUserInputRef = useRef<string | null>(null)

  const tts = useTTS({
    engine: prefs.ttsEngine,
    voice: prefs.ttsVoice,
    language: prefs.ttsLanguage,
    onStatusChange: (ttsStatus) => {
      if (ttsStatus === "synthesizing") {
        setStatus("synthesizing")
        setStatusMessage("Synthesizing speech...")
      } else if (ttsStatus === "speaking") {
        setStatus("speaking")
        setStatusMessage("Speaking...")
      } else if (ttsStatus === "ready") {
        if (isCallActiveRef.current) {
          setStatus("listening")
          setStatusMessage("Listening...")
        } else {
          setStatus("ready")
          setStatusMessage("Ready!")
        }
      }
    },
    onError: (error) => {
      console.error("TTS error:", error)
      setStatusMessage(`TTS error: ${error.message}`)
    },
  })

  const gemma4 = useGemma4({
    onStatusChange: (llmStatus) => {
      if (llmStatus === "generating") {
        setStatus("thinking")
        setStatusMessage("Thinking...")
      }
    },
    onError: (error) => {
      console.error("Gemma4 error:", error)
      setStatusMessage(`LLM error: ${error.message}`)
    },
  })

  const webllm = useWebLLM({
    onStatusChange: (llmStatus) => {
      if (llmStatus === "generating") {
        setStatus("thinking")
        setStatusMessage("Thinking...")
      }
    },
    onError: (error) => {
      console.error("WebLLM error:", error)
      setStatusMessage(`LLM error: ${error.message}`)
    },
  })

  const gemma4Ref = useRef(gemma4)
  const webllmRef = useRef(webllm)
  const selectedLLMIdRef = useRef(selectedLLMId)
  const prefsRef = useRef(prefs)
  const setupPhaseRef = useRef(setupPhase)

  useEffect(() => {
    gemma4Ref.current = gemma4
    webllmRef.current = webllm
    selectedLLMIdRef.current = selectedLLMId
    prefsRef.current = prefs
    setupPhaseRef.current = setupPhase
  }, [gemma4, webllm, selectedLLMId, prefs, setupPhase])

  const selectedOption = LLM_OPTIONS.find((o) => o.id === selectedLLMId) || LLM_OPTIONS[0]
  const llmLoadProgress =
    selectedOption.backend === "gemma4" ? gemma4.loadProgress : webllm.loadProgress

  const activeLoadProgress: LoadProgress | null = !debugInfo.sttLoaded
    ? { label: "STT", progress: sttLoadProgress, color: "bg-green-500" }
    : !debugInfo.ttsLoaded
      ? { label: "TTS", progress: tts.loadProgress, color: "bg-blue-500" }
      : !debugInfo.llmLoaded
        ? {
            label: `LLM (${selectedOption.name})`,
            progress: llmLoadProgress,
            color: "bg-purple-500",
          }
        : null

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  const stopListening = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    workerRef.current?.postMessage({ type: "stop" })
  }, [])

  const handleLLMResponse = useCallback(
    async (conversationHistory: ChatMessage[]) => {
      if (isProcessingRef.current) {
        console.debug("[Voice] Ignoring request - already processing")
        return
      }
      isProcessingRef.current = true
      pendingUserInputRef.current = null

      abortControllerRef.current = new AbortController()

      setStatus("thinking")
      setStatusMessage("Thinking...")

      try {
        setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        const MAX_HISTORY = IS_IOS ? 4 : 10
        const recentHistory = conversationHistory.slice(-MAX_HISTORY)
        const chatMessages = recentHistory.map((m) => ({ role: m.role, content: m.content }))
        const lastUserText =
          [...recentHistory].reverse().find((m) => m.role === 'user')?.content ?? ''
        const systemPrompt = buildSystemPrompt(lastUserText)

        let assistantMessage = ''
        const option =
          LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]

        if (option.backend === 'gemma4') {
          const currentGemma4 = gemma4Ref.current
          if (!currentGemma4.isReady) {
            throw new Error(
              'Gemma 4 is not loaded — reload the page or switch model in the dropdown'
            )
          }
          console.debug(
            `[Voice] Using Gemma 4 E2B, history: ${recentHistory.length}/${conversationHistory.length}`
          )

          const lastUserMsg = [...recentHistory].reverse().find((m) => m.role === 'user')
          const lastUserImage = lastUserMsg?.image

          assistantMessage = await currentGemma4.chat(chatMessages, systemPrompt, lastUserImage)
          setMessages((prev) => {
            const copy = [...prev]
            if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantMessage }
            }
            return copy
          })
        } else {
          const currentWebllm = webllmRef.current
          if (!currentWebllm.isReady) {
            throw new Error('LLM not ready')
          }
          console.debug(
            `[Voice] Using WebLLM (${option.name}), history: ${recentHistory.length}/${conversationHistory.length}`
          )

          const generator = currentWebllm.chatStream(chatMessages, systemPrompt)
          for await (const delta of generator) {
            assistantMessage += delta
            setMessages((prev) => {
              const copy = [...prev]
              if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantMessage }
              }
              return copy
            })
          }
        }

        if (!assistantMessage.trim()) {
          throw new Error('LLM returned an empty response')
        }

        const result = await tts.synthesize(assistantMessage)
        
        // Encode PCM float32 to WAV
        const wavBytes = pcmToWav(result.audio, result.sampling_rate)
        const blob = new Blob([wavBytes], { type: 'audio/wav' })
        const url = URL.createObjectURL(blob)

        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
            copy[copy.length - 1] = { ...copy[copy.length - 1], audioUrl: url }
          }
          return copy
        })
        console.log('[LLM]', assistantMessage)

        await tts.playPCM(result.audio, result.sampling_rate)
      } catch (error) {
        setMessages((prev) => {
          const copy = [...prev]
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant' && !copy[copy.length - 1].audioUrl) {
            copy.pop()
          }
          return copy
        })

        if (error instanceof Error && error.name === 'AbortError') {
          console.debug('[Voice] Request aborted by user interruption')
        } else {
          console.error('LLM error:', error)
          setStatus('error')
          setStatusMessage(error instanceof Error ? error.message : `LLM error: ${error}`)
        }
        if (isCallActiveRef.current) {
          setStatus("listening")
          setStatusMessage("Listening...")
        } else {
          setStatus("ready")
        }
      } finally {
        isProcessingRef.current = false
        abortControllerRef.current = null

        if (pendingUserInputRef.current) {
          const pendingText = pendingUserInputRef.current
          pendingUserInputRef.current = null
          console.debug("[Voice] Processing pending input:", pendingText)
          const userMessage: ChatMessage = { role: "user", content: pendingText }
          setMessages((prev) => [...prev, userMessage])
          setTimeout(() => {
            handleLLMResponse([...messagesRef.current, userMessage])
          }, 0)
        }
      }
    },
    [tts],
  )

  const initWorker = useCallback(() => {
    if (workerRef.current) return

    const worker = new Worker("/stt-worker-esm.js", { type: "module" })

    worker.onmessage = async (event) => {
      const { type, status: msgStatus, message, text, isFinal, progress } = event.data

      switch (type) {
        case "progress":
          if (typeof progress === "number") {
            setSttLoadProgress(
              progress <= 1 ? Math.round(progress * 100) : Math.round(progress),
            )
          }
          if (message) {
            setStatusMessage(message)
          }
          break

        case "status":
          if (msgStatus === "ready") {
            setSttLoadProgress(100)
            setDebugInfo((prev) => ({ ...prev, vadLoaded: true, sttLoaded: true }))

            if (setupPhaseRef.current === "loading") {
              const ttsPrefs = prefsRef.current
              const ttsEngineLabel =
                TTS_ENGINE_OPTIONS.find((o) => o.id === ttsPrefs.ttsEngine)?.name ?? "TTS"
              const ttsSize =
                ttsPrefs.ttsEngine === "supertonic"
                  ? "~400MB"
                  : (PIPER_VOICES.find((v) => v.id === ttsPrefs.ttsVoice)?.sizeLabel ?? "~60MB")
              setStatusMessage(`Loading ${ttsEngineLabel} TTS (${ttsSize})...`)
              await tts.loadModels({
                engine: ttsPrefs.ttsEngine,
                voice: ttsPrefs.ttsVoice,
              })
              setDebugInfo((prev) => ({ ...prev, ttsLoaded: true }))

              const selectedId = selectedLLMIdRef.current
              const option = LLM_OPTIONS.find((o) => o.id === selectedId) || LLM_OPTIONS[0]
              let llmReady = false

              try {
                if (option.backend === "gemma4") {
                  setStatusMessage("Loading Gemma 4 E2B LLM (~3.2GB)...")
                  llmReady = await gemma4Ref.current.loadModel()
                } else {
                  setStatusMessage(`Loading ${option.name} LLM (${option.sizeLabel})...`)
                  llmReady = await webllmRef.current.loadModel(option.webllmId as never)
                }
              } catch (error) {
                console.error("[Voice] LLM load error:", error)
              }

              if (!llmReady) {
                setStatus("error")
                setStatusMessage(
                  option.backend === "gemma4"
                    ? "Gemma 4 failed to load. Try Qwen via the dropdown selector, or check WebGPU / available memory."
                    : "LLM failed to load. Check the browser console for details.",
                )
                break
              }

              setDebugInfo((prev) => ({ ...prev, llmLoaded: true, llmMode: selectedId }))

              setSetupPhase("ready")
              setStatus("ready")
              setStatusMessage("Ready! Click 'Start Call' to begin.")
              console.log("[Voice] Ready - STT, TTS, LLM loaded")
            } else {
              setStatus("ready")
              setStatusMessage("STT loaded and ready!")
            }
          } else if (msgStatus === "loading") {
            setStatus("loading")
            setStatusMessage(message)
          } else if (msgStatus === "listening") {
            if (isCallActiveRef.current) {
              setStatus("listening")
              setStatusMessage("Listening...")
            }
          } else if (msgStatus === "recording") {
            setStatus("recording")
            setStatusMessage("Recording...")
          } else if (msgStatus === "transcribing") {
            setStatus("transcribing")
            setStatusMessage("Transcribing...")
          }
          break

        case "transcript":
          if (isFinal && text && text.trim()) {
            console.log("[STT]", text)

            if (isProcessingRef.current) {
              console.debug("[Voice] Interrupting - new user input")
              abortControllerRef.current?.abort()

              const currentOption =
                LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
              if (currentOption.backend === "gemma4") {
                gemma4Ref.current.abort()
              } else {
                webllmRef.current.abort()
              }
              tts.stop()
              pendingUserInputRef.current = text.trim()
              return
            }

            const userMessage: ChatMessage = { role: "user", content: text.trim() }
            setMessages((prev) => [...prev, userMessage])
            handleLLMResponse([...messagesRef.current, userMessage])
          }
          break

        case "transcript_full_result":
          setSttTranscriptResult(text)
          setSttTranscribing(false)
          setStatus("ready")
          setStatusMessage("Transcription complete!")
          break

        case "error":
          setStatus("error")
          setStatusMessage(`Error: ${message}`)
          setSttTranscribing(false)
          break
      }
    }

    worker.onerror = (error) => {
      console.error("Worker error:", error)
      setStatus("error")
      setStatusMessage(`Worker error: ${error.message}`)
    }

    workerRef.current = worker
  }, [tts, handleLLMResponse])

  const loadModels = useCallback(async () => {
    initWorker()
    setStatus("loading")
    setSttLoadProgress(0)
    setStatusMessage("Loading STT models...")
    workerRef.current?.postMessage({ type: "init" })
  }, [initWorker])

  const loadSTTOnly = useCallback(async () => {
    initWorker()
    setStatus("loading")
    setSttLoadProgress(0)
    setStatusMessage("Loading STT models...")
    workerRef.current?.postMessage({ type: "init" })
  }, [initWorker])

  const transcribeAudioBuffer = useCallback((buffer: Float32Array) => {
    initWorker()
    setSttTranscriptResult(null)
    setSttTranscribing(true)
    setStatus("transcribing")
    setStatusMessage("Transcribing audio...")
    workerRef.current?.postMessage({ type: "transcribe_buffer", buffer })
  }, [initWorker])

  const handleSetupStart = useCallback(
    (selection: SetupSelection) => {
      const newPrefs: UserPreferences = {
        ...selection,
        configured: true,
      }
      savePreferences(newPrefs)
      setPrefs(newPrefs)
      prefsRef.current = newPrefs
      setSelectedLLMId(selection.llmId)
      selectedLLMIdRef.current = selection.llmId
      setSetupPhase("loading")
      loadModels()
    },
    [loadModels],
  )

  const switchLLM = useCallback(
    async (newModelId: string) => {
      if (newModelId === selectedLLMIdRef.current) return

      setSelectedLLMId(newModelId)
      selectedLLMIdRef.current = newModelId
      savePreferences({ ...prefsRef.current, llmId: newModelId, configured: true })

      if (!debugInfo.llmLoaded && status !== "ready" && status !== "error") {
        return
      }

      setStatus("loading")
      setDebugInfo((prev) => ({ ...prev, llmLoaded: false, llmMode: newModelId }))

      const oldOption = LLM_OPTIONS.find((o) => o.id === selectedLLMId)
      const newOption = LLM_OPTIONS.find((o) => o.id === newModelId)

      if (oldOption && newOption) {
        if (oldOption.backend === "gemma4" && newOption.backend === "webllm") {
          await gemma4Ref.current.unload()
        } else if (oldOption.backend === "webllm" && newOption.backend === "gemma4") {
          await webllmRef.current.unload()
        } else if (
          oldOption.backend === "webllm" &&
          newOption.backend === "webllm" &&
          oldOption.webllmId !== newOption.webllmId
        ) {
          await webllmRef.current.unload()
        }
      }

      try {
        let llmReady = false
        if (newOption?.backend === "gemma4") {
          setStatusMessage("Loading Gemma 4 E2B LLM (~3.2GB)...")
          llmReady = await gemma4Ref.current.loadModel()
        } else if (newOption) {
          setStatusMessage(`Loading ${newOption.name} LLM (${newOption.sizeLabel})...`)
          llmReady = await webllmRef.current.loadModel(newOption.webllmId as never)
        }

        if (!llmReady) {
          setStatus("error")
          setStatusMessage("LLM failed to load. Check browser console or try another model.")
          return
        }

        setDebugInfo((prev) => ({ ...prev, llmLoaded: true }))
        setStatus("ready")
        setStatusMessage("Ready! Click 'Start Call' to begin.")
      } catch (err) {
        console.error("[Voice] Switch LLM error:", err)
        setStatus("error")
        setStatusMessage(`LLM failed to load: ${err instanceof Error ? err.message : String(err)}`)
      }
    },
    [selectedLLMId, status, debugInfo.llmLoaded],
  )

  const handleImageSelect = useCallback(async (file: File) => {
    try {
      const resized = await resizeImage(file)
      setPendingImage(resized)
    } catch (err) {
      console.error("Failed to process image:", err)
    }
  }, [])

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      await audioContext.audioWorklet.addModule("/vad-processor.js")

      const workletNode = new AudioWorkletNode(audioContext, "vad-processor")
      workletNodeRef.current = workletNode

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(workletNode)

      workletNode.port.onmessage = (event) => {
        const { buffer } = event.data
        workerRef.current?.postMessage({ type: "audio", buffer })
      }

      setStatus("listening")
      setStatusMessage("Listening...")
    } catch (error) {
      console.error("Microphone error:", error)
      setStatus("error")
      setStatusMessage(`Microphone error: ${error}`)
    }
  }, [])

  const toggleMicMute = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMicMuted
        setIsMicMuted(!isMicMuted)
      }
    }
  }, [isMicMuted])

  const startCall = useCallback(async () => {
    setIsCallActive(true)
    setMessages([])
    await startListening()
  }, [startListening])

  const endCall = useCallback(() => {
    abortControllerRef.current?.abort()
    const option =
      LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
    if (option.backend === "gemma4") {
      gemma4Ref.current.abort()
    } else {
      webllmRef.current.abort()
    }
    abortControllerRef.current = null
    isProcessingRef.current = false

    setIsCallActive(false)
    stopListening()
    tts.stop()
    setStatus("ready")
    setStatusMessage("Ready! Click mic to start a new call.")
  }, [stopListening, tts])

  const handleResetPreferences = useCallback(async () => {
    abortControllerRef.current?.abort()
    isProcessingRef.current = false

    if (isCallActiveRef.current) {
      setIsCallActive(false)
      stopListening()
    }

    tts.stop()
    await tts.reset()

    workerRef.current?.terminate()
    workerRef.current = null

    await gemma4Ref.current.unload()
    await webllmRef.current.unload()

    clearPreferences()
    const resetPrefs = { ...DEFAULT_PREFERENCES }
    setPrefs(resetPrefs)
    prefsRef.current = resetPrefs
    setSelectedLLMId(DEFAULT_LLM_ID)
    selectedLLMIdRef.current = DEFAULT_LLM_ID
    setSetupPhase("selecting")
    setStatus("idle")
    setStatusMessage("Choose your models to begin")
    setSttLoadProgress(0)
    setDebugInfo((prev) => ({
      webgpu: prev.webgpu,
      sttBackend: "unknown",
      llmMode: DEFAULT_LLM_ID,
      vadLoaded: false,
      sttLoaded: false,
      ttsLoaded: false,
      llmLoaded: false,
    }))
    setMessages([])
    setPendingImage(null)
  }, [tts, stopListening])

  const submitTextMessage = useCallback(() => {
    if ((!textInput.trim() && !pendingImage) || status !== "ready") return
    const userMessage: ChatMessage = {
      role: "user",
      content: textInput.trim(),
      image: pendingImage || undefined,
    }
    setMessages((prev) => [...prev, userMessage])
    handleLLMResponse([...messagesRef.current, userMessage])
    setTextInput("")
    setPendingImage(null)
  }, [textInput, pendingImage, status, handleLLMResponse])

  const clearConversation = useCallback(() => {
    setMessages([])
    setPendingImage(null)
    tts.stop()
  }, [tts])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const secure =
        window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      setIsSecure(secure)

      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent,
        )
      setIsMobile(mobile)
    }

    const checkWebGPU = async () => {
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
          const adapter = await (
            navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }
          ).gpu.requestAdapter()
          setDebugInfo((prev) => ({
            ...prev,
            webgpu: adapter ? "available" : "no adapter",
          }))
        } catch {
          setDebugInfo((prev) => ({ ...prev, webgpu: "error" }))
        }
      } else {
        setDebugInfo((prev) => ({ ...prev, webgpu: "not supported" }))
      }
    }
    checkWebGPU()
  }, [])

  useEffect(() => {
    return () => {
      stopListening()
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [stopListening])

  const waveformActive = status === "listening" || status === "recording"
  const waveformProcessing =
    status === "speaking" || status === "thinking" || status === "transcribing"

  const voiceOptions =
    prefs.ttsEngine === "supertonic"
      ? SUPERTRONIC_VOICES
      : PIPER_VOICES.map((v) => ({ id: v.id, name: v.name, desc: v.desc }))

  return {
    status,
    statusMessage,
    setupPhase,
    prefs,
    messages,
    isCallActive,
    isMicMuted,
    textInput,
    setTextInput,
    selectedLLMId,
    pendingImage,
    setPendingImage,
    debugInfo,
    isSecure,
    isMobile,
    tts,
    selectedOption,
    activeLoadProgress,
    waveformActive,
    waveformProcessing,
    voiceOptions,
    sttLoadProgress,
    sttTranscriptResult,
    setSttTranscriptResult,
    sttTranscribing,
    loadSTTOnly,
    transcribeAudioBuffer,
    handleSetupStart,
    handleResetPreferences,
    handleImageSelect,
    submitTextMessage,
    toggleMicMute,
    startCall,
    endCall,
    switchLLM,
    clearConversation,
  }
}
