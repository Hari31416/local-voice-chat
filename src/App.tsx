import { useState } from "react"
import { AudioLines, Mic, Phone } from "lucide-react"
import { AmbientBackground } from "@/components/ambient-background"
import { ConversationArea } from "@/components/conversation-area"
import { ControlBar } from "@/components/control-bar"
import { PageTransition } from "@/components/page-transition"
import { VoiceAgentTopBar } from "@/components/voice-agent-top-bar"
import { WarningBanners } from "@/components/warning-banners"
import { useVoiceAgent } from "@/hooks/use-voice-agent"
import { TTSStudio } from "@/components/tts-studio"
import { STTStudio } from "@/components/stt-studio"
import { hasLLMCapability } from "@/lib/llm-models"
import { cn } from "@/lib/utils"

type Tab = "voice" | "tts" | "stt"

const NAV_ITEMS: { id: Tab; label: string; shortLabel: string; icon: typeof Phone; accent: string }[] = [
  { id: "voice", label: "Voice Agent", shortLabel: "Agent", icon: Phone, accent: "emerald" },
  { id: "tts", label: "TTS Studio", shortLabel: "TTS", icon: AudioLines, accent: "cyan" },
  { id: "stt", label: "STT Studio", shortLabel: "STT", icon: Mic, accent: "amber" },
]

const ACCENT_STYLES: Record<string, { active: string; dot: string; glow: string }> = {
  emerald: {
    active: "bg-emerald-500/12 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
    glow: "shadow-emerald-500/20",
  },
  cyan: {
    active: "bg-cyan-500/12 text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-400",
    glow: "shadow-cyan-500/20",
  },
  amber: {
    active: "bg-amber-500/12 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
    glow: "shadow-amber-500/20",
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("voice")
  const [dismissedWarnings, setDismissedWarnings] = useState<string[]>([])

  const agent = useVoiceAgent()

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab !== "voice" && (agent.isCallActive || agent.isMicActive)) {
      if (agent.isCallActive) {
        agent.endCall()
      } else {
        void agent.toggleMic()
      }
    }
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab)!

  const ambientAccent = activeTab === "voice" ? "voice" : activeTab === "tts" ? "tts" : "stt"

  return (
    <div className="app-bg h-screen flex overflow-hidden relative">
      <AmbientBackground accent={ambientAccent} />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[72px] lg:w-[220px] flex-shrink-0 border-r border-white/[0.06] bg-[oklch(0.12_0.01_260/80%)] backdrop-blur-xl z-50">
        <div className="px-4 lg:px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-logo-glow">
                <AudioLines className="h-4 w-4 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[oklch(0.12_0.01_260)] animate-pulse" />
            </div>
            <div className="hidden lg:block min-w-0">
              <p className="font-display font-bold text-white text-sm leading-tight truncate">WebVoice</p>
              <p className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">Studio</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const styles = ACCENT_STYLES[item.accent]
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer border",
                  isActive
                    ? cn(styles.active, "shadow-sm", styles.glow, "scale-[1.02]")
                    : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] hover:translate-x-0.5",
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "drop-shadow-sm")} />
                <span className="hidden lg:block truncate">{item.label}</span>
                {isActive && (
                  <div className={cn("hidden lg:block ml-auto h-1.5 w-1.5 rounded-full flex-shrink-0 animate-pulse", styles.dot)} />
                )}
              </button>
            )
          })}
        </nav>

        <div className="hidden lg:block p-4 border-t border-white/[0.06]">
          <p className="text-[10px] text-zinc-600 leading-relaxed">
            100% local · runs in your browser · no API keys
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile header + tab bar */}
        <header className="md:hidden flex-shrink-0 border-b border-white/[0.06] bg-[oklch(0.12_0.01_260/90%)] backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <AudioLines className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-white text-sm">WebVoice Studio</span>
            </div>
            <div className={cn("h-2 w-2 rounded-full", ACCENT_STYLES[activeNav.accent].dot)} />
          </div>
          <div className="flex px-3 pb-3 gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              const styles = ACCENT_STYLES[item.accent]
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer border",
                    isActive
                      ? styles.active
                      : "border-transparent text-zinc-500",
                  )}
                >
                  {item.shortLabel}
                </button>
              )
            })}
          </div>
        </header>

        <WarningBanners
          isSecure={agent.isSecure}
          webgpuStatus={agent.debugInfo.webgpu}
          isMobile={agent.isMobile}
          selectedOption={agent.selectedOption}
          dismissedWarnings={dismissedWarnings}
          onDismiss={(id) => setDismissedWarnings((p) => [...p, id])}
        />

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {activeTab === "voice" && (
            <div className="flex min-h-0 flex-1 flex-col relative accent-voice">
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
                onSampleQuery={agent.submitQuery}
              />

              <VoiceAgentTopBar
                hasMessages={agent.messages.length > 0}
                setupPhase={agent.setupPhase}
                selectedLLMId={agent.selectedLLMId}
                selectedVariantId={agent.selectedLLMId}
                prefs={agent.prefs}
                debugInfo={agent.debugInfo}
                tts={agent.tts}
                onClearConversation={agent.clearConversation}
                onResetPreferences={agent.handleResetPreferences}
                onToggleThinking={agent.setUseThinking}
                onToggleExperimentalTools={agent.setExperimentalToolsEnabled}
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
                waveformAnalyser={agent.waveformAnalyser}
                canAttachImage={hasLLMCapability(agent.selectedOption, "vision")}
                onTextInputChange={agent.setTextInput}
                hindiTypingEnabled={agent.prefs.hindiTypingEnabled}
                onHindiTypingChange={agent.setHindiTypingEnabled}
                onClearPendingImage={() => agent.setPendingImage(null)}
                onImageSelect={agent.handleImageSelect}
                onSubmitText={agent.submitTextMessage}
                onStartCall={() => void agent.startCall()}
                onEndCall={agent.endCall}
                onStopGeneration={agent.stopGeneration}
                isGenerating={agent.isGenerating}
                onToggleMic={() => void agent.toggleMic()}
                onToggleMicMute={agent.toggleMicMute}
                onSwitchLLM={agent.switchLLM}
              />
            </div>
          )}

          {activeTab === "tts" && (
            <PageTransition pageKey="tts" className="accent-tts">
              <TTSStudio tts={agent.tts} />
            </PageTransition>
          )}

          {activeTab === "stt" && (
            <PageTransition pageKey="stt" className="accent-stt">
              <STTStudio
                isSttLoaded={agent.debugInfo.sttLoaded}
                sttLoadProgress={agent.sttLoadProgress}
                sttTranscriptResult={agent.sttTranscriptResult}
                setSttTranscriptResult={agent.setSttTranscriptResult}
                sttTranscribing={agent.sttTranscribing}
                statusMessage={agent.statusMessage}
                loadSTTOnly={agent.loadSTTOnly}
                transcribeAudioBuffer={agent.transcribeAudioBuffer}
                sttModelId={agent.prefs.sttModelId}
              />
            </PageTransition>
          )}
        </main>
      </div>
    </div>
  )
}
