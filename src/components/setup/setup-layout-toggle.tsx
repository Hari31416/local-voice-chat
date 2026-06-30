// Layout toggle — wizard option commented out; app uses blueprint layout only.
// setup-wizard.tsx is kept in the repo for reference.

/*
import { Columns2, ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SETUP_LAYOUT_STORAGE_KEY } from './constants'
import type { SetupLayoutMode } from './types'

interface SetupLayoutToggleProps {
  mode: SetupLayoutMode
  onChange: (mode: SetupLayoutMode) => void
}

export function SetupLayoutToggle({ mode, onChange }: SetupLayoutToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-white/[0.08] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => {
          onChange('wizard')
          localStorage.setItem(SETUP_LAYOUT_STORAGE_KEY, 'wizard')
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
          mode === 'wizard'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
            : 'text-zinc-500 hover:text-zinc-300 border border-transparent',
        )}
        title="Step-by-step wizard"
      >
        <ListOrdered className="h-3.5 w-3.5" />
        Wizard
      </button>
      <button
        type="button"
        onClick={() => {
          onChange('blueprint')
          localStorage.setItem(SETUP_LAYOUT_STORAGE_KEY, 'blueprint')
        }}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
          mode === 'blueprint'
            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
            : 'text-zinc-500 hover:text-zinc-300 border border-transparent',
        )}
        title="Single page with live session blueprint"
      >
        <Columns2 className="h-3.5 w-3.5" />
        Blueprint
      </button>
    </div>
  )
}
*/

import type { SetupLayoutMode } from './types'

export function readSetupLayoutMode(): SetupLayoutMode {
  return 'blueprint'
}
