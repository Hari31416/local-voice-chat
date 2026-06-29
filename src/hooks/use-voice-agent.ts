import { useState, useRef, useCallback, useEffect } from "react"
import type { SetupSelection } from "@/components/setup-screen"
import { useTTS } from "@/hooks/use-tts"
import { useGemma4 } from "@/hooks/use-gemma4"
import { useWebLLM } from "@/hooks/use-webllm"
import { useLfm2 } from "@/hooks/use-lfm2"
import { DEFAULT_LLM_ID, LLM_OPTIONS } from "@/lib/llm-models"
import { buildSystemPrompt, getMaxTokens } from "@/lib/system-prompt"
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
} from '@/lib/user-preferences'
import { PIPER_VOICES, SUPERTRONIC_VOICES, TTS_ENGINE_OPTIONS, getVoiceProfile } from "@/lib/tts-voices"
import { resizeImage } from "@/lib/utils"
import { pcmToWav } from "@/lib/piper/wav"
import { TextSplitterStream } from "@/lib/splitter"

function concatPCM(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const combined = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }
  return combined
}

function pcmChunksToObjectUrl(chunks: Float32Array[], samplingRate: number): string {
  const wavBytes = pcmToWav(concatPCM(chunks), samplingRate)
  return URL.createObjectURL(new Blob([wavBytes], { type: "audio/wav" }))
}

function getReadyMessage(prefs: UserPreferences): string {
  if (prefs.sttEnabled && prefs.ttsEnabled) {
    return "Ready! Click 'Start Call' to begin."
  }
  if (prefs.sttEnabled) {
    return "Ready! Click the mic to speak, or type a message."
  }
  if (prefs.ttsEnabled) {
    return "Ready! Type a message to get a spoken reply."
  }
  return "Ready! Type a message to begin."
}

