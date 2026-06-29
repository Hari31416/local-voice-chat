import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Check, ChevronDown, Cpu, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LLMOption } from "@/lib/llm-models"
import { LLM_OPTIONS } from "@/lib/llm-models"
import {
  filterLLMOptions,
  getLLMOption,
  groupLLMOptions,
  isHeavyForMobile,
  isRecommendedLLM,
  LLM_BACKEND_META,
  LLM_FILTER_OPTIONS,
  sizeBarPercent,
  type LLMFilter,
} from "@/lib/llm-model-ui"
import { cn } from "@/lib/utils"

interface LLMModelSelectorProps {
  selectedId: string
  onSelect: (id: string) => void
  isMobile?: boolean
  variant?: "setup" | "menu"
  disabled?: boolean
  className?: string
}

function ModelBadges({
  opt,
  isMobile,
  compact = false,
}: {
  opt: LLMOption
  isMobile: boolean
  compact?: boolean
}) {
  const heavy = isHeavyForMobile(opt, isMobile)
  const recommended = isRecommendedLLM(opt)

  return (
    <div className={cn("flex flex-wrap items-center gap-1", compact && "gap-0.5")}>
      {recommended && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-semibold",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-violet-500/15 text-violet-300 border-violet-500/30",
          )}
        >
          {!compact && <Sparkles className="h-2.5 w-2.5" />}
          Default
        </span>
      )}
      {opt.supportsVision && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
          )}
        >
          {!compact && <Camera className="h-2.5 w-2.5" />}
          Vision
        </span>
      )}
      {heavy && (
        <span
          className={cn(
            "rounded border font-bold",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-red-500/10 text-red-300 border-red-500/25",
          )}
        >
          Heavy
        </span>
      )}
    </div>
  )
}

function ModelCard({
  opt,
  selected,
  isMobile,
  onSelect,
  compact = false,
}: {
  opt: LLMOption
  selected: boolean
  isMobile: boolean
  onSelect: () => void
  compact?: boolean
}) {
  const meta = LLM_BACKEND_META[opt.backend]
  const bar = sizeBarPercent(opt.sizeLabel)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full text-left rounded-xl border transition-all duration-150 cursor-pointer",
        compact ? "p-2" : "p-3",
        selected
          ? cn("ring-1 ring-violet-400/40 shadow-lg shadow-violet-950/20", meta.accent)
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold text-white truncate", compact ? "text-[11px]" : "text-sm")}>
              {opt.name}
            </span>
            {selected && <Check className="h-3.5 w-3.5 text-violet-300 flex-shrink-0" />}
          </div>
          <ModelBadges opt={opt} isMobile={isMobile} compact={compact} />
        </div>
        <span className={cn("font-bold text-zinc-400 flex-shrink-0", compact ? "text-[10px]" : "text-xs")}>
          {opt.sizeLabel}
        </span>
      </div>

      {!compact && (
        <div className="mt-2.5 space-y-1.5">
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                bar >= 75 ? "bg-red-400/70" : bar >= 40 ? "bg-amber-400/70" : "bg-emerald-400/70",
              )}
              style={{ width: `${Math.max(bar, 8)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 leading-snug">{meta.description}</p>
        </div>
      )}
    </button>
  )
}

function SetupSelector({
  selectedId,
  onSelect,
  isMobile,
}: {
  selectedId: string
  onSelect: (id: string) => void
  isMobile: boolean
}) {
  const [filter, setFilter] = useState<LLMFilter>("all")
  const selected = getLLMOption(selectedId)

  const filtered = useMemo(
    () => filterLLMOptions(LLM_OPTIONS, filter, isMobile),
    [filter, isMobile],
  )
  const groups = useMemo(() => groupLLMOptions(filtered), [filtered])

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-zinc-900/60 to-zinc-900/40 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-violet-300/80 mb-1">
              Selected model
            </p>
            <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{LLM_BACKEND_META[selected.backend].description}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-white">{selected.sizeLabel}</p>
            <p className="text-[10px] text-zinc-500">download</p>
          </div>
        </div>
        <div className="mt-2">
          <ModelBadges opt={selected} isMobile={isMobile} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LLM_FILTER_OPTIONS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer",
                active
                  ? "bg-zinc-100 text-zinc-900 border-zinc-200"
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200",
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
        {groups.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">No models match this filter.</p>
        ) : (
          groups.map(({ backend, opts }) => {
            const meta = LLM_BACKEND_META[backend]
            const Icon = backend === "lfm2" ? Zap : backend === "gemma4" ? Sparkles : Cpu
            return (
              <section key={backend} className="space-y-2">
                <div className="flex items-center gap-2 px-0.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      meta.chip,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                  <span className="text-[10px] text-zinc-500">{opts.length} models</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {opts.map((opt) => (
                    <ModelCard
                      key={opt.id}
                      opt={opt}
                      selected={selectedId === opt.id}
                      isMobile={isMobile}
                      onSelect={() => onSelect(opt.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

function MenuSelector({
  selectedId,
  onSelect,
  isMobile,
  onClose,
}: {
  selectedId: string
  onSelect: (id: string) => void
  isMobile: boolean
  onClose: () => void
}) {
  const groups = groupLLMOptions(LLM_OPTIONS)

  return (
    <div className="absolute bottom-full mb-2 left-0 w-[min(100vw-2rem,320px)] bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-xl shadow-2xl z-20 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800/80">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Switch model</p>
        <p className="text-[11px] text-zinc-500">Reloads the selected LLM</p>
      </div>
      <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2 space-y-3">
        {groups.map(({ backend, opts }) => {
          const meta = LLM_BACKEND_META[backend]
          return (
            <div key={backend} className="space-y-1">
              <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {meta.label}
              </p>
              {opts.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelect(opt.id)
                    onClose()
                  }}
                  className={cn(
                    "w-full text-left rounded-lg px-2.5 py-2 transition-colors cursor-pointer",
                    selectedId === opt.id
                      ? "bg-violet-500/15 border border-violet-500/30"
                      : "hover:bg-zinc-800/80 border border-transparent",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedId === opt.id && <Check className="h-3.5 w-3.5 text-violet-300 flex-shrink-0" />}
                      <span className="text-xs font-medium text-white truncate">{opt.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 flex-shrink-0">{opt.sizeLabel}</span>
                  </div>
                  <div className="mt-1 pl-5">
                    <ModelBadges opt={opt} isMobile={isMobile} compact />
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LLMModelSelector({
  selectedId,
  onSelect,
  isMobile = false,
  variant = "setup",
  disabled = false,
  className,
}: LLMModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = getLLMOption(selectedId)

  useEffect(() => {
    if (variant !== "menu" || !open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, variant])

  if (variant === "setup") {
    return (
      <div className={className}>
        <SetupSelector selectedId={selectedId} onSelect={onSelect} isMobile={isMobile} />
      </div>
    )
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 px-2.5 h-8 text-[11px] font-medium max-w-[160px]"
      >
        <span className={cn("rounded px-1 py-0.5 text-[9px] border", LLM_BACKEND_META[selected.backend].chip)}>
          {LLM_BACKEND_META[selected.backend].label}
        </span>
        <span className="truncate">{selected.name}</span>
        <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <MenuSelector
          selectedId={selectedId}
          onSelect={onSelect}
          isMobile={isMobile}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
