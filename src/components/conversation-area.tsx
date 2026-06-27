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
import type { UserPreferences } from "@/lib/user-preferences"

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
                  ttsEngine: prefs.ttsEngine,
                  ttsVoice: prefs.ttsVoice,
                  ttsLanguage: prefs.ttsLanguage,
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
                      : 'Click the phone to start a call'}
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
              const isSpeakingThis = isLatestAssistant && (agentStatus === "speaking" || agentStatus === "synthesizing")

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
                    {msg.content && (
                    <MessageContent
                      variant="contained"
                      className={cn(
                        "max-w-none flex flex-col gap-2",
                        msg.audioUrl && "min-w-[280px] xs:min-w-[320px] sm:min-w-[380px]"
                      )}
                    >
                      <div>{msg.content}</div>
                      {msg.audioUrl && (
                        <AudioWaveformPlayer
                          src={msg.audioUrl}
                          variant="chat"
                          isGlobalPlaying={isSpeakingThis}
                          globalAnalyser={globalAnalyser}
                        />
                      )}
                    </MessageContent>
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
