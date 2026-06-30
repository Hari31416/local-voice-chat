import { AdvancedSettings } from './advanced-settings'
import { InteractionModePicker } from './interaction-mode-picker'
import { LaunchActions } from './launch-actions'
import { PresetPicker } from './preset-picker'
import { SessionBlueprint } from './session-blueprint'
import { StepBadge } from './step-badge'
import { ThinkingWarning } from './thinking-warning'
import { VoiceConfig } from './voice-config'
import { StaggerGroup, StaggerItem } from '@/components/page-transition'
import type { SetupState } from './use-setup-state'

interface SetupBlueprintLayoutProps {
  state: SetupState
  isMobile: boolean
  hasSavedConfig: boolean
  onStart: () => void
  onReset?: () => void
}

export function SetupBlueprintLayout({
  state,
  isMobile,
  hasSavedConfig,
  onStart,
  onReset,
}: SetupBlueprintLayoutProps) {
  return (
    <StaggerGroup className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
      <div className="lg:col-span-7 space-y-4 sm:space-y-5">
        <StaggerItem index={0}>
        <section className="glass-panel glass-panel-animated rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <StepBadge n={1} label="Performance preset" active />
            {state.activePresetId === 'custom' && (
              <span className="text-[10px] bg-amber-500/10 text-amber-300 font-semibold px-2.5 py-1 rounded-full border border-amber-500/25">
                Custom
              </span>
            )}
          </div>
          <PresetPicker
            activePresetId={state.activePresetId}
            onSelect={state.handleSelectPreset}
          />
        </section>
        </StaggerItem>

        <StaggerItem index={1}>
        <AdvancedSettings state={state} isMobile={isMobile} />
        </StaggerItem>

        <StaggerItem index={2}>
        <section className="glass-panel glass-panel-animated rounded-2xl p-4 sm:p-5 space-y-4">
          <StepBadge n={2} label="Interaction mode" active />
          <InteractionModePicker activeMode={state.activeMode} onChange={state.handleModeChange} />

          {(state.sttEnabled || state.ttsEnabled) && (
            <div className="pt-3 border-t border-white/[0.06]">
              <VoiceConfig
                sttEnabled={state.sttEnabled}
                sttModelId={state.sttModelId}
                onSttModelChange={state.setSttModelId}
                ttsEnabled={state.ttsEnabled}
                ttsEngine={state.ttsEngine}
                ttsVoice={state.ttsVoice}
                ttsLanguage={state.ttsLanguage}
                voices={state.voices}
                onEngineChange={state.handleEngineChange}
                onVoiceChange={state.setTtsVoice}
                onLanguageChange={state.handleTtsLanguageChange}
              />
            </div>
          )}
        </section>
        </StaggerItem>
      </div>

      <div className="lg:col-span-5 space-y-3 sm:space-y-4 lg:sticky lg:top-4">
        <StaggerItem index={3}>
        <SessionBlueprint state={state} />
        </StaggerItem>
        <StaggerItem index={4}>
        <ThinkingWarning state={state} activeMode={state.activeMode} />
        </StaggerItem>
        <StaggerItem index={5}>
        <LaunchActions hasSavedConfig={hasSavedConfig} onStart={onStart} onReset={onReset} />
        </StaggerItem>
      </div>
    </StaggerGroup>
  )
}
