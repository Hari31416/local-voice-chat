import { useState } from "react"
import { ConversationArea } from "@/components/conversation-area"
import { ControlBar } from "@/components/control-bar"
import { VoiceAgentTopBar } from "@/components/voice-agent-top-bar"
import { WarningBanners } from "@/components/warning-banners"
import { useVoiceAgent } from "@/hooks/use-voice-agent"

export default function App() {
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])

  const agent = useVoiceAgent()

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      <WarningBanners
        isSecure={agent.isSecure}
        webgpuStatus={agent.debugInfo.webgpu}
        isMobile={agent.isMobile}
        selectedOption={agent.selectedOption}
        dismissedWarnings={dismissedWarnings}
        onDismiss={(id) => setDismissedWarnings((p) => [...p, id])}
      />

      <ConversationArea
        messages={agent.messages}
        setupPhase={agent.setupPhase}
        prefs={agent.prefs}
        isMobile={agent.isMobile}
        statusMessage={agent.statusMessage}
        isCallActive={agent.isCallActive}
        activeLoadProgress={agent.activeLoadProgress}
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
        onToggleMicMute={agent.toggleMicMute}
        onSwitchLLM={agent.switchLLM}
      />
    </div>
  )
}
