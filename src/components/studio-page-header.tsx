import { cn } from '@/lib/utils'

type StudioAccent = 'cyan' | 'amber' | 'emerald'

const ACCENT_EYEBROW: Record<StudioAccent, string> = {
  cyan: 'text-cyan-500/80',
  amber: 'text-amber-500/80',
  emerald: 'text-emerald-500/80',
}

interface StudioPageHeaderProps {
  eyebrow: string
  title: string
  description: string
  accent?: StudioAccent
}

export function StudioPageHeader({
  eyebrow,
  title,
  description,
  accent = 'cyan',
}: StudioPageHeaderProps) {
  const eyebrowClass = ACCENT_EYEBROW[accent]

  return (
    <>
      {/* Mobile: single compact line — tab nav already names the studio */}
      <div className="md:hidden flex items-baseline justify-between gap-3">
        <h1 className="font-display text-xl font-bold text-white tracking-tight">{title}</h1>
        <span className={cn('text-[10px] font-semibold uppercase tracking-wider flex-shrink-0', eyebrowClass)}>
          {eyebrow}
        </span>
      </div>

      {/* Desktop: full hero */}
      <div className="hidden md:block text-center space-y-3">
        <p className={cn('text-[11px] font-semibold uppercase tracking-[0.2em] animate-hero-line', eyebrowClass)}>{eyebrow}</p>
        <h1 className="font-display text-3xl lg:text-4xl font-extrabold text-white tracking-tight animate-hero-title">{title}</h1>
        <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed animate-hero-desc">{description}</p>
      </div>
    </>
  )
}

/** Shared outer padding for studio pages — tighter on mobile */
export const studioPageClass = 'max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-8 animate-fade-up'
