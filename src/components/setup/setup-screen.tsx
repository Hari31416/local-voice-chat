import { SetupBlueprintLayout } from './setup-blueprint-layout'
import { SetupHero, SetupShell } from './setup-hero'
// import { SetupWizard } from './setup-wizard'
import type { SetupScreenProps } from './types'
import { useSetupState } from './use-setup-state'

export function SetupScreen({
  initial,
  isMobile,
  hasSavedConfig,
  onStart,
  onReset,
}: SetupScreenProps) {
  const state = useSetupState(initial)

  const handleStart = () => onStart(state.buildSelection())

  return (
    <SetupShell>
      <SetupHero subtitle="Configure on the left — your session blueprint updates live on the right." />

      <SetupBlueprintLayout
        state={state}
        isMobile={isMobile}
        hasSavedConfig={hasSavedConfig}
        onStart={handleStart}
        onReset={onReset}
      />

      {/* Wizard layout (commented out — blueprint preferred)
      <SetupWizard
        state={state}
        isMobile={isMobile}
        hasSavedConfig={hasSavedConfig}
        onStart={handleStart}
        onReset={onReset}
      />
      */}
    </SetupShell>
  )
}
