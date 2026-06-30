/** Wizard layout — not used in production; blueprint is the active setup UI. See setup-screen.tsx */
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdvancedSettings } from './advanced-settings'
import { InteractionModePicker } from './interaction-mode-picker'
import { LaunchActions } from './launch-actions'
import { PresetPicker } from './preset-picker'
import { SessionBlueprint } from './session-blueprint'
import { StepBadge } from './step-badge'
import { ThinkingWarning } from './thinking-warning'
import { VoiceConfig } from './voice-config'
import type { SetupState } from './use-setup-state'

const WIZARD_STEPS = [
  { n: 1, label: 'Interaction' },
  { n: 2, label: 'Performance' },
  { n: 3, label: 'Review' },
] as const

interface SetupWizardProps {
  state: SetupState
  isMobile: boolean
  hasSavedConfig: boolean
  onStart: () => void
  onReset?: () => void
}

export function SetupWizard({ state, isMobile, hasSavedConfig, onStart, onReset }: SetupWizardProps) {
  const [step, setStep] = useState(1)

  const goNext = () => setStep((s) => Math.min(3, s + 1))
  const goBack = () => setStep((s) => Math.max(1, s - 1))

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setStep(s.n)}
              className="cursor-pointer"
            >
              <StepBadge
                n={s.n}
                label={s.label}
                active={step === s.n}
                completed={step > s.n}
              />
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={`hidden sm:block w-8 h-px ${step > s.n ? 'bg-emerald-500/40' : 'bg-white/[0.08]'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-up max-w-3xl mx-auto">
          <div>
            <h2 className="font-display font-bold text-white text-lg mb-1">How do you want to interact?</h2>
            <p className="text-sm text-zinc-500">Pick the experience that fits your environment.</p>
          </div>
          <InteractionModePicker activeMode={state.activeMode} onChange={state.handleModeChange} variant="grid" />
        </section>
      )}

      {step === 2 && (
        <div className="space-y-5 max-w-3xl mx-auto animate-fade-up">
          <section className="glass-panel rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display font-bold text-white text-lg mb-1">Choose performance tier</h2>
                <p className="text-sm text-zinc-500">Balance speed, capabilities, and download size.</p>
              </div>
              {state.activePresetId === 'custom' && (
                <span className="text-[10px] bg-amber-500/10 text-amber-300 font-semibold px-2.5 py-1 rounded-full border border-amber-500/25 flex-shrink-0">
                  Custom
                </span>
              )}
            </div>
            <PresetPicker
              activePresetId={state.activePresetId}
              onSelect={state.handleSelectPreset}
              layout="stack"
            />
          </section>

          {(state.sttEnabled || state.ttsEnabled) && (
            <section className="glass-panel rounded-2xl p-5 sm:p-6">
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
            </section>
          )}

          <AdvancedSettings state={state} isMobile={isMobile} />
        </div>
      )}

      {step === 3 && (
        <div className="max-w-lg mx-auto space-y-4 animate-fade-up">
          <section className="text-center mb-2">
            <h2 className="font-display font-bold text-white text-lg mb-1">Review & launch</h2>
            <p className="text-sm text-zinc-500">Confirm your configuration before downloading models.</p>
          </section>

          <SessionBlueprint state={state} />
          <ThinkingWarning state={state} activeMode={state.activeMode} />
          <LaunchActions hasSavedConfig={hasSavedConfig} onStart={onStart} onReset={onReset} />
        </div>
      )}

      {/* Step navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between max-w-3xl mx-auto pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 1}
            className="text-zinc-400 hover:text-white gap-1.5 disabled:opacity-30 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={goNext}
            className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] gap-1.5 cursor-pointer"
          >
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="flex justify-center max-w-lg mx-auto">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="text-zinc-400 hover:text-white gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to performance
          </Button>
        </div>
      )}
    </div>
  )
}
