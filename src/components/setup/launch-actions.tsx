import { ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface LaunchActionsProps {
  hasSavedConfig: boolean
  onStart: () => void
  onReset?: () => void
  compact?: boolean
}

export function LaunchActions({ hasSavedConfig, onStart, onReset, compact }: LaunchActionsProps) {
  return (
    <div className="flex gap-2">
      <Button
        id="btn-load-and-start"
        className={
          compact
            ? 'flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-2 h-10 rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 gap-2 animate-cta-glow'
            : 'flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm py-2.5 h-11 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] gap-2 animate-cta-glow'
        }
        onClick={onStart}
      >
        {hasSavedConfig ? 'Load & start session' : 'Download & start session'}
        <ArrowRight className="h-4 w-4" />
      </Button>
      {hasSavedConfig && onReset && (
        <Button
          id="btn-reset-preferences"
          type="button"
          variant="ghost"
          onClick={onReset}
          className="text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] text-xs px-3 h-11 gap-1.5 rounded-xl border border-white/[0.06] cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      )}
    </div>
  )
}
