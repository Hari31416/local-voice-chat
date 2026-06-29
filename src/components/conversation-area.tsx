import { useState } from "react"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/conversation"
import { Message, MessageContent } from "@/components/ui/message"
import { SetupScreen, type SetupSelection } from "@/components/setup-screen"
import { cn } from "@/lib/utils"
import type { ChatMessage, LoadProgress, SetupPhase, VoiceAgentStatus } from "@/lib/voice-agent-types"
import { AudioWaveformPlayer } from "@/components/audio-waveform-player"
import { MessageText } from "@/components/message-text"
import type { UserPreferences } from "@/lib/user-preferences"
import { Brain, ChevronDown, ChevronUp } from "lucide-react"

interface ThinkingBlockProps {
  thinking: string
  isGenerating: boolean
}

function ThinkingBlock({ thinking, isGenerating }: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="w-full border border-zinc-900 bg-zinc-950/40 rounded-lg overflow-hidden mb-2 text-xs select-none">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-zinc-400 hover:text-zinc-200 transition-colors bg-zinc-900/20 cursor-pointer"
      >
        <div className="flex items-center gap-1.5 font-medium">
          <Brain className={cn("h-3.5 w-3.5 text-purple-400", isGenerating && "animate-pulse")} />
          <span>Thinking Process</span>
          {isGenerating && (
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping ml-1" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 py-2 text-zinc-400/90 whitespace-pre-wrap leading-relaxed border-t border-zinc-900/40 bg-zinc-950/20 font-mono text-[11px] max-h-60 overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  )
}

interface ConversationAreaProps {
  messages: ChatMessage[]
  setupPhase: SetupPhase
  prefs: UserPreferences
  isMobile: boolean
  statusMessage: string
  isCallActive: boolean
  activeLoadProgress: LoadProgress | null
  agentStatus: VoiceAgentStatus
  globalAnalyser: AnalyserNode | null
  onSetupStart: (selection: SetupSelection) => void
  onResetPreferences?: () => void
}

export function ConversationArea({
  messages,
  setupPhase,
  prefs,
  isMobile,
  statusMessage,
  isCallActive,
  activeLoadProgress,
  agentStatus,
  globalAnalyser,
  onSetupStart,
  onResetPreferences,
}: ConversationAreaProps) {
  return (
    <Conversation className="flex-1 pb-32">
      <ConversationContent
        className={cn(
          messages.length === 0 ? 'min-h-full flex flex-col justify-center' : 'pt-16',
          setupPhase === 'selecting' && messages.length === 0 ? 'max-w-3xl' : 'max-w-2xl',
          'mx-auto w-full'
        )}
      >
        {messages.length === 0 ? (
          <div
            className={cn(
              'text-center py-10 mx-auto w-full',
              setupPhase === 'selecting' ? 'max-w-3xl' : 'max-w-xl'
            )}
          >
            {setupPhase === 'selecting' ? (
              <SetupScreen
                initial={{
                  llmId: prefs.llmId,
                  variantId: prefs.variantId,
                  sttEnabled: prefs.sttEnabled,
                  sttModelId: prefs.sttModelId,
                  ttsEnabled: prefs.ttsEnabled,
                  ttsEngine: prefs.ttsEngine,
                  ttsVoice: prefs.ttsVoice,
                  ttsLanguage: prefs.ttsLanguage,
                  hindiTypingEnabled: prefs.hindiTypingEnabled,
                  useThinking: prefs.useThinking,
                }}
                isMobile={isMobile}
                hasSavedConfig={prefs.configured}
                onStart={onSetupStart}
                onReset={onResetPreferences}
              />
            ) : (
              <>
                <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                  WebVoice
                </h1>
                <p className="text-zinc-500">
                  {setupPhase === 'loading'
                    ? statusMessage
                    : isCallActive
                      ? 'Start speaking...'
                      : prefs.sttEnabled && prefs.ttsEnabled
                        ? 'Click the phone to start a call'
                        : prefs.sttEnabled
                          ? 'Click the mic to speak, or type a message'
                          : 'Type a message to begin'}
                </p>
                {setupPhase === "loading" && activeLoadProgress && (
                  <div className="mt-4 w-64 mx-auto">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      {activeLoadProgress.progress > 0 ? (
                        <div
                          className={`h-full ${activeLoadProgress.color} transition-all duration-300`}
                          style={{ width: `${activeLoadProgress.progress}%` }}
                        />
                      ) : (
                        <div
                          className={`h-full ${activeLoadProgress.color} w-1/3 animate-pulse`}
                        />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      {activeLoadProgress.label}:{" "}
                      {activeLoadProgress.progress > 0
                        ? `${Math.round(activeLoadProgress.progress)}%`
                        : "starting..."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
            messages.map((msg, i) => {
              const isLatestAssistant = msg.role === "assistant" && i === messages.length - 1
              const isSpeakingThis =
                prefs.ttsEnabled &&
                isLatestAssistant &&
                (agentStatus === "speaking" || agentStatus === "synthesizing")

              return (
                <Message key={i} from={msg.role === "user" ? "user" : "assistant"}>
                  <div
                    className={cn(
                      "flex flex-col gap-1.5 max-w-[80%]",
                      msg.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="Uploaded visual context"
                        className="max-h-48 rounded-lg object-contain border border-zinc-800 shadow-md"
                      />
                    )}
                    {msg.role === "assistant" && msg.thinking && prefs.useThinking !== false && (
                      <ThinkingBlock
                        thinking={msg.thinking}
                        isGenerating={isLatestAssistant && agentStatus === "thinking"}
                      />
                    )}
                    {msg.content && (
                    <MessageContent
                      variant="contained"
                      className={cn(
                        "max-w-none flex flex-col gap-2",
                        (msg.audioUrl || isSpeakingThis) && "min-w-[280px] xs:min-w-[320px] sm:min-w-[380px]"
                      )}
                    >
                      <MessageText markdown={msg.role === "assistant"} className="leading-relaxed">
                        {msg.content}
                      </MessageText>
                      {(prefs.ttsEnabled && (msg.audioUrl || isSpeakingThis)) && (
                        <AudioWaveformPlayer
                          src={msg.audioUrl ?? ""}
                          variant="chat"
                          isGlobalPlaying={isSpeakingThis}
                          globalAnalyser={globalAnalyser}
                        />
                      )}
                    </MessageContent>
                  )}
                  {msg.role === "assistant" && msg.metrics && (
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500/80 font-mono select-none mt-1.5 px-1.5">
                      {msg.metrics.totalTokens !== undefined && (
                        <span>{msg.metrics.totalTokens} tok</span>
                      )}
                      {msg.metrics.totalTokens !== undefined && msg.metrics.timeToFirstTokenMs !== undefined && (
                        <span className="text-zinc-700/60 font-sans">·</span>
                      )}
                      {msg.metrics.timeToFirstTokenMs !== undefined && (
                        <span>TTFT {Math.round(msg.metrics.timeToFirstTokenMs)} ms</span>
                      )}
                      {msg.metrics.timeToFirstTokenMs !== undefined && msg.metrics.tokensPerSecond !== undefined && (
                        <span className="text-zinc-700/60 font-sans">·</span>
                      )}
                      {msg.metrics.tokensPerSecond !== undefined && (
                        <span>{msg.metrics.tokensPerSecond.toFixed(1)} tok/s</span>
                      )}
                    </div>
                  )}
                </div>
              </Message>
            )
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  )
}
