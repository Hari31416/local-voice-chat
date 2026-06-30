import {
  DEFAULT_LLM_ID,
  getLLMModel as getCatalogLLMModel,
  hasLLMCapability,
  resolveModelBackend,
  type LLMBackend,
  type LLMEngineType,
  type LLMModel,
  type LLMVariant,
} from "@/lib/llm-models"

export type LLMFilter = "all" | "recommended" | "vision" | "thinking" | "light" | "mobile"

export const LLM_BACKEND_META: Record<
  LLMBackend,
  { label: string; description: string; accent: string; chip: string }
> = {
  qwen35: {
    label: "Qwen 3.5",
    description: "Vision · Transformers.js · WebGPU",
    accent: "border-rose-500/40 bg-rose-500/10",
    chip: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  },
  gemma4: {
    label: "Gemma 4",
    description: "Flagship · custom WebGPU kernels",
    accent: "border-sky-500/40 bg-sky-500/10",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  },
  lfm2: {
    label: "Liquid LFM",
    description: "Ultra-fast hybrid · WebGPU kernels",
    accent: "border-cyan-500/40 bg-cyan-500/10",
    chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  },
  webllm: {
    label: "WebLLM",
    description: "Lightweight text-only · MLC",
    accent: "border-amber-500/40 bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
}

export const LLM_FILTER_OPTIONS: { id: LLMFilter; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "vision", label: "Vision" },
  { id: "thinking", label: "Thinking" },
  { id: "light", label: "Under 1 GB" },
  { id: "mobile", label: "Mobile OK" },
  { id: "all", label: "All" },
]

const BACKEND_ORDER: LLMBackend[] = ["qwen35", "gemma4", "lfm2", "webllm"]

export const LLM_ENGINE_META: Record<LLMEngineType, { label: string; description: string }> = {
  "transformers-js": {
    label: "Transformers.js",
    description: "HF Transformers.js on WebGPU",
  },
  "gemma4-kernel": {
    label: "Gemma kernels",
    description: "Precomputed custom WebGPU kernels",
  },
  "lfm2-kernel": {
    label: "LFM kernels",
    description: "Precomputed hybrid WebGPU kernels",
  },
  webllm: {
    label: "WebLLM",
    description: "MLC runtime on WebGPU",
  },
}

export function parseModelSizeMB(sizeLabel: string): number {
  const value = parseFloat(sizeLabel.replace(/[~ MBGB]/g, "").trim())
  if (sizeLabel.includes("GB")) return value * 1024
  return value
}

export function isMobileFriendlyModel(model: LLMModel): boolean {
  return model.variants.some((v) => v.sizeMb < 1536 || v.requirements.includes("mobile-friendly"))
}

export function isHeavyForMobile(model: LLMModel, isMobile: boolean): boolean {
  if (!isMobile) return false
  return !isMobileFriendlyModel(model)
}

export function matchesLLMFilter(model: LLMModel, filter: LLMFilter, _isMobile: boolean): boolean {
  switch (filter) {
    case "recommended":
      return (
        model.id === DEFAULT_LLM_ID ||
        model.variants.some((v) => v.recommendedFor.includes("default") || v.recommendedFor.includes("mobile"))
      )
    case "vision":
      return hasLLMCapability(model, "vision")
    case "thinking":
      return hasLLMCapability(model, "thinking")
    case "light":
      return model.variants.some((v) => v.sizeMb < 1024)
    case "mobile":
      return isMobileFriendlyModel(model)
    default:
      return true
  }
}

export function groupLLMModels(models: LLMModel[]): { backend: LLMBackend; opts: LLMModel[] }[] {
  const map = new Map<LLMBackend, LLMModel[]>()
  for (const model of models) {
    const backend = resolveModelBackend(model)

    if (!map.has(backend)) map.set(backend, [])
    map.get(backend)!.push(model)
  }
  return BACKEND_ORDER.filter((b) => map.has(b)).map((backend) => ({
    backend,
    opts: map.get(backend)!,
  }))
}

export function filterLLMModels(
  models: LLMModel[],
  filter: LLMFilter,
  isMobile: boolean,
): LLMModel[] {
  return models.filter((model) => matchesLLMFilter(model, filter, isMobile))
}

export function getLLMModel(id: string): LLMModel {
  return getCatalogLLMModel(id)
}

export function isRecommendedLLM(model: LLMModel): boolean {
  return model.id === DEFAULT_LLM_ID
}

export function sizeBarPercentForVariant(variant: LLMVariant): number {
  return Math.min(100, Math.round((variant.sizeMb / 4096) * 100))
}

export function getCapabilityLabels(model: LLMModel): string[] {
  const labels = ["Text"]
  if (hasLLMCapability(model, "vision")) labels.push("Vision")
  if (hasLLMCapability(model, "thinking")) labels.push("Thinking")
  return labels
}

export function getModelSubtitle(variant: LLMVariant): string {
  const engine = LLM_ENGINE_META[variant.engine].label
  return engine
}
