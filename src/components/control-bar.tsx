import { useEffect, useRef, useState } from "react"
import {
  Camera,
  ChevronDown,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { HindiTypingInput } from "@/components/hindi-typing-input"
import { LLMModelSelector } from "@/components/llm-model-selector"
import { LiveWaveform } from "@/components/ui/live-waveform"
import type { useTTS } from "@/hooks/use-tts"
import { SUPERTRONIC_LANGUAGES } from "@/lib/voice-agent-constants"
import type { SetupPhase, VoiceAgentStatus } from "@/lib/voice-agent-types"
import type { UserPreferences } from "@/lib/user-preferences"
import { cn } from "@/lib/utils"

interface VoiceOption {
  id: string
  name: string
  desc: string
}

interface ControlBarProps {
  setupPhase: SetupPhase
  status: VoiceAgentStatus
  isCallActive: boolean
  isMicActive: boolean
  hasCallMode: boolean
  hasMicInput: boolean
  isMicMuted: boolean
  isSecure: boolean
  isMobile: boolean
  textInput: string
  pendingImage: string | null
  selectedLLMId: string
  prefs: UserPreferences
  tts: ReturnType<typeof useTTS>
  voiceOptions: VoiceOption[]
  waveformActive: boolean
  waveformProcessing: boolean
  supportsVision: boolean
  onTextInputChange: (value: string) => void
  hindiTypingEnabled: boolean
  onHindiTypingChange: (enabled: boolean) => void
  onClearPendingImage: () => void
  onImageSelect: (file: File) => void
  onSubmitText: () => void
  onStartCall: () => void
  onEndCall: () => void
  onToggleMic: () => void
  onToggleMicMute: () => void
  onSwitchLLM: (modelId: string) => void
}

export function ControlBar({
  setupPhase,
  status,
  isCallActive,
  isMicActive,
  hasCallMode,
  hasMicInput,
  isMicMuted,
  isSecure,
  isMobile,
  textInput,
  pendingImage,
  selectedLLMId,
  prefs,
  tts,
  voiceOptions,
  waveformActive,
  waveformProcessing,
  supportsVision,
  onTextInputChange,
  hindiTypingEnabled,
  onHindiTypingChange,
  onClearPendingImage,
  onImageSelect,
  onSubmitText,
  onStartCall,
  onEndCall,
  onToggleMic,
  onToggleMicMute,
  onSwitchLLM,
}: ControlBarProps) {
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const [showLangMenu, setShowLangMenu] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const voiceMenuRef = useRef<HTMLDivElement | null>(null)
  const langMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (showVoiceMenu && voiceMenuRef.current && !voiceMenuRef.current.contains(target)) {
        setShowVoiceMenu(false)
      }
      if (showLangMenu && langMenuRef.current && !langMenuRef.current.contains(target)) {
        setShowLangMenu(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowVoiceMenu(false)
        setShowLangMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [showVoiceMenu, showLangMenu])

  if (setupPhase === "selecting") return null

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-800/95 backdrop-blur-xl rounded-2xl border border-zinc-700/50 p-3 shadow-2xl">
          {isCallActive ? (
            <div className="flex flex-col gap-3">
              <div className="text-zinc-400 text-xs px-2 text-center font-medium animate-pulse">
                {status === "listening"
                  ? "Listening..."
                  : status === "recording"
                    ? "Recording..."
                    : status === "thinking"
                      ? "Thinking..."
                      : status === "synthesizing"
                        ? `Synthesizing speech (${tts.synthesisProgress}%)...`
                        : status === "speaking"
                          ? "Speaking..."
                          : "..."}
              </div>
              <div className="flex items-center justify-between gap-3">
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
                    className={cn(
                      "w-full",
                      waveformActive
                        ? "text-green-400"
                        : waveformProcessing
                          ? "text-blue-400"
                          : "text-zinc-600",
                    )}
                  />
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    onClick={onToggleMicMute}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 rounded-full flex-shrink-0",
                      isMicMuted
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700",
                    )}
                    title={isMicMuted ? "Unmute mic" : "Mute mic"}
                  >
                    {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    onClick={() => tts.setMuted(!tts.muted)}
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-10 w-10 rounded-full flex-shrink-0",
                      tts.muted
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700",
                    )}
                    title={tts.muted ? "Unmute speaker" : "Mute speaker"}
                  >
                    {tts.muted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    onClick={onEndCall}
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
            <div className="flex flex-col gap-2.5">
              {pendingImage && (
                <div className="relative inline-block mb-1 group">
                  <img
                    src={pendingImage}
                    alt="Pending upload"
                    className="h-16 w-16 object-cover rounded-lg border border-zinc-700 shadow-md"
                  />
                  <button
                    type="button"
                    onClick={onClearPendingImage}
                    className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    onSubmitText()
                  }}
                  className="flex-1 flex items-center bg-zinc-900/50 border border-zinc-700/30 rounded-xl px-2.5 py-1.5 gap-2"
                >
                  {supportsVision && (
                    <div className="flex-shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onImageSelect(file)
                          if (fileInputRef.current) fileInputRef.current.value = ""
                        }}
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

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onHindiTypingChange(!hindiTypingEnabled)}
                    disabled={status !== "ready"}
                    className={cn(
                      "h-7 w-7 rounded-full flex-shrink-0 text-[11px] font-bold",
                      hindiTypingEnabled
                        ? "bg-violet-500/20 text-violet-300 hover:bg-violet-500/30"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800",
                    )}
                    title={
                      hindiTypingEnabled
                        ? "Hindi typing on — Roman → Devanagari (click to turn off)"
                        : "Hindi typing off — click to type Roman → Devanagari"
                    }
                  >
                    अ
                  </Button>

                  <HindiTypingInput
                    value={textInput}
                    onChange={onTextInputChange}
                    enabled={hindiTypingEnabled}
                    disabled={status !== "ready"}
                    placeholder={
                      setupPhase !== "ready"
                        ? "Loading models..."
                        : hindiTypingEnabled
                          ? "Type in Roman — e.g. namaste"
                          : "How can I help?"
                    }
                    className="flex-1 bg-transparent text-zinc-200 text-sm outline-none placeholder:text-zinc-500 disabled:text-zinc-500"
                  />

                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    disabled={!textInput.trim() || status !== 'ready'}
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-full flex-shrink-0 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>

                {setupPhase === "ready" && status !== "loading" && hasCallMode && (
                  <Button
                    onClick={onStartCall}
                    size="icon"
                    disabled={!isSecure}
                    className={cn(
                      "h-9 w-9 rounded-xl flex-shrink-0 shadow-lg",
                      isSecure
                        ? "bg-green-600 text-white hover:bg-green-700 shadow-green-600/20"
                        : "bg-zinc-850 text-zinc-600 cursor-not-allowed opacity-50 shadow-none",
                    )}
                    title={isSecure ? "Start call" : "Microphone access requires HTTPS"}
                  >
                    <Phone className="h-4.5 w-4.5" />
                  </Button>
                )}

                {setupPhase === "ready" && status !== "loading" && hasMicInput && (
                  <Button
                    onClick={onToggleMic}
                    size="icon"
                    disabled={!isSecure}
                    className={cn(
                      "h-9 w-9 rounded-xl flex-shrink-0 shadow-lg",
                      !isSecure
                        ? "bg-zinc-850 text-zinc-600 cursor-not-allowed opacity-50 shadow-none"
                        : isMicActive
                          ? "bg-red-600 text-white hover:bg-red-700 shadow-red-600/20"
                          : "bg-violet-600 text-white hover:bg-violet-500 shadow-violet-600/20",
                    )}
                    title={
                      !isSecure
                        ? "Microphone access requires HTTPS"
                        : isMicActive
                          ? "Stop listening"
                          : "Start listening"
                    }
                  >
                    {isMicActive ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-zinc-700/20 pt-1.5 mt-0.5">
                <div className="flex items-center gap-1">
                  <LLMModelSelector
                    selectedId={selectedLLMId}
                    onSelect={onSwitchLLM}
                    isMobile={isMobile}
                    variant="menu"
                    disabled={status === "loading"}
                  />

                  {prefs.ttsEnabled && prefs.ttsEngine === "supertonic" && (
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
                          {SUPERTRONIC_LANGUAGES.map((lang) => (
                            <button
                              key={lang.id}
                              onClick={() => {
                                tts.setLanguage(lang.id)
                                if (lang.id === "hi" || lang.id === "na") {
                                  onHindiTypingChange(true)
                                }
                                setShowLangMenu(false)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-700",
                                tts.language === lang.id
                                  ? "bg-zinc-700 text-white"
                                  : "text-zinc-300",
                              )}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {prefs.ttsEnabled && (
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
                        {voiceOptions.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => {
                              void tts.setVoice(voice.id)
                              setShowVoiceMenu(false)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded text-sm hover:bg-zinc-700",
                              tts.voice === voice.id
                                ? "bg-zinc-700 text-white"
                                : "text-zinc-300",
                            )}
                          >
                            <div className="font-medium">{voice.name}</div>
                            <div className="text-xs text-zinc-500">{voice.desc}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {prefs.ttsEnabled && (
                <Button
                  onClick={() => tts.setMuted(!tts.muted)}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
                  title={tts.muted ? "Unmute speaker" : "Mute speaker"}
                >
                  {tts.muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