export function useVoiceAgent() {
  const [status, setStatus] = useState<VoiceAgentStatus>("idle")
  const [statusMessage, setStatusMessage] = useState("Choose your models to begin")
  const [setupPhase, setSetupPhase] = useState<SetupPhase>("selecting")
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPreferences())
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMicActive, setIsMicActive] = useState(false)
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
  const isMicActiveRef = useRef(false)
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
        if (isCallActiveRef.current || isMicActiveRef.current) {
          setStatus("listening")
          setStatusMessage("Listening...")
        } else {
          setStatus("ready")
          setStatusMessage(getReadyMessage(prefsRef.current))
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

  const lfm2 = useLfm2({
    onStatusChange: (llmStatus) => {
      if (llmStatus === "generating") {
        setStatus("thinking")
        setStatusMessage("Thinking...")
      }
    },
    onError: (error) => {
      console.error("LFM2 error:", error)
      setStatusMessage(`LLM error: ${error.message}`)
    },
  })

  const gemma4Ref = useRef(gemma4)
  const webllmRef = useRef(webllm)
  const lfm2Ref = useRef(lfm2)
  const ttsRef = useRef(tts)
  const selectedLLMIdRef = useRef(selectedLLMId)
  const prefsRef = useRef(prefs)
  const setupPhaseRef = useRef(setupPhase)

  useEffect(() => {
    gemma4Ref.current = gemma4
    webllmRef.current = webllm
    lfm2Ref.current = lfm2
    ttsRef.current = tts
    selectedLLMIdRef.current = selectedLLMId
    prefsRef.current = prefs
    setupPhaseRef.current = setupPhase
  }, [gemma4, webllm, lfm2, tts, selectedLLMId, prefs, setupPhase])

  const selectedOption = LLM_OPTIONS.find((o) => o.id === selectedLLMId) || LLM_OPTIONS[0]
  const llmLoadProgress =
    selectedOption.backend === "gemma4"
      ? gemma4.loadProgress
      : selectedOption.backend === "lfm2"
        ? lfm2.loadProgress
        : webllm.loadProgress

  const activeLoadProgress: LoadProgress | null =
    prefs.sttEnabled && !debugInfo.sttLoaded
    ? { label: "STT", progress: sttLoadProgress, color: "bg-green-500" }
    : prefs.ttsEnabled && !debugInfo.ttsLoaded
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
    isMicActiveRef.current = isMicActive
  }, [isMicActive])

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
        const option =
          LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
        const ttsEnabled = prefsRef.current.ttsEnabled
        const voiceProfile = ttsEnabled
          ? getVoiceProfile(ttsRef.current.engine, ttsRef.current.voice)
          : null
        const systemPrompt = buildSystemPrompt(lastUserText, ttsEnabled, voiceProfile)
        const maxTokens = getMaxTokens(
          option.backend,
          ttsEnabled,
        )

        let assistantMessage = ''

        const updateAssistantMessage = (content: string) => {
          setMessages((prev) => {
            const copy = [...prev]
            if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
              copy[copy.length - 1] = { ...copy[copy.length - 1], content }
            }
            return copy
          })
        }

        const streamLLMTextOnly = async (
          llmStream: AsyncGenerator<string, void, unknown>,
        ) => {
          for await (const delta of llmStream) {
            assistantMessage += delta
            updateAssistantMessage(assistantMessage)
          }

          if (!assistantMessage.trim()) {
            throw new Error('LLM returned an empty response')
          }

          console.log('[LLM]', assistantMessage)
        }

        const streamLLMWithSentenceTTS = async (
          llmStream: AsyncGenerator<string, void, unknown>,
        ) => {
          const splitter = new TextSplitterStream()
          const pcmChunks: Float32Array[] = []
          let samplingRate = 22050

          const synthOptions = { forQueue: true, live: true } as const

          const ttsTask = (async () => {
            const iter = splitter[Symbol.asyncIterator]()
            let prefetchedSynth: ReturnType<typeof tts.synthesize> | null = null

            const pullSentence = () => iter.next()

            let nextSentence = await pullSentence()

            while (!nextSentence.done) {
              if (abortControllerRef.current?.signal.aborted) return

              const synthPromise =
                prefetchedSynth ?? tts.synthesize(nextSentence.value, synthOptions)
              prefetchedSynth = null

              const followingSentence = pullSentence()
              const result = await synthPromise
              if (abortControllerRef.current?.signal.aborted) return

              pcmChunks.push(result.audio)
              samplingRate = result.sampling_rate
              tts.enqueuePCM(result.audio, result.sampling_rate)

              nextSentence = await followingSentence
              if (!nextSentence.done) {
                prefetchedSynth = tts.synthesize(nextSentence.value, synthOptions)
              }
            }
          })()

          for await (const delta of llmStream) {
            assistantMessage += delta
            splitter.push(delta)
            updateAssistantMessage(assistantMessage)
          }
          splitter.close()

          if (!assistantMessage.trim()) {
            throw new Error('LLM returned an empty response')
          }

          await ttsTask
          await tts.waitUntilDone()

          if (pcmChunks.length > 0) {
            const url = pcmChunksToObjectUrl(pcmChunks, samplingRate)
            setMessages((prev) => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                if (last.audioUrl) URL.revokeObjectURL(last.audioUrl)
                copy[copy.length - 1] = {
                  ...last,
                  audioUrl: url,
                  content: assistantMessage,
                }
              }
              return copy
            })
          }

          console.log('[LLM]', assistantMessage)
        }

        const runLLMStream = ttsEnabled ? streamLLMWithSentenceTTS : streamLLMTextOnly

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

          await runLLMStream(
            currentGemma4.chatStream(chatMessages, systemPrompt, lastUserImage, { maxTokens }),
          )
        } else if (option.backend === 'lfm2') {
          const currentLfm2 = lfm2Ref.current
          if (!currentLfm2.isReady) {
            throw new Error('Liquid LFM 2.5 is not loaded')
          }
          console.debug(
            `[Voice] Using Liquid LFM 2.5 (${option.name}), history: ${recentHistory.length}/${conversationHistory.length}`
          )

          await runLLMStream(
            currentLfm2.chatStream(chatMessages, systemPrompt, { maxTokens }),
          )
        } else {
          const currentWebllm = webllmRef.current
          if (!currentWebllm.isReady) {
            throw new Error('LLM not ready')
          }
          console.debug(
            `[Voice] Using WebLLM (${option.name}), history: ${recentHistory.length}/${conversationHistory.length}`
          )

          await runLLMStream(
            currentWebllm.chatStream(chatMessages, systemPrompt, { maxTokens }),
          )
        }

        if (isCallActiveRef.current || isMicActiveRef.current) {
          setStatus("listening")
          setStatusMessage("Listening...")
        } else if (!prefsRef.current.ttsEnabled) {
          setStatus("ready")
          setStatusMessage(getReadyMessage(prefsRef.current))
        }
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
        if (isCallActiveRef.current || isMicActiveRef.current) {
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

  const loadLlm = useCallback(async (): Promise<boolean> => {
    const selectedId = selectedLLMIdRef.current
    const option = LLM_OPTIONS.find((o) => o.id === selectedId) || LLM_OPTIONS[0]
    let llmReady = false

    try {
      if (option.backend === "gemma4") {
        setStatusMessage("Loading Gemma 4 E2B LLM (~3.2GB)...")
        llmReady = await gemma4Ref.current.loadModel()
      } else if (option.backend === "lfm2") {
        setStatusMessage(`Loading ${option.name} LLM (${option.sizeLabel})...`)
        llmReady = await lfm2Ref.current.loadModel(option.lfmModelId || "")
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
      return false
    }

    setDebugInfo((prev) => ({ ...prev, llmLoaded: true, llmMode: selectedId }))
    return true
  }, [])

  const loadTtsThenLlm = useCallback(async (): Promise<void> => {
    const ttsPrefs = prefsRef.current
    if (ttsPrefs.ttsEnabled) {
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
    }

    const llmReady = await loadLlm()
    if (!llmReady) return

    setSetupPhase("ready")
    setStatus("ready")
    setStatusMessage(getReadyMessage(prefsRef.current))
    console.log("[Voice] Models loaded")
  }, [tts, loadLlm])

  const initWorker = useCallback(() => {
    if (workerRef.current) return

    const worker = new Worker('/stt-worker-esm.js', { type: 'module' })

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
            setDebugInfo((prev) => ({
              ...prev,
              vadLoaded: true,
              sttLoaded: true,
              sttBackend: prefsRef.current.sttModelId,
            }))

            if (setupPhaseRef.current === "loading") {
              await loadTtsThenLlm()
            } else {
              setStatus("ready")
              setStatusMessage("STT loaded and ready!")
            }
          } else if (msgStatus === "loading") {
            setStatus("loading")
            setStatusMessage(message)
          } else if (msgStatus === "listening") {
            if (isCallActiveRef.current || isMicActiveRef.current) {
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
          if (!isCallActiveRef.current && !isMicActiveRef.current) break
          if (isFinal && text && text.trim()) {
            console.log("[STT]", text)

            if (isProcessingRef.current) {
              console.debug("[Voice] Interrupting - new user input")
              abortControllerRef.current?.abort()

              const currentOption =
                LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
              if (currentOption.backend === "gemma4") {
                gemma4Ref.current.abort()
              } else if (currentOption.backend === "lfm2") {
                lfm2Ref.current.abort()
              } else {
                webllmRef.current.abort()
              }
              if (prefsRef.current.ttsEnabled) {
                tts.stop()
              }
              pendingUserInputRef.current = text.trim()
              return
            }

            const userMessage: ChatMessage = { role: "user", content: text.trim() }
            setMessages((prev) => [...prev, userMessage])
            handleLLMResponse([...messagesRef.current, userMessage])
          }
          break

        case "transcript_full_result":
          console.log('[STT] transcript_full_result received, text:', JSON.stringify(text))
          // Use a sentinel for empty results so the UI can distinguish
          // "never ran" (null) from "ran but detected no speech" ("")
          setSttTranscriptResult(text ?? "")
          setSttTranscribing(false)
          setStatus("ready")
          setStatusMessage(text?.trim() ? "Transcription complete!" : "No speech detected")
          break

        case "error":
          setStatus("error")
          setStatusMessage(`Error: ${message}`)
          setSttTranscribing(false)
          setSttTranscriptResult(`[Error: ${message}]`)
          break
      }
    }

    worker.onerror = (error) => {
      console.error("Worker error:", error)
      setStatus("error")
      setStatusMessage(`Worker error: ${error.message}`)
    }

    workerRef.current = worker
  }, [tts, handleLLMResponse, loadTtsThenLlm])

  const loadModels = useCallback(async () => {
    setStatus("loading")
    if (prefsRef.current.sttEnabled) {
      setDebugInfo((prev) => ({ ...prev, sttLoaded: false }))
      initWorker()
      setSttLoadProgress(0)
      setStatusMessage("Loading STT models...")
      workerRef.current?.postMessage({ type: "init", modelId: prefsRef.current.sttModelId })
    } else {
      await loadTtsThenLlm()
    }
  }, [initWorker, loadTtsThenLlm])

  const loadSTTOnly = useCallback(async (modelId?: string) => {
    const activeModelId = modelId || prefsRef.current.sttModelId
    if (modelId && modelId !== prefsRef.current.sttModelId) {
      const next = { ...prefsRef.current, sttModelId: modelId, configured: true }
      savePreferences(next)
      setPrefs(next)
      prefsRef.current = next
    }
    setDebugInfo((prev) => ({ ...prev, sttLoaded: false }))
    initWorker()
    setStatus('loading')
    setSttLoadProgress(0)
    setStatusMessage(`Loading STT model (${activeModelId})...`)
    workerRef.current?.postMessage({ type: 'init', modelId: activeModelId })
  }, [initWorker])

  const transcribeAudioBuffer = useCallback((buffer: Float32Array) => {
    initWorker()
    setSttTranscriptResult(null)
    setSttTranscribing(true)
    setStatus("transcribing")
    setStatusMessage("Transcribing audio...")
    if (!workerRef.current) {
      console.error('[STT] transcribeAudioBuffer: worker is null, cannot transcribe')
      setSttTranscribing(false)
      setSttTranscriptResult('[Error: STT worker not available]')
      return
    }
    console.log('[STT] Sending buffer to worker, length:', buffer.length)
    const copy = buffer.slice()
    workerRef.current.postMessage({ type: 'transcribe_buffer', buffer: copy }, [copy.buffer])
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
      if (selection.ttsEnabled) {
        tts.preparePlayback()
      }
      loadModels()
    },
    [loadModels, tts],
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
        if (oldOption.backend !== newOption.backend) {
          if (oldOption.backend === "gemma4") await gemma4Ref.current.unload()
          else if (oldOption.backend === "webllm") await webllmRef.current.unload()
          else if (oldOption.backend === "lfm2") await lfm2Ref.current.unload()
        } else {
          if (oldOption.backend === "webllm" && oldOption.webllmId !== newOption.webllmId) {
            await webllmRef.current.unload()
          } else if (oldOption.backend === "lfm2" && oldOption.lfmModelId !== newOption.lfmModelId) {
            await lfm2Ref.current.unload()
          }
        }
      }

      try {
        let llmReady = false
        if (newOption?.backend === "gemma4") {
          setStatusMessage("Loading Gemma 4 E2B LLM (~3.2GB)...")
          llmReady = await gemma4Ref.current.loadModel()
        } else if (newOption?.backend === "lfm2") {
          setStatusMessage(`Loading ${newOption.name} LLM (${newOption.sizeLabel})...`)
          llmReady = await lfm2Ref.current.loadModel(newOption.lfmModelId || "")
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
        setStatusMessage(getReadyMessage(prefsRef.current))
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

  const toggleMic = useCallback(async () => {
    if (isMicActiveRef.current) {
      setIsMicActive(false)
      stopListening()
      setStatus("ready")
      setStatusMessage(getReadyMessage(prefsRef.current))
      return
    }

    setIsMicActive(true)
    await startListening()
  }, [startListening, stopListening])

  const startCall = useCallback(async () => {
    if (prefsRef.current.ttsEnabled) {
      tts.preparePlayback()
    }
    setIsCallActive(true)
    setMessages([])
    await startListening()
  }, [startListening, tts])

  const endCall = useCallback(() => {
    abortControllerRef.current?.abort()
    const option =
      LLM_OPTIONS.find((o) => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
    if (option.backend === "gemma4") {
      gemma4Ref.current.abort()
    } else if (option.backend === "lfm2") {
      lfm2Ref.current.abort()
    } else {
      webllmRef.current.abort()
    }
    abortControllerRef.current = null
    isProcessingRef.current = false

    setIsCallActive(false)
    stopListening()
    tts.stop()
    setStatus("ready")
    setStatusMessage(getReadyMessage(prefsRef.current))
  }, [stopListening, tts])

  const handleResetPreferences = useCallback(async () => {
    abortControllerRef.current?.abort()
    isProcessingRef.current = false

    if (isCallActiveRef.current) {
      setIsCallActive(false)
      stopListening()
    }
    if (isMicActiveRef.current) {
      setIsMicActive(false)
      stopListening()
    }

    tts.stop()
    await tts.reset()

    workerRef.current?.terminate()
    workerRef.current = null

    await gemma4Ref.current.unload()
    await webllmRef.current.unload()
    await lfm2Ref.current.unload()

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
    if (prefsRef.current.ttsEnabled) {
      tts.preparePlayback()
    }
    const userMessage: ChatMessage = {
      role: "user",
      content: textInput.trim(),
      image: pendingImage || undefined,
    }
    setMessages((prev) => [...prev, userMessage])
    handleLLMResponse([...messagesRef.current, userMessage])
    setTextInput("")
    setPendingImage(null)
  }, [textInput, pendingImage, status, handleLLMResponse, tts])

  const setHindiTypingEnabled = useCallback((enabled: boolean) => {
    const next = { ...prefsRef.current, hindiTypingEnabled: enabled, configured: true }
    savePreferences(next)
    setPrefs(next)
    prefsRef.current = next
  }, [])

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

  const waveformActive =
    status === "listening" || status === "recording"
  const waveformProcessing =
    status === "speaking" || status === "thinking" || status === "transcribing"

  const hasCallMode = prefs.sttEnabled && prefs.ttsEnabled
  const hasMicInput = prefs.sttEnabled && !prefs.ttsEnabled

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
    isMicActive,
    hasCallMode,
    hasMicInput,
    isMicMuted,
    textInput,
    setTextInput,
    setHindiTypingEnabled,
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
    toggleMic,
    startCall,
    endCall,
    switchLLM,
    clearConversation,
  }
}
