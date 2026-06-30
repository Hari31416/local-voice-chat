import { cn } from '@/lib/utils'

type ModuleAccent = 'voice' | 'tts' | 'stt'

const ACCENT_ORBS: Record<ModuleAccent, { primary: string; secondary: string; tertiary: string }> = {
  voice: {
    primary: 'oklch(0.72 0.17 162 / 28%)',
    secondary: 'oklch(0.75 0.14 195 / 18%)',
    tertiary: 'oklch(0.72 0.17 162 / 12%)',
  },
  tts: {
    primary: 'oklch(0.75 0.14 195 / 28%)',
    secondary: 'oklch(0.72 0.17 162 / 18%)',
    tertiary: 'oklch(0.75 0.14 195 / 12%)',
  },
  stt: {
    primary: 'oklch(0.78 0.15 75 / 28%)',
    secondary: 'oklch(0.72 0.17 162 / 18%)',
    tertiary: 'oklch(0.78 0.15 75 / 12%)',
  },
}

interface AmbientBackgroundProps {
  accent?: ModuleAccent
}

export function AmbientBackground({ accent = 'voice' }: AmbientBackgroundProps) {
  const colors = ACCENT_ORBS[accent]

  return (
    <div className="ambient-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Slow-drifting accent orbs */}
      <div
        className="ambient-orb ambient-orb-1 transition-[background] duration-1000 ease-in-out"
        style={{ background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)` }}
      />
      <div
        className="ambient-orb ambient-orb-2 transition-[background] duration-1000 ease-in-out"
        style={{ background: `radial-gradient(circle, ${colors.secondary} 0%, transparent 70%)` }}
      />
      <div
        className="ambient-orb ambient-orb-3 transition-[background] duration-1000 ease-in-out"
        style={{ background: `radial-gradient(circle, ${colors.tertiary} 0%, transparent 70%)` }}
      />

      {/* Subtle grid mesh */}
      <div className="ambient-grid" />

      {/* Floating particles */}
      <div className="ambient-particles">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={cn('ambient-particle', `ambient-particle-${i + 1}`)}
          />
        ))}
      </div>
    </div>
  )
}
