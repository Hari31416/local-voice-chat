import { cn } from '@/lib/utils'

type ModuleAccent = 'voice' | 'tts' | 'stt'

const ACCENT_ORBS: Record<ModuleAccent, { primary: string; secondary: string; tertiary: string }> = {
  voice: {
    primary: 'oklch(0.72 0.17 162 / 28%)',
    secondary: 'oklch(0.72 0.17 162 / 18%)',
    tertiary: 'oklch(0.72 0.17 162 / 12%)',
  },
  tts: {
    primary: 'oklch(0.75 0.14 195 / 28%)',
    secondary: 'oklch(0.75 0.14 195 / 18%)',
    tertiary: 'oklch(0.75 0.14 195 / 12%)',
  },
  stt: {
    primary: 'oklch(0.78 0.15 75 / 28%)',
    secondary: 'oklch(0.78 0.15 75 / 18%)',
    tertiary: 'oklch(0.78 0.15 75 / 12%)',
  },
}

const ORBS_CONFIG = [
  {
    className: 'ambient-orb-1',
    style: {
      width: '22vw',
      height: '22vw',
      maxWidth: '260px',
      maxHeight: '260px',
      top: '-5%',
      left: '-5%',
      animation: 'orb-drift-1 16s ease-in-out infinite',
    },
    colorKey: 'primary' as const,
  },
  {
    className: 'ambient-orb-2',
    style: {
      width: '18vw',
      height: '18vw',
      maxWidth: '220px',
      maxHeight: '220px',
      bottom: '5%',
      right: '5%',
      animation: 'orb-drift-2 20s ease-in-out infinite',
    },
    colorKey: 'secondary' as const,
  },
  {
    className: 'ambient-orb-3',
    style: {
      width: '15vw',
      height: '15vw',
      maxWidth: '180px',
      maxHeight: '180px',
      top: '45%',
      left: '45%',
      animation: 'orb-drift-3 14s ease-in-out infinite',
    },
    colorKey: 'tertiary' as const,
  },
  {
    className: 'ambient-orb-4',
    style: {
      width: '16vw',
      height: '16vw',
      maxWidth: '200px',
      maxHeight: '200px',
      top: '25%',
      left: '-5%',
      animation: 'orb-drift-1 18s ease-in-out infinite',
      animationDelay: '-4s',
    },
    colorKey: 'secondary' as const,
  },
  {
    className: 'ambient-orb-5',
    style: {
      width: '20vw',
      height: '20vw',
      maxWidth: '240px',
      maxHeight: '240px',
      top: '-2%',
      right: '15%',
      animation: 'orb-drift-2 15s ease-in-out infinite',
      animationDelay: '-8s',
    },
    colorKey: 'primary' as const,
  },
  {
    className: 'ambient-orb-6',
    style: {
      width: '14vw',
      height: '14vw',
      maxWidth: '160px',
      maxHeight: '160px',
      bottom: '10%',
      left: '15%',
      animation: 'orb-drift-3 22s ease-in-out infinite',
      animationDelay: '-11s',
    },
    colorKey: 'tertiary' as const,
  },
  {
    className: 'ambient-orb-7',
    style: {
      width: '12vw',
      height: '12vw',
      maxWidth: '140px',
      maxHeight: '140px',
      top: '-5%',
      left: '35%',
      animation: 'orb-drift-1 19s ease-in-out infinite',
      animationDelay: '-3s',
    },
    colorKey: 'primary' as const,
  },
  {
    className: 'ambient-orb-8',
    style: {
      width: '17vw',
      height: '17vw',
      maxWidth: '210px',
      maxHeight: '210px',
      bottom: '-8%',
      left: '50%',
      animation: 'orb-drift-2 23s ease-in-out infinite',
      animationDelay: '-6s',
    },
    colorKey: 'secondary' as const,
  },
  {
    className: 'ambient-orb-9',
    style: {
      width: '13vw',
      height: '13vw',
      maxWidth: '150px',
      maxHeight: '150px',
      top: '30%',
      right: '-8%',
      animation: 'orb-drift-3 17s ease-in-out infinite',
      animationDelay: '-9s',
    },
    colorKey: 'tertiary' as const,
  },
  {
    className: 'ambient-orb-10',
    style: {
      width: '15vw',
      height: '15vw',
      maxWidth: '180px',
      maxHeight: '180px',
      top: '15%',
      left: '18%',
      animation: 'orb-drift-2 21s ease-in-out infinite',
      animationDelay: '-12s',
    },
    colorKey: 'primary' as const,
  },
  {
    className: 'ambient-orb-11',
    style: {
      width: '14vw',
      height: '14vw',
      maxWidth: '160px',
      maxHeight: '160px',
      bottom: '25%',
      right: '20%',
      animation: 'orb-drift-1 25s ease-in-out infinite',
      animationDelay: '-15s',
    },
    colorKey: 'secondary' as const,
  },
  {
    className: 'ambient-orb-12',
    style: {
      width: '11vw',
      height: '11vw',
      maxWidth: '130px',
      maxHeight: '130px',
      bottom: '-5%',
      left: '-2%',
      animation: 'orb-drift-3 15s ease-in-out infinite',
      animationDelay: '-2s',
    },
    colorKey: 'tertiary' as const,
  },
]

interface AmbientBackgroundProps {
  accent?: ModuleAccent
}

export function AmbientBackground({ accent = 'voice' }: AmbientBackgroundProps) {
  const colors = ACCENT_ORBS[accent]

  return (
    <div className="ambient-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Slow-drifting accent orbs */}
      {ORBS_CONFIG.map((orb, index) => (
        <div
          key={index}
          className={cn('ambient-orb', orb.className, 'transition-[background] duration-1000 ease-in-out')}
          style={{
            ...orb.style,
            background: `radial-gradient(circle, ${colors[orb.colorKey]} 0%, transparent 70%)`,
          }}
        />
      ))}

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
