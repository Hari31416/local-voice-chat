import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { LiveWaveform } from '@/components/ui/live-waveform'
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ui/conversation'
import { Message, MessageContent } from '@/components/ui/message'
import { Mic, MicOff, Volume2, VolumeX, Phone, PhoneOff, ChevronDown, Settings, X, Camera, RotateCcw, AlertTriangle, Info } from 'lucide-react'
import { useTTS, type TTSVoice, type TTSLanguage } from '@/hooks/use-tts'
import { useGemma4 } from '@/hooks/use-gemma4'
import { useWebLLM } from '@/hooks/use-webllm'
import { detectLanguage } from '@/lib/supertonic3/engine'
import { LLM_OPTIONS } from '@/lib/llm-models'
import { resizeImage, cn } from '@/lib/utils'

type Status = 'idle' | 'loading' | 'ready' | 'listening' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error'

// Detect iOS/iPadOS
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

const DEFAULT_LLM_ID = isIOS ? 'qwen-0.5b' : 'gemma4'

const BASE_SYSTEM_PROMPT = `You are a warm, helpful voice assistant in a hands-free chat.

Language (critical):
- Reply in the same language the user just used.
- Hindi query → Hindi reply (Devanagari script).
- English query → English reply.
- Mixed Hindi-English (Hinglish) → match that mix naturally.
- Do not switch to English unless the user wrote in English.

Style:
- Keep answers short: 1–3 sentences, easy to speak aloud.
- Be conversational, not formal or robotic.
- No emojis, markdown, or bullet lists.`

function buildSystemPrompt(lastUserMessage: string): string {
  const lang = detectLanguage(lastUserMessage)
  const turnHint =
    lang === "hi"
      ? "This turn: the user wrote in Hindi. Reply only in Hindi using Devanagari script."
      : lang === "na"
        ? "This turn: the user wrote in Hinglish. Match their Hindi-English mix."
        : "This turn: the user wrote in English. Reply in English."

  return `${BASE_SYSTEM_PROMPT}\n\n${turnHint}`
}

/*
 * USING A DIFFERENT LLM:
 *
 * Default: Gemma 4 E2B via Transformers.js + onnx-community/gemma-4-E2B-it-ONNX (WebGPU).
 * Fallback: WebLLM (Qwen) — switch in the debug panel.
 * External API: replace the llm.chat() call in handleLLMResponse().
 */

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  image?: string
}

