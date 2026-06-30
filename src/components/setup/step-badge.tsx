import { cn } from '@/lib/utils'

export function StepBadge({
  n,
  label,
  active,
  completed,
}: {
  n: number
  label: string
  active?: boolean
  completed?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all duration-300',
          active
            ? 'bg-emerald-500 text-emerald-950 shadow-lg shadow-emerald-500/30 scale-110'
            : completed
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-white/[0.06] text-zinc-500 border border-white/[0.08]',
        )}
      >
        {n}
      </div>
      <span
        className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          active || completed ? 'text-zinc-200' : 'text-zinc-500',
        )}
      >
        {label}
      </span>
    </div>
  )
}
