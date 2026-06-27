import { useState } from "react"
import { ConversationArea } from "@/components/conversation-area"
import { ControlBar } from "@/components/control-bar"
import { VoiceAgentTopBar } from "@/components/voice-agent-top-bar"
import { WarningBanners } from "@/components/warning-banners"
import { useVoiceAgent } from "@/hooks/use-voice-agent"
import { TTSStudio } from "@/components/tts-studio"
import { STTStudio } from "@/components/stt-studio"
import { cn } from "@/lib/utils"

export default function App() {
  const [activeTab, setActiveTab] = useState<"voice" | "tts" | "stt">("voice")
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])

  const agent = useVoiceAgent()

  const handleTabChange = (tab: "voice" | "tts" | "stt") => {
    setActiveTab(tab)
    if (tab !== "voice" && (agent.isCallActive || agent.isMicActive)) {
      if (agent.isCallActive) {
        agent.endCall()
      } else {
        void agent.toggleMic()
      }
    }
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Premium Top Navigation Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-40 gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-xl font-bold text-white tracking-tight">
            WebVoice Studio
          </span>
        </div>
        <div className="flex items-center bg-zinc-900/60 p-0.5 rounded-full border border-zinc-800/80">
          <button
            onClick={() => handleTabChange('voice')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer',
              activeTab === 'voice'
                ? 'bg-zinc-800 text-white shadow border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Voice Agent
          </button>
          <button
            onClick={() => handleTabChange('tts')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer',
              activeTab === 'tts'
                ? 'bg-zinc-800 text-white shadow border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            TTS Studio
          </button>
          <button
            onClick={() => handleTabChange('stt')}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer',
              activeTab === 'stt'
                ? 'bg-zinc-800 text-white shadow border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            STT Studio
          </button>
        </div>
        <div className="w-32 hidden sm:block"></div> {/* Balanced spacing */}
      </header>

      {/* Warning Banners stack nicely below header */}
      <WarningBanners
        isSecure={agent.isSecure}
        webgpuStatus={agent.debugInfo.webgpu}
        isMobile={agent.isMobile}
        selectedOption={agent.selectedOption}
        dismissedWarnings={dismissedWarnings}
        onDismiss={(id) => setDismissedWarnings((p) => [...p, id])}
      />

      {/* Scrollable Workspace Container */}
      <main className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "voice" && (
          <div className="h-full flex flex-col relative">
            <ConversationArea
              messages={agent.messages}
              setupPhase={agent.setupPhase}
              prefs={agent.prefs}
              isMobile={agent.isMobile}
              statusMessage={agent.statusMessage}
              isCallActive={agent.isCallActive}
              activeLoadProgress={agent.activeLoadProgress}
              agentStatus={agent.status}
              globalAnalyser={agent.tts.analyser}
              onSetupStart={agent.handleSetupStart}
              onResetPreferences={
                agent.prefs.configured ? () => void agent.handleResetPreferences() : undefined
              }
            />

            <VoiceAgentTopBar
              hasMessages={agent.messages.length > 0}
              setupPhase={agent.setupPhase}
              selectedLLMId={agent.selectedLLMId}
              prefs={agent.prefs}
              debugInfo={agent.debugInfo}
              tts={agent.tts}
              onClearConversation={agent.clearConversation}
              onResetPreferences={agent.handleResetPreferences}
            />

            <ControlBar
              setupPhase={agent.setupPhase}
              status={agent.status}
              isCallActive={agent.isCallActive}
              isMicActive={agent.isMicActive}
              hasCallMode={agent.hasCallMode}
              hasMicInput={agent.hasMicInput}
              isMicMuted={agent.isMicMuted}
              isSecure={agent.isSecure}
              isMobile={agent.isMobile}
              textInput={agent.textInput}
              pendingImage={agent.pendingImage}
              selectedLLMId={agent.selectedLLMId}
              prefs={agent.prefs}
              tts={agent.tts}
              voiceOptions={agent.voiceOptions}
              waveformActive={agent.waveformActive}
              waveformProcessing={agent.waveformProcessing}
              selectedOptionName={agent.selectedOption.name}
              supportsVision={agent.selectedOption.supportsVision}
              onTextInputChange={agent.setTextInput}
              onClearPendingImage={() => agent.setPendingImage(null)}
              onImageSelect={agent.handleImageSelect}
              onSubmitText={agent.submitTextMessage}
              onStartCall={() => void agent.startCall()}
              onEndCall={agent.endCall}
              onToggleMic={() => void agent.toggleMic()}
              onToggleMicMute={agent.toggleMicMute}
              onSwitchLLM={agent.switchLLM}
            />
          </div>
        )}

        {activeTab === "tts" && <TTSStudio tts={agent.tts} />}

        {activeTab === "stt" && (
          <STTStudio
            isSttLoaded={agent.debugInfo.sttLoaded}
            sttLoadProgress={agent.sttLoadProgress}
            sttTranscriptResult={agent.sttTranscriptResult}
            setSttTranscriptResult={agent.setSttTranscriptResult}
            sttTranscribing={agent.sttTranscribing}
            statusMessage={agent.statusMessage}
            loadSTTOnly={agent.loadSTTOnly}
            transcribeAudioBuffer={agent.transcribeAudioBuffer}
          />
        )}
      </main>
    </div>
  )
}
