import { useEffect, useMemo, useRef, useState } from "react"
import { Brain, Camera, Check, ChevronDown, Cpu, Sparkles, Wrench, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  LLM_MODELS,
  getLLMModel,
  getLLMVariant,
  hasLLMCapability,
  resolveModelBackend,
  resolveVariantBackend,
  type LLMModel,
  type LLMVariant,
} from "@/lib/llm-models"
import {
  variantHasNativeThinking,
  variantHasParsedThinking,
  variantSupportsToolsExperimental,
  variantSupportsToolsReliably,
} from "@/lib/llm/engine-features"
import {
  filterLLMModels,
  getModelSubtitle,
  groupLLMModels,
  isHeavyForMobile,
  isRecommendedLLM,
  LLM_BACKEND_META,
  LLM_FILTER_OPTIONS,
  sizeBarPercentForVariant,
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

function EngineFeatureBadges({
  variant,
  compact = false,
}: {
  variant: LLMVariant
  compact?: boolean
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1", compact && "gap-0.5")}>
      {variantHasNativeThinking(variant) && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-sky-500/10 text-sky-300 border-sky-500/25",
          )}
        >
          {!compact && <Brain className="h-2.5 w-2.5" />}
          Native reasoning
        </span>
      )}
      {variantHasParsedThinking(variant) && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-blue-500/10 text-blue-300 border-blue-500/25",
          )}
        >
          {!compact && <Brain className="h-2.5 w-2.5" />}
          Parsed reasoning
        </span>
      )}
      {variantSupportsToolsReliably(variant) && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-amber-500/10 text-amber-300 border-amber-500/25",
          )}
        >
          {!compact && <Wrench className="h-2.5 w-2.5" />}
          Tools
        </span>
      )}
      {variantSupportsToolsExperimental(variant) && !variantSupportsToolsReliably(variant) && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-orange-500/10 text-orange-300 border-orange-500/25",
          )}
        >
          {!compact && <Wrench className="h-2.5 w-2.5" />}
          Experimental tools
        </span>
      )}
    </div>
  )
}