export default function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [statusMessage, setStatusMessage] = useState('Click \'Initialize\' to load models')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [showLLMMenu, setShowLLMMenu] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [selectedLLMId, setSelectedLLMId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voice_agent_selected_model')
      if (saved && LLM_OPTIONS.some(o => o.id === saved)) {
        return saved
      }
    }
    return DEFAULT_LLM_ID
  })
  const [hasUserSelected, setHasUserSelected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('voice_agent_selected_model') !== null
    }
    return false
  })
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [sttLoadProgress, setSttLoadProgress] = useState(0)
  const [debugInfo, setDebugInfo] = useState({
    webgpu: 'checking...',
    sttBackend: 'unknown',
    llmMode: DEFAULT_LLM_ID,
    vadLoaded: false,
    sttLoaded: false,
    ttsLoaded: false,
    llmLoaded: false,
  })
  const [isSecure, setIsSecure] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])
  
  const workerRef = useRef<Worker | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isCallActiveRef = useRef(false)
  const messagesRef = useRef<ChatMessage[]>([])
  const isProcessingRef = useRef(false)  // Lock to prevent parallel LLM/TTS calls
  const abortControllerRef = useRef<AbortController | null>(null)  // For cancelling LLM requests
  const pendingUserInputRef = useRef<string | null>(null)  // Queue user input during processing

  // WebGPU TTS
  const tts = useTTS({
    onStatusChange: (ttsStatus) => {
      if (ttsStatus === "speaking") {
        setStatus("speaking")
        setStatusMessage("Speaking...")
      }
    },
    onError: (error) => {
      console.error("TTS error:", error)
      setStatusMessage(`TTS error: ${error.message}`)
    }
  })

  // Gemma 4 (default LLM via Transformers.js + ONNX WebGPU)
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
    }
  })

  // WebLLM fallback (Qwen)
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
    }
  })

  // Keep refs in sync for use in callbacks
  const gemma4Ref = useRef(gemma4)
  const webllmRef = useRef(webllm)
  const selectedLLMIdRef = useRef(selectedLLMId)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const voiceMenuRef = useRef<HTMLDivElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)
  const llmMenuRef = useRef<HTMLDivElement | null>(null)
  const debugPanelRef = useRef<HTMLDivElement | null>(null)
  const debugToggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (showVoiceMenu && voiceMenuRef.current && !voiceMenuRef.current.contains(target)) {
        setShowVoiceMenu(false)
      }
      if (showLangMenu && langMenuRef.current && !langMenuRef.current.contains(target)) {
        setShowLangMenu(false)
      }
      if (showLLMMenu && llmMenuRef.current && !llmMenuRef.current.contains(target)) {
        setShowLLMMenu(false)
      }
      if (
        showDebugPanel &&
        debugPanelRef.current &&
        !debugPanelRef.current.contains(target) &&
        debugToggleRef.current &&
        !debugToggleRef.current.contains(target)
      ) {
        setShowDebugPanel(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowVoiceMenu(false)
        setShowLangMenu(false)
        setShowLLMMenu(false)
        setShowDebugPanel(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showVoiceMenu, showLangMenu, showLLMMenu, showDebugPanel])

  useEffect(() => {
    gemma4Ref.current = gemma4
    webllmRef.current = webllm
    selectedLLMIdRef.current = selectedLLMId
  }, [gemma4, webllm, selectedLLMId])

  const selectedOption = LLM_OPTIONS.find(o => o.id === selectedLLMId) || LLM_OPTIONS[0]
  const llmLoadProgress = selectedOption.backend === 'gemma4' ? gemma4.loadProgress : webllm.loadProgress

  const activeLoadProgress = !debugInfo.sttLoaded
    ? { label: 'STT', progress: sttLoadProgress, color: 'bg-green-500' }
    : !debugInfo.ttsLoaded
      ? { label: 'TTS', progress: tts.loadProgress, color: 'bg-blue-500' }
      : !debugInfo.llmLoaded
        ? {
          label: `LLM (${selectedOption.name})`,
            progress: llmLoadProgress,
          color: 'bg-purple-500',
          }
        : null

  useEffect(() => {
    isCallActiveRef.current = isCallActive
  }, [isCallActive])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Initialize STT worker
  const initWorker = useCallback(() => {
    if (workerRef.current) return

    const worker = new Worker("/stt-worker-esm.js", { type: "module" })
    
    worker.onmessage = async (event) => {
      const { type, status: msgStatus, message, text, isFinal, progress } = event.data

      switch (type) {
        case "progress":
          if (typeof progress === "number") {
            setSttLoadProgress(progress <= 1 ? Math.round(progress * 100) : Math.round(progress))
          }
          if (message) {
            setStatusMessage(message)
          }
          break

        case "status":
          if (msgStatus === "ready") {
            setSttLoadProgress(100)
            setDebugInfo(prev => ({ ...prev, vadLoaded: true, sttLoaded: true }))
            
            // STT ready, now load TTS
            setStatusMessage("Loading Supertonic 3 TTS (~400MB)...")
            await tts.loadModels()
            setDebugInfo(prev => ({ ...prev, ttsLoaded: true }))
            
            // Load LLM based on selected registry option
            const selectedId = selectedLLMIdRef.current
            const option = LLM_OPTIONS.find(o => o.id === selectedId) || LLM_OPTIONS[0]
            let llmReady = false

            try {
              if (option.backend === 'gemma4') {
                setStatusMessage('Loading Gemma 4 E2B LLM (~3.2GB)...')
                llmReady = await gemma4Ref.current.loadModel()
              } else {
                setStatusMessage(`Loading ${option.name} LLM (${option.sizeLabel})...`)
                llmReady = await webllmRef.current.loadModel(option.webllmId as any)
              }
            } catch (error) {
              console.error('[Voice] LLM load error:', error)
            }

            if (!llmReady) {
              setStatus('error')
              setStatusMessage(
                option.backend === 'gemma4'
                  ? 'Gemma 4 failed to load. Try Qwen via the dropdown selector, or check WebGPU / available memory.'
                  : 'LLM failed to load. Check the browser console for details.',
              )
              break
            }

            setDebugInfo(prev => ({ ...prev, llmLoaded: true, llmMode: selectedId }))
            
            setStatus("ready")
            setStatusMessage("Ready! Click 'Start Call' to begin.")
            console.log("[Voice] Ready - STT, TTS, LLM loaded")
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
            
            // If we're currently processing, interrupt and queue the new input
            if (isProcessingRef.current) {
              console.debug("[Voice] Interrupting - new user input")
              abortControllerRef.current?.abort()

              const currentOption = LLM_OPTIONS.find(o => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
              if (currentOption.backend === 'gemma4') {
                gemma4Ref.current.abort()
              } else {
                webllmRef.current.abort()
              }
              // Stop TTS playback
              tts.stop()
              // Queue this input
              pendingUserInputRef.current = text.trim()
              return
            }
            
            const userMessage: ChatMessage = { role: 'user', content: text.trim() }
            setMessages(prev => [...prev, userMessage])
            handleLLMResponse([...messagesRef.current, userMessage])
          }
          break

        case "error":
          setStatus("error")
          setStatusMessage(`Error: ${message}`)
          break
      }
    }

    worker.onerror = (error) => {
      console.error("Worker error:", error)
      setStatus("error")
      setStatusMessage(`Worker error: ${error.message}`)
    }

    workerRef.current = worker
  }, [tts])

  // Load models
  const loadModels = useCallback(async () => {
    initWorker()
    setStatus("loading")
    setSttLoadProgress(0)
    setStatusMessage("Loading STT models...")
    workerRef.current?.postMessage({ type: "init" })
  }, [initWorker])

  const selectAndInitialize = useCallback((modelId: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('voice_agent_selected_model', modelId)
    }
    setSelectedLLMId(modelId)
    selectedLLMIdRef.current = modelId
    setHasUserSelected(true)
    loadModels()
  }, [loadModels])

  const switchLLM = useCallback(async (newModelId: string) => {
    if (newModelId === selectedLLMIdRef.current) return

    setSelectedLLMId(newModelId)
    selectedLLMIdRef.current = newModelId
    if (typeof window !== 'undefined') {
      localStorage.setItem('voice_agent_selected_model', newModelId)
    }
    setHasUserSelected(true)

    if (!debugInfo.llmLoaded && status !== 'ready' && status !== 'error') {
      return
    }

    setStatus('loading')
    setDebugInfo(prev => ({ ...prev, llmLoaded: false, llmMode: newModelId }))

    const oldOption = LLM_OPTIONS.find(o => o.id === selectedLLMId)
    const newOption = LLM_OPTIONS.find(o => o.id === newModelId)

    if (oldOption && newOption) {
      if (oldOption.backend === 'gemma4' && newOption.backend === 'webllm') {
        await gemma4Ref.current.unload()
      } else if (oldOption.backend === 'webllm' && newOption.backend === 'gemma4') {
        await webllmRef.current.unload()
      } else if (oldOption.backend === 'webllm' && newOption.backend === 'webllm' && oldOption.webllmId !== newOption.webllmId) {
        await webllmRef.current.unload()
      }
    }

    try {
      let llmReady = false
      if (newOption?.backend === 'gemma4') {
        setStatusMessage('Loading Gemma 4 E2B LLM (~3.2GB)...')
        llmReady = await gemma4Ref.current.loadModel()
      } else if (newOption) {
        setStatusMessage(`Loading ${newOption.name} LLM (${newOption.sizeLabel})...`)
        llmReady = await webllmRef.current.loadModel(newOption.webllmId as any)
      }

      if (!llmReady) {
        setStatus('error')
        setStatusMessage('LLM failed to load. Check browser console or try another model.')
        return
      }

      setDebugInfo(prev => ({ ...prev, llmLoaded: true }))
      setStatus('ready')
      setStatusMessage('Ready! Click \'Start Call\' to begin.')
    } catch (err) {
      console.error('[Voice] Switch LLM error:', err)
      setStatus('error')
      setStatusMessage(`LLM failed to load: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [selectedLLMId, status, debugInfo.llmLoaded])

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const resized = await resizeImage(file)
      setPendingImage(resized)
    } catch (err) {
      console.error('Failed to process image:', err)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle LLM response with interruption support
  const handleLLMResponse = async (conversationHistory: ChatMessage[]) => {
    // Prevent parallel LLM/TTS calls
    if (isProcessingRef.current) {
      console.debug("[Voice] Ignoring request - already processing")
      return
    }
    isProcessingRef.current = true
    pendingUserInputRef.current = null

    // Create abort controller for API requests
    abortControllerRef.current = new AbortController()

    setStatus("thinking")
    setStatusMessage("Thinking...")

    try {
      const MAX_HISTORY = isIOS ? 4 : 10
      const recentHistory = conversationHistory.slice(-MAX_HISTORY)
      const chatMessages = recentHistory.map(m => ({ role: m.role, content: m.content }))
      const lastUserText = [...recentHistory].reverse().find(m => m.role === "user")?.content ?? ""
      const systemPrompt = buildSystemPrompt(lastUserText)

      let assistantMessage: string
      const option = LLM_OPTIONS.find(o => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]

      if (option.backend === "gemma4") {
        const currentGemma4 = gemma4Ref.current
        if (!currentGemma4.isReady) {
          throw new Error("Gemma 4 is not loaded — reload the page or switch model in the dropdown")
        }
        console.debug(`[Voice] Using Gemma 4 E2B, history: ${recentHistory.length}/${conversationHistory.length}`)

        const lastUserMsg = [...recentHistory].reverse().find(m => m.role === "user")
        const lastUserImage = lastUserMsg?.image

        assistantMessage = await currentGemma4.chat(chatMessages, systemPrompt, lastUserImage)
      } else {
        const currentWebllm = webllmRef.current
        if (!currentWebllm.isReady) {
          throw new Error("LLM not ready")
        }
        console.debug(`[Voice] Using WebLLM (${option.name}), history: ${recentHistory.length}/${conversationHistory.length}`)
        assistantMessage = await currentWebllm.chat(chatMessages, systemPrompt)
      }

      if (!assistantMessage.trim()) {
        throw new Error("LLM returned an empty response")
      }

      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }])
      console.log("[LLM]", assistantMessage)

      // Speak the response (can be interrupted)
      setStatus("speaking")
      setStatusMessage("Speaking...")
      await tts.speak(assistantMessage)

      if (isCallActiveRef.current) {
        setStatus("listening")
        setStatusMessage("Listening...")
      } else {
        setStatus("ready")
        setStatusMessage("Ready!")
      }

    } catch (error) {
      // Check if this was an intentional abort (user interrupted)
      if (error instanceof Error && error.name === "AbortError") {
        console.debug("[Voice] Request aborted by user interruption")
      } else {
        console.error("LLM error:", error)
        setStatus("error")
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
      
      // Process any pending user input that came in during processing
      if (pendingUserInputRef.current) {
        const pendingText = pendingUserInputRef.current
        pendingUserInputRef.current = null
        console.debug("[Voice] Processing pending input:", pendingText)
        const userMessage: ChatMessage = { role: "user", content: pendingText }
        setMessages(prev => [...prev, userMessage])
        // Use setTimeout to avoid call stack issues
        setTimeout(() => {
          handleLLMResponse([...messagesRef.current, userMessage])
        }, 0)
      }
    }
  }

  // Start microphone and VAD
  const startListening = async () => {
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
  }

  // Stop microphone
  const stopListening = () => {
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect()
      workletNodeRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    workerRef.current?.postMessage({ type: "stop" })
  }

  // Toggle mic mute
  const toggleMicMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMicMuted
        setIsMicMuted(!isMicMuted)
      }
    }
  }

  // Start call
  const startCall = async () => {
    setIsCallActive(true)
    setMessages([])
    await startListening()
  }

  // End call
  const endCall = () => {
    abortControllerRef.current?.abort()
    const option = LLM_OPTIONS.find(o => o.id === selectedLLMIdRef.current) || LLM_OPTIONS[0]
    if (option.backend === 'gemma4') {
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
  }

  // Check WebGPU support and conditionally auto-initialize on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const secure = window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      setIsSecure(secure)

      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    // Check WebGPU
    const checkWebGPU = async () => {
      if (typeof navigator !== "undefined" && "gpu" in navigator) {
        try {
          const adapter = await (navigator as unknown as { gpu: { requestAdapter(): Promise<unknown> } }).gpu.requestAdapter()
          setDebugInfo(prev => ({ ...prev, webgpu: adapter ? "available" : "no adapter" }))
        } catch {
          setDebugInfo(prev => ({ ...prev, webgpu: "error" }))
        }
      } else {
        setDebugInfo(prev => ({ ...prev, webgpu: "not supported" }))
      }
    }
    checkWebGPU()
    
    const saved = typeof window !== 'undefined' ? localStorage.getItem('voice_agent_selected_model') : null
    if (saved) {
      console.log("[Voice] Auto-initializing with saved model:", saved)
      loadModels()
    } else {
      console.log("[Voice] Waiting for model selection...")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // Waveform states
  const waveformActive = status === "listening" || status === "recording"
  const waveformProcessing = status === "speaking" || status === "thinking" || status === "transcribing"

  const voices: { id: TTSVoice; name: string; desc: string }[] = [
    { id: "F1", name: "Female 1", desc: "Calm, steady" },
    { id: "F2", name: "Female 2", desc: "Bright, cheerful" },
    { id: "F3", name: "Female 3", desc: "Professional" },
    { id: "F4", name: "Female 4", desc: "Confident" },
    { id: "F5", name: "Female 5", desc: "Gentle" },
    { id: "M1", name: "Male 1", desc: "Lively, upbeat" },
    { id: "M2", name: "Male 2", desc: "Deep, calm" },
    { id: "M3", name: "Male 3", desc: "Authoritative" },
    { id: "M4", name: "Male 4", desc: "Soft, friendly" },
    { id: "M5", name: "Male 5", desc: "Warm" },
  ]

  const languages: { id: TTSLanguage; label: string }[] = [
    { id: "auto", label: "Auto" },
    { id: "en", label: "English" },
    { id: "hi", label: "Hindi" },
    { id: "na", label: "Hinglish" },
  ]

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Warning Banners */}
      <div className="w-full max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-2 z-30 empty:hidden">
        {/* Insecure Context Alert */}
        {!isSecure && !dismissedWarnings.includes('insecure') && (
          <div className="flex items-start gap-3 bg-red-950/20 border border-red-500/30 rounded-xl p-3.5 shadow-md shadow-red-900/5">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-red-200 text-xs">Secure Context (HTTPS) Required</h4>
              <p className="text-[11px] text-red-300/80 leading-normal mt-0.5">
                Microphone access is blocked on insecure connections. Please run/deploy this application over HTTPS or access it via localhost/127.0.0.1 for the voice feature to work.
              </p>
            </div>
            <button onClick={() => setDismissedWarnings(p => [...p, 'insecure'])} className="text-red-400/60 hover:text-red-200 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* WebGPU Missing Alert */}
        {debugInfo.webgpu !== 'checking...' && debugInfo.webgpu !== 'available' && !dismissedWarnings.includes('webgpu') && (
          <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 shadow-md shadow-amber-900/5">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-200 text-xs">
                {isIOS ? 'WebGPU Not Enabled (iOS Safari)' : 'WebGPU Not Supported'}
              </h4>
              <p className="text-[11px] text-amber-300/80 leading-normal mt-0.5">
                {isIOS
                  ? 'Local LLMs require WebGPU. To enable WebGPU on iOS, open iOS Settings > Safari > Advanced > Feature Flags (or Experimental Features) and turn on WebGPU.'
                  : 'Your current browser does not support WebGPU, which is required to run local LLMs. Please switch to a compatible browser like Google Chrome, Microsoft Edge, or Opera.'}
              </p>
            </div>
            <button onClick={() => setDismissedWarnings(p => [...p, 'webgpu'])} className="text-amber-400/60 hover:text-amber-200 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Mobile Memory Alert */}
        {isMobile && (selectedOption.backend === 'gemma4' || (selectedOption.webllmId && (selectedOption.webllmId.includes('3B') || selectedOption.webllmId.includes('1.5B')))) && !dismissedWarnings.includes('memory') && (
          <div className="flex items-start gap-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-3.5 shadow-md backdrop-blur-sm">
            <Info className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-zinc-200 text-xs">Mobile Device Memory Warning</h4>
              <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
                You have selected <strong>{selectedOption.name} ({selectedOption.sizeLabel})</strong>. Mobile browsers enforce strict tab memory limits (typically ~1.5GB). Large models may crash the page. We recommend using <strong>Qwen 0.5B</strong> or <strong>Llama 1B</strong>.
              </p>
            </div>
            <button onClick={() => setDismissedWarnings(p => [...p, 'memory'])} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <Conversation className="flex-1 pb-32">
        <ConversationContent className={cn("max-w-2xl mx-auto", messages.length === 0 ? "min-h-full flex flex-col justify-center" : "pt-16")}>
          {messages.length === 0 ? (
            <div className="text-center py-10 max-w-xl mx-auto w-full">
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">WebVoice</h1>
              <p className="text-zinc-400 text-sm mb-8">100% in-browser LLM, VAD, STT, and TTS — nothing leaves your device</p>

              {status === 'idle' && !hasUserSelected ? (
                <div className="text-left space-y-4">
                  <div className="text-zinc-300 text-sm font-semibold mb-2 text-center">
                    Choose a model to initialize the voice agent:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {LLM_OPTIONS.map((opt) => {
                      const isRecommended = opt.id === DEFAULT_LLM_ID
                      const sizeInGB = parseFloat(opt.sizeLabel.replace(/[~ GB]/g, ''))
                      const isHeavyForMobile = isMobile && sizeInGB >= 1.5
                      return (
                        <button
                          key={opt.id}
                          onClick={() => selectAndInitialize(opt.id)}
                          className={cn(
                            'flex flex-col justify-between p-3 rounded-xl border text-left transition-all duration-200 hover:scale-[1.01]',
                            isRecommended
                              ? 'bg-purple-950/20 border-purple-500/50 hover:bg-purple-950/30 shadow-md shadow-purple-500/5 sm:col-span-2'
                              : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                          )}
                        >
                          <div className="w-full">
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-semibold text-white text-sm">{opt.name}</span>
                              <div className="flex items-center gap-1">
                                {isRecommended && (
                                  <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-purple-500/30">
                                    Rec
                                  </span>
                                )}
                                {opt.supportsVision && (
                                  <span className="bg-green-500/10 text-green-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-green-500/20">
                                    Vision
                                  </span>
                                )}
                                {isHeavyForMobile && (
                                  <span className="bg-red-500/20 text-red-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30">
                                    May Crash Mobile
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-normal line-clamp-1 mb-2">
                              {opt.backend === 'gemma4'
                                ? 'Multimodal WebGPU model with vision capabilities.'
                                : 'Browser optimized text-only WebLLM model.'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between w-full pt-1.5 border-t border-zinc-800/50 mt-auto">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{opt.backend}</span>
                            <span className="text-[11px] font-bold text-zinc-300">{opt.sizeLabel}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-zinc-500">
                      {status === 'idle'
                        ? 'Click Initialize to load the voice models'
                        : status === 'loading'
                          ? statusMessage
                          : isCallActive 
                            ? 'Start speaking...'
                            : 'Click the phone to start a call'}
                    </p>
                    {status === 'loading' && activeLoadProgress && (
                      <div className="mt-4 w-64 mx-auto">
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          {activeLoadProgress.progress > 0 ? (
                            <div
                              className={`h-full ${activeLoadProgress.color} transition-all duration-300`}
                              style={{ width: `${activeLoadProgress.progress}%` }}
                            />
                          ) : (
                            <div className={`h-full ${activeLoadProgress.color} w-1/3 animate-pulse`} />
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 mt-1">
                          {activeLoadProgress.label}:{' '}
                          {activeLoadProgress.progress > 0
                            ? `${Math.round(activeLoadProgress.progress)}%`
                            : 'starting...'}
                        </p>
                      </div>
                    )}
                  </>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <Message key={i} from={msg.role === 'user' ? 'user' : 'assistant'}>
                <div className={cn(
                  'flex flex-col gap-1.5 max-w-[80%]',
                  msg.role === 'user' ? 'items-end' : 'items-start'
                )}>
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded visual context"
                      className="max-h-48 rounded-lg object-contain border border-zinc-800 shadow-md"
                    />
                  )}
                  {msg.content && (
                    <MessageContent variant="contained" className="max-w-none">
                      {msg.content}
                    </MessageContent>
                  )}
                </div>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div ref={debugPanelRef} className="fixed top-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-xs font-mono z-50 min-w-[200px]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-zinc-400 font-semibold">Debug Info</span>
            <button onClick={() => setShowDebugPanel(false)} className="text-zinc-500 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1 text-zinc-300">
            <div>WebGPU: <span className={debugInfo.webgpu === "available" ? "text-green-400" : "text-yellow-400"}>{debugInfo.webgpu}</span></div>
            <div>iOS: <span className={isIOS ? "text-yellow-400" : "text-green-400"}>{isIOS ? "yes" : "no"}</span></div>
            <div>LLM ID: <span className="text-blue-400">{selectedLLMId}</span></div>
            <hr className="border-zinc-700 my-2" />
            <div>VAD: {debugInfo.vadLoaded ? <span className="text-green-400">✓</span> : <span className="text-zinc-500">○</span>}</div>
            <div>STT: {debugInfo.sttLoaded ? <span className="text-green-400">✓</span> : <span className="text-zinc-500">○</span>}</div>
            <div>TTS: {debugInfo.ttsLoaded ? <span className="text-green-400">✓</span> : <span className="text-zinc-500">○</span>} {tts.backend && <span className="text-zinc-500">({tts.backend})</span>}</div>
            <div>LLM: {debugInfo.llmLoaded ? <span className="text-green-400">✓</span> : <span className="text-zinc-500">○</span>}</div>
          </div>
        </div>
      )}

      {/* Top action buttons */}
      <div className="fixed top-4 right-4 flex gap-2 z-40">
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([])
              setPendingImage(null)
              tts.stop()
            }}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button
          ref={debugToggleRef}
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
          title="Toggle debug panel"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-zinc-800/95 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-3 shadow-2xl">
            {isCallActive ? (
              /* Voice Mode: Centered waveform and voice controls */
              <div className="flex flex-col gap-3">
                <div className="text-zinc-400 text-xs px-2 text-center font-medium animate-pulse">
                  {status === "listening" ? "Listening..." : status === "recording" ? "Recording..." : status === "thinking" ? "Thinking..." : status === "speaking" ? "Speaking..." : "..."}
                </div>
                <div className="flex items-center justify-between gap-3">
                  {/* Waveform */}
                  <div className="flex-1 min-w-0 h-10 flex items-center">
                    <LiveWaveform
                      active={waveformActive}
                      processing={waveformProcessing}
                      barWidth={3}
                      barGap={2}
                      barRadius={1.5}
                      fadeEdges={true}
                      fadeWidth={24}
                      sensitivity={2.5}
                      smoothingTimeConstant={0.8}
                      height={32}
                      mode="static"
                      className={cn("w-full", waveformActive ? "text-green-400" : waveformProcessing ? "text-blue-400" : "text-zinc-600")}
                    />
                  </div>
                  {/* Voice controls */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      onClick={toggleMicMute}
                      size="icon"
                      variant="ghost"
                      className={`h-10 w-10 rounded-full flex-shrink-0 ${isMicMuted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                        }`}
                      title={isMicMuted ? "Unmute mic" : "Mute mic"}
                    >
                      {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      onClick={() => tts.setMuted(!tts.muted)}
                      size="icon"
                      variant="ghost"
                      className={`h-10 w-10 rounded-full flex-shrink-0 ${tts.muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                        }`}
                      title={tts.muted ? "Unmute speaker" : "Mute speaker"}
                    >
                      {tts.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                    <Button
                      onClick={endCall}
                      size="icon"
                      className="h-10 w-10 rounded-full bg-red-600 text-white hover:bg-red-700 flex-shrink-0 shadow-lg shadow-red-600/20"
                      title="End call"
                    >
                      <PhoneOff className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
                /* Text / Setup Mode: Dynamic two-row layout for a premium, spacious configuration */
                <div className="flex flex-col gap-2.5">
                  {/* Pending image preview */}
                  {pendingImage && (
                    <div className="relative inline-block mb-1 group">
                      <img
                        src={pendingImage}
                        alt="Pending upload"
                        className="h-16 w-16 object-cover rounded-lg border border-zinc-700 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingImage(null)}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {/* Row 1: Chat Input Box + Camera + Call Start */}
                  <div className="flex items-center gap-2">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if ((!textInput.trim() && !pendingImage) || status !== "ready") return
                      const userMessage: ChatMessage = {
                        role: "user",
                        content: textInput.trim(),
                        image: pendingImage || undefined
                      }
                      setMessages(prev => [...prev, userMessage])
                      handleLLMResponse([...messagesRef.current, userMessage])
                      setTextInput("")
                      setPendingImage(null)
                    }}
                      className="flex-1 flex items-center bg-zinc-900/50 border border-zinc-700/30 rounded-xl px-2.5 py-1.5 gap-2"
                  >
                    {selectedOption.supportsVision && (
                      <div className="flex-shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleImageSelect}
                            disabled={status !== "ready"}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => fileInputRef.current?.click()}
                            disabled={status !== "ready"}
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full"
                          title="Upload image (vision)"
                        >
                          <Camera className="h-4.5 w-4.5" />
                        </Button>
                      </div>
                    )}

                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={
                        status === "idle"
                          ? "Initialize to start..."
                          : status === "loading" || status === "error"
                            ? statusMessage
                            : "How can I help?"
                      }
                      disabled={status !== "ready"}
                        className="flex-1 bg-transparent text-zinc-200 text-sm outline-none placeholder:text-zinc-500 disabled:text-zinc-500"
                    />
                    </form>

                    {/* Call Start button */}
                    {status !== "loading" && status !== "idle" && (
                      <Button
                        onClick={startCall}
                        size="icon"
                        disabled={!isSecure}
                        className={cn(
                          "h-9 w-9 rounded-xl flex-shrink-0 shadow-lg",
                          isSecure
                            ? "bg-green-600 text-white hover:bg-green-700 shadow-green-600/20"
                            : "bg-zinc-850 text-zinc-600 cursor-not-allowed opacity-50 shadow-none"
                        )}
                        title={isSecure ? "Start call" : "Microphone access requires HTTPS"}
                      >
                        <Phone className="h-4.5 w-4.5" />
                      </Button>
                    )}
                  </div>

                  {/* Row 2: Selectors & Mute Controls (spacious & easy to tap on mobile) */}
                  <div className="flex items-center justify-between border-t border-zinc-700/20 pt-1.5 mt-0.5">
                    <div className="flex items-center gap-1">
                      {/* LLM Dropdown */}
                      <div className="relative" ref={llmMenuRef}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowLLMMenu(!showLLMMenu)}
                          disabled={status === 'loading'}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 gap-1 px-2 h-8 text-[11px] font-medium"
                        >
                          <span className="uppercase">{selectedOption.name.replace(" 3.2", "").replace(" E2B", "")}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                        {showLLMMenu && (
                          <div className="absolute bottom-full mb-2 left-0 bg-zinc-850 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[180px] z-20">
                            {LLM_OPTIONS.map((opt) => {
                              const sizeInGB = parseFloat(opt.sizeLabel.replace(/[~ GB]/g, ''))
                              const isHeavyForMobile = isMobile && sizeInGB >= 1.5
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    void switchLLM(opt.id)
                                    setShowLLMMenu(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-700 ${selectedLLMId === opt.id ? 'bg-zinc-700 text-white' : 'text-zinc-300'
                                    }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium text-xs text-white">{opt.name}</div>
                                    {isHeavyForMobile && (
                                      <span className="bg-red-500/20 text-red-300 text-[8px] font-bold px-1 rounded border border-red-500/20 flex-shrink-0">
                                        Heavy
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-zinc-500">{opt.sizeLabel}</div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Language Dropdown */}
                      <div className="relative" ref={langMenuRef}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowLangMenu(!showLangMenu)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 gap-1 px-2 h-8 text-[11px] font-medium"
                        >
                          <span className="uppercase">{tts.language}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                        {showLangMenu && (
                          <div className="absolute bottom-full mb-2 left-0 bg-zinc-850 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[120px] z-20">
                            {languages.map((lang) => (
                              <button
                                key={lang.id}
                                onClick={() => {
                                  tts.setLanguage(lang.id)
                                  setShowLangMenu(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-700 ${tts.language === lang.id ? "bg-zinc-700 text-white" : "text-zinc-300"
                                  }`}
                              >
                                {lang.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Voice Dropdown */}
                      <div className="relative" ref={voiceMenuRef}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowVoiceMenu(!showVoiceMenu)}
                          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 gap-1 px-2 h-8 text-[11px] font-medium"
                        >
                          <span>{tts.voice}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                        {showVoiceMenu && (
                          <div className="absolute bottom-full mb-2 left-0 bg-zinc-850 border border-zinc-700 rounded-lg shadow-xl p-2 min-w-[140px] z-20">
                            {voices.map((voice) => (
                              <button
                                key={voice.id}
                                onClick={() => {
                                  void tts.setVoice(voice.id)
                                  setShowVoiceMenu(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-700 ${tts.voice === voice.id ? "bg-zinc-700 text-white" : "text-zinc-300"
                                  }`}
                              >
                                <div className="font-medium">{voice.name}</div>
                                <div className="text-xs text-zinc-500">{voice.desc}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Speaker Mute Control */}
                  <Button
                      onClick={() => tts.setMuted(!tts.muted)}
                    size="icon"
                    variant="ghost"
                      className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
                      title={tts.muted ? "Unmute speaker" : "Mute speaker"}
                  >
                      {tts.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