function ModelBadges({
  model,
  isMobile,
  compact = false,
}: {
  model: LLMModel
  isMobile: boolean
  compact?: boolean
}) {
  const heavy = isHeavyForMobile(model, isMobile)
  const recommended = isRecommendedLLM(model)

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
      {hasLLMCapability(model, "vision") && (
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
      {hasLLMCapability(model, "thinking") && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded border font-medium",
            compact ? "px-1 py-0 text-[8px]" : "px-1.5 py-0.5 text-[9px]",
            "bg-blue-500/10 text-blue-300 border-blue-500/25",
          )}
        >
          {!compact && <Brain className="h-2.5 w-2.5" />}
          Thinks
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
  model,
  selectedId,
  isMobile,
  onSelect,
  compact = false,
}: {
  model: LLMModel
  selectedId: string
  isMobile: boolean
  onSelect: (variantId: string) => void
  compact?: boolean
}) {
  const isSelected = model.variants.some((v) => v.id === selectedId)
  const activeVariant = model.variants.find((v) => v.id === selectedId) || model.variants[0]

  const backend = LLM_BACKEND_META[resolveModelBackend(model)]

  const bar = sizeBarPercentForVariant(activeVariant)

  return (
    <div
      onClick={() => {
        if (!isSelected) {
          onSelect(model.variants[0].id)
        }
      }}
      className={cn(
        "group w-full text-left rounded-xl border transition-all duration-150 cursor-pointer p-3",
        isSelected
          ? cn("ring-1 ring-violet-400/40 shadow-lg shadow-violet-950/20 bg-zinc-900/90", backend.accent)
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/80",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold text-white truncate text-sm")}>
              {model.name}
            </span>
            {isSelected && <Check className="h-3.5 w-3.5 text-violet-300 flex-shrink-0" />}
          </div>
          <ModelBadges model={model} isMobile={isMobile} compact={compact} />
        </div>
        <span className={cn("font-bold text-zinc-400 flex-shrink-0 text-xs")}>
          {activeVariant.sizeLabel}
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
          
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-500 leading-snug">
                {getModelSubtitle(activeVariant)}
              </p>
              {isSelected && <EngineFeatureBadges variant={activeVariant} compact={compact} />}
            </div>
            
            {isSelected && model.variants.length > 1 && (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Engine:</span>
                <select
                  value={selectedId}
                  onChange={(e) => onSelect(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700/80 rounded px-1.5 py-0.5 text-[10px] text-white outline-none cursor-pointer hover:border-zinc-600 focus:border-zinc-500 transition-colors"
                >
                  {model.variants.map((v) => (
                    <option key={v.id} value={v.id} className="bg-zinc-950 text-white text-xs">
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!isSelected && model.variants.length > 1 && (
              <p className="text-[9px] text-zinc-500">
                Engines: {model.variants.map((v) => v.label).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
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
  const [filter, setFilter] = useState<LLMFilter>("recommended")
  const selectedVariant = getLLMVariant(selectedId)
  const selectedModel = getLLMModel(selectedVariant.modelId)

  const filtered = useMemo(
    () => filterLLMModels(LLM_MODELS, filter, isMobile),
    [filter, isMobile],
  )
  const groups = useMemo(() => groupLLMModels(filtered), [filtered])

  const backendMeta = LLM_BACKEND_META[resolveVariantBackend(selectedId)]

  return (
    <div className="flex flex-col min-h-0 flex-1 space-y-3">
      <div className={cn("rounded-xl border bg-gradient-to-br from-zinc-900/60 to-zinc-900/40 p-3", backendMeta.accent)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">
              Selected model
            </p>
            <p className="text-sm font-semibold text-white truncate">{selectedModel.name}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{getModelSubtitle(selectedVariant)} · {selectedVariant.label}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-white">{selectedVariant.sizeLabel}</p>
            <p className="text-[10px] text-zinc-500">download</p>
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <ModelBadges model={selectedModel} isMobile={isMobile} />
          <EngineFeatureBadges variant={selectedVariant} />
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

      <div className="space-y-4 flex-1 min-h-[220px] max-h-[calc(100dvh-13rem)] overflow-y-auto pr-1">
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
                  {opts.map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      selectedId={selectedId}
                      isMobile={isMobile}
                      onSelect={onSelect}
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
  const groups = groupLLMModels(LLM_MODELS)

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
              {opts.map((model) => (
                model.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onSelect(v.id)
                      onClose()
                    }}
                    className={cn(
                      "w-full text-left rounded-lg px-2.5 py-2 transition-colors cursor-pointer",
                      selectedId === v.id
                        ? "bg-violet-500/15 border border-violet-500/30"
                        : "hover:bg-zinc-800/80 border border-transparent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedId === v.id && <Check className="h-3.5 w-3.5 text-violet-300 flex-shrink-0" />}
                        <span className="text-xs font-medium text-white truncate">{model.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 flex-shrink-0">{v.sizeLabel}</span>
                    </div>
                    <div className="mt-1 pl-5 space-y-1">
                      <p className="text-[10px] text-zinc-500">{v.label}</p>
                      <ModelBadges model={model} isMobile={isMobile} compact />
                      <EngineFeatureBadges variant={v} compact />
                    </div>
                  </button>
                ))
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
  
  const selectedVariant = getLLMVariant(selectedId)
  const selectedModel = getLLMModel(selectedVariant.modelId)

  const backendMeta = LLM_BACKEND_META[resolveVariantBackend(selectedId)]

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
      <div className={cn("flex flex-col min-h-0 flex-1", className)}>
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
        <span className={cn("rounded px-1 py-0.5 text-[9px] border", backendMeta.chip)}>
          {backendMeta.label}
        </span>
        <span className="truncate">{selectedModel.name}</span>
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
